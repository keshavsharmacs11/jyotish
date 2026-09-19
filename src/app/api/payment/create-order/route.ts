import {
  NextRequest,
  NextResponse,
} from "next/server";

import Razorpay from "razorpay";

import {
  connectMongoose,
} from "@/lib/mongodb";

import Booking from "@/models/Booking";
import Payment from "@/models/Payment";

import {
  getCustomerId,
} from "@/lib/customerAuth";

import {
  checkRateLimit,
} from "@/lib/rateLimit";

import {
  getClientIp,
} from "@/lib/requestSecurity";

const razorpay =
  new Razorpay({
    key_id:
      process.env.RAZORPAY_KEY_ID || "",
    key_secret:
      process.env.RAZORPAY_KEY_SECRET || "",
  });

/*
 * ============================================
 * ENVIRONMENT VALIDATION
 * ============================================
 */

function getRazorpayKeyId(): string {
  const keyId =
    process.env.RAZORPAY_KEY_ID;

  if (!keyId) {
    throw new Error(
      "RAZORPAY_KEY_ID is not configured."
    );
  }

  return keyId;
}

function getRazorpayKeySecret(): string {
  const keySecret =
    process.env.RAZORPAY_KEY_SECRET;

  if (!keySecret) {
    throw new Error(
      "RAZORPAY_KEY_SECRET is not configured."
    );
  }

  return keySecret;
}

/*
 * ============================================
 * NORMALIZE EMAIL
 * ============================================
 */

function normalizeEmail(
  value: unknown
): string {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
}

/*
 * ============================================
 * NORMALIZE PHONE
 * ============================================
 */

function normalizePhone(
  value: unknown
): string {
  return String(
    value || ""
  )
    .replace(
      /\s+/g,
      ""
    )
    .trim();
}

/*
 * ============================================
 * POST
 * ============================================
 */

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * ========================================
     * RATE LIMIT
     * ========================================
     */

    const clientIp =
      getClientIp(request);

    const rateLimit =
      await checkRateLimit({
        key:
          `payment-create-order-ip:${clientIp}`,
        limit: 15,
        windowMs:
          15 * 60 * 1000,
      });

    if (
      !rateLimit.allowed
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Too many payment requests. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After":
              String(
                rateLimit.retryAfterSeconds
              ),
          },
        }
      );
    }

    /*
     * ========================================
     * READ REQUEST
     * ========================================
     */

    const contentLength = request.headers.get("content-length");

    if (
      contentLength &&
      Number(contentLength) > 32 * 1024
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment request is too large.",
        },
        {
          status: 413,
        }
      );
    }

    let body: Record<string, unknown>;

    try {
      const rawBody = await request.text();

      if (
        Buffer.byteLength(rawBody, "utf8") >
        32 * 1024
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Payment request is too large.",
          },
          {
            status: 413,
          }
        );
      }

      const parsed = JSON.parse(rawBody);

      if (
        !parsed ||
        typeof parsed !== "object" ||
        Array.isArray(parsed)
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid payment request.",
          },
          {
            status: 400,
          }
        );
      }

      body = parsed as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid payment request.",
        },
        {
          status: 400,
        }
      );
    }

    const bookingId =
      String(
        body.bookingId || ""
      ).trim();

    const serviceId =
      String(
        body.serviceId || ""
      ).trim();

    /*
     * These are only used to bind a guest
     * payment attempt to the booking data.
     *
     * For authenticated customers,
     * ownership comes from the session.
     */

    const requestEmail =
      normalizeEmail(
        body.customerEmail
      );

    const requestPhone =
      normalizePhone(
        body.customerPhone
      );

    /*
     * ========================================
     * BASIC VALIDATION
     * ========================================
     */

    if (
      !bookingId ||
      !serviceId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Booking ID and service ID are required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      bookingId.length > 100 ||
      serviceId.length > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid payment request.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ========================================
     * ENVIRONMENT
     * ========================================
     */

    getRazorpayKeyId();
    getRazorpayKeySecret();

    /*
     * ========================================
     * DATABASE
     * ========================================
     */

    await connectMongoose();

    /*
     * ========================================
     * GET AUTHENTICATED CUSTOMER
     * ========================================
     *
     * Authenticated customer ownership is
     * determined entirely from the session.
     */

    const authenticatedUserId =
      await getCustomerId();

    /*
     * ========================================
     * FIND BOOKING
     * ========================================
     */

    const booking =
      await Booking.findOne({
        bookingId,
      });

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Booking not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * ========================================
     * BOOKING OWNERSHIP
     * ========================================
     *
     * Logged-in customer:
     *
     *     booking.userId MUST equal session user.
     *
     * Guest booking:
     *
     *     booking.userId is null.
     *
     *     Because there is no account session,
     *     bind the request to the booking's
     *     customer email + phone.
     *
     * The browser never gets to choose an
     * authenticated customer's userId.
     */

    if (booking.userId) {
      if (!authenticatedUserId) {
        return NextResponse.json(
          {
            success: false,
            error:
              "You must be logged in to pay for this booking.",
          },
          {
            status: 401,
          }
        );
      }

      if (
        booking.userId.toString() !==
        authenticatedUserId
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "You are not authorized to pay for this booking.",
          },
          {
            status: 403,
          }
        );
      }
    } else {
      /*
       * Guest booking.
       *
       * Require the payment request to match
       * the customer details stored on the booking.
       */

      const bookingEmail =
        normalizeEmail(
          booking.customer?.email
        );

      const bookingPhone =
        normalizePhone(
          booking.customer?.mobile
        );

      if (
        !requestEmail ||
        !requestPhone
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Customer email and mobile are required for guest payment.",
          },
          {
            status: 400,
          }
        );
      }

      if (
        bookingEmail !==
          requestEmail ||
        bookingPhone !==
          requestPhone
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Customer information does not match the booking.",
          },
          {
            status: 403,
          }
        );
      }
    }

    /*
     * ========================================
     * SERVICE CONSISTENCY
     * ========================================
     */

    if (
      booking.serviceId !==
      serviceId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Service does not match the booking.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ========================================
     * PREVENT PAYMENT FOR FINALIZED BOOKING
     * ========================================
     */

    if (
      booking.paymentStatus ===
        "paid" ||
      booking.status ===
        "confirmed" ||
      booking.status ===
        "completed" ||
      booking.status ===
        "cancelled"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This booking is not available for payment.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ========================================
     * AUTHORITATIVE PAYMENT DATA
     * ========================================
     *
     * NEVER trust amount/currency from the
     * browser.
     */

    const amount =
      Number(
        booking.price
      );

    const currency =
      String(
        booking.currency ||
          "INR"
      )
        .trim()
        .toUpperCase();

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid booking amount.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !currency ||
      currency.length !== 3
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid booking currency.",
        },
        {
          status: 400,
        }
      );
    }

    const amountInPaise =
      Math.round(
        amount * 100
      );

    if (
      !Number.isSafeInteger(
        amountInPaise
      ) ||
      amountInPaise <= 0
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid payment amount.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ========================================
     * REUSE EXISTING BOOKING ORDER
     * ========================================
     */

    if (
      booking.razorpayOrderId
    ) {
      const existingPayment =
        await Payment.findOne({
          razorpayOrderId:
            booking.razorpayOrderId,
        });

      if (
        !existingPayment
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Existing payment information is inconsistent.",
          },
          {
            status: 409,
          }
        );
      }

      if (
        existingPayment.bookingId.toString() !==
        booking._id.toString()
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Existing payment information is inconsistent.",
          },
          {
            status: 409,
          }
        );
      }

      if (
        existingPayment.amount !==
          amount ||
        existingPayment.currency
          .toUpperCase() !==
          currency
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Existing payment information does not match the booking.",
          },
          {
            status: 409,
          }
        );
      }

      return NextResponse.json({
        success: true,

        orderId:
          booking.razorpayOrderId,

        amount:
          amountInPaise,

        currency,

        keyId:
          getRazorpayKeyId(),

        paymentStatus:
          existingPayment.status,

        bookingId:
          booking.bookingId,
      });
    }

    /*
     * ========================================
     * RECOVER EXISTING PAYMENT RECORD
     * ========================================
     *
     * This handles a partial local state where:
     *
     * Payment exists
     *      +
     * Payment contains a Razorpay order ID
     *      +
     * Booking.razorpayOrderId is empty
     *
     * Instead of creating another Razorpay
     * order, reconnect the booking to the
     * existing payment order.
     */

    const existingBookingPayment =
      await Payment.findOne({
        bookingId:
          booking._id,
      }).sort({
        createdAt: -1,
      });

    if (
      existingBookingPayment
        ?.razorpayOrderId
    ) {
      if (
        existingBookingPayment.amount !==
          amount ||
        existingBookingPayment.currency
          .toUpperCase() !==
          currency
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Existing payment information does not match the booking.",
          },
          {
            status: 409,
          }
        );
      }

      booking.razorpayOrderId =
        existingBookingPayment.razorpayOrderId;

      await booking.save();

      return NextResponse.json({
        success: true,

        orderId:
          existingBookingPayment
            .razorpayOrderId,

        amount:
          amountInPaise,

        currency,

        keyId:
          getRazorpayKeyId(),

        paymentStatus:
          existingBookingPayment.status,

        bookingId:
          booking.bookingId,
      });
    }

    /*
     * ========================================
     * CREATE RAZORPAY ORDER
     * ========================================
     */

    const order =
      await razorpay.orders.create({
        amount:
          amountInPaise,

        currency,

        receipt:
          booking.bookingId,

        notes: {
          bookingId:
            booking.bookingId,

          serviceId:
            booking.serviceId,

          serviceName:
            booking.serviceName,

          customerName:
            booking.customer
              .fullName,

          customerEmail:
            booking.customer
              .email,

          customerPhone:
            booking.customer
              .mobile,
        },
      });

    /*
     * ========================================
     * CREATE PAYMENT RECORD
     * ========================================
     */

    try {
      await Payment.create({
        bookingId:
          booking._id,

        razorpayOrderId:
          order.id,

        razorpayPaymentId:
          "",

        amount,

        currency,

        status:
          "pending",

        refundStatus:
          "none",
      });
    } catch {
      console.error(
        "PAYMENT RECORD CREATION FAILED"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to create the payment record.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * ========================================
     * SAVE RAZORPAY ORDER ID
     * ========================================
     */

    booking.razorpayOrderId =
      order.id;

    await booking.save();

    /*
     * ========================================
     * SUCCESS
     * ========================================
     */

    return NextResponse.json({
      success: true,

      orderId:
        order.id,

      amount:
        order.amount,

      currency:
        order.currency,

      keyId:
        getRazorpayKeyId(),

      bookingId:
        booking.bookingId,

      paymentStatus:
        "pending",
    });
  } catch {
    console.error(
      "RAZORPAY ORDER CREATION FAILED"
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to create Razorpay payment order.",
      },
      {
        status: 500,
      }
    );
  }
}