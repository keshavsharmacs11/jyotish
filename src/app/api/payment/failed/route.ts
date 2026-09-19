import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  connectMongoose,
} from "@/lib/mongodb";

import Booking from "@/models/Booking";
import Payment from "@/models/Payment";

import {
  releaseSlotHold,
} from "@/lib/slotHold";

import {
  checkRateLimit,
} from "@/lib/rateLimit";

import {
  getClientIp,
} from "@/lib/requestSecurity";

import {
  getCustomerId,
} from "@/lib/customerAuth";

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * ==========================================
     * RATE LIMIT
     * ==========================================
     */

    const clientIp =
      getClientIp(request);

    const rateLimit =
      await checkRateLimit({
        key:
          `payment-failed-ip:${clientIp}`,
        limit: 20,
        windowMs:
          15 * 60 * 1000,
      });

    if (!rateLimit.allowed) {
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
     * ==========================================
     * READ REQUEST
     * ==========================================
     */

    const contentLength =
      request.headers.get(
        "content-length"
      );

    if (
      contentLength &&
      Number(contentLength) >
        32 * 1024
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment request is too large.",
        },
        {
          status: 413,
        }
      );
    }

    const rawBody =
      await request.text();

    if (
      Buffer.byteLength(
        rawBody,
        "utf8"
      ) >
      32 * 1024
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment request is too large.",
        },
        {
          status: 413,
        }
      );
    }

    let body: Record<
      string,
      unknown
    >;

    try {
      const parsed =
        JSON.parse(rawBody);

      if (
        !parsed ||
        typeof parsed !==
          "object" ||
        Array.isArray(parsed)
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

      body =
        parsed as Record<
          string,
          unknown
        >;
    } catch {
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

    const bookingId =
      typeof body.bookingId ===
      "string"
        ? body.bookingId.trim()
        : "";

    const razorpayOrderId =
      typeof body.razorpayOrderId ===
      "string"
        ? body.razorpayOrderId.trim()
        : "";

    const razorpayPaymentId =
      typeof body.razorpayPaymentId ===
      "string"
        ? body.razorpayPaymentId.trim()
        : "";

    const requestEmail =
      typeof body.customerEmail ===
      "string"
        ? body.customerEmail
            .trim()
            .toLowerCase()
        : "";

    const requestPhone =
      typeof body.customerPhone ===
      "string"
        ? body.customerPhone
            .replace(/\s+/g, "")
            .trim()
        : "";

    /*
     * ==========================================
     * VALIDATION
     * ==========================================
     */

    if (
      !bookingId ||
      !razorpayOrderId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing payment failure details.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      bookingId.length > 200 ||
      razorpayOrderId.length > 200 ||
      razorpayPaymentId.length > 200 ||
      requestEmail.length > 320 ||
      requestPhone.length > 50
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid payment failure request.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * DATABASE
     * ==========================================
     */

    await connectMongoose();

    /*
     * ==========================================
     * GET AUTHENTICATED CUSTOMER
     * ==========================================
     */

    const authenticatedUserId =
      await getCustomerId();

    /*
     * ==========================================
     * FIND BOOKING
     * ==========================================
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
     * ==========================================
     * BOOKING OWNERSHIP
     * ==========================================
     *
     * Logged-in customer:
     * booking.userId must match the session.
     *
     * Guest customer:
     * require the same email + phone that are
     * stored on the booking.
     */

    if (booking.userId) {
      if (!authenticatedUserId) {
        return NextResponse.json(
          {
            success: false,
            error:
              "You must be logged in to update payment status.",
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
              "You are not authorized to update this payment.",
          },
          {
            status: 403,
          }
        );
      }
    } else {
      const bookingEmail =
        String(
          booking.customer?.email ||
            ""
        )
          .trim()
          .toLowerCase();

      const bookingPhone =
        String(
          booking.customer?.mobile ||
            ""
        )
          .replace(/\s+/g, "")
          .trim();

      if (
        !requestEmail ||
        !requestPhone
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Customer email and mobile are required for guest payment failure reporting.",
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
     * ==========================================
     * ORDER ↔ BOOKING
     * ==========================================
     */

    if (
      booking.razorpayOrderId !==
      razorpayOrderId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Razorpay order does not match booking.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * FIND PAYMENT
     * ==========================================
     */

    const payment =
      await Payment.findOne({
        razorpayOrderId,
      });

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment record not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * ==========================================
     * PAYMENT ↔ BOOKING
     * ==========================================
     */

    if (
      payment.bookingId.toString() !==
      booking._id.toString()
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment does not belong to this booking.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * ==========================================
     * PAYMENT ID CONSISTENCY
     * ==========================================
     */

    if (
      payment.razorpayPaymentId &&
      razorpayPaymentId &&
      payment.razorpayPaymentId !==
        razorpayPaymentId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Payment ID does not match the existing payment record.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * ==========================================
     * DO NOT DOWNGRADE STRONGER PAYMENT STATE
     * ==========================================
     *
     * The update below is conditional at the
     * database level so a concurrent webhook or
     * verification request cannot be overwritten
     * by this failure endpoint after the payment
     * has already become paid/refunded.
     */

    if (
      payment.status ===
        "paid" ||
      booking.paymentStatus ===
        "paid"
    ) {
      return NextResponse.json({
        success: true,
        message:
          "Payment is already marked as paid.",
      });
    }

    if (
      payment.status ===
        "refunded" ||
      booking.paymentStatus ===
        "refunded"
    ) {
      return NextResponse.json({
        success: true,
        message:
          "Payment has already been refunded.",
      });
    }

    if (
      booking.status ===
        "completed" ||
      booking.status ===
        "consultant_assigned" ||
      booking.status ===
        "cancelled"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This booking is already in a finalized processing state.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * ==========================================
     * ATOMICALLY MARK PAYMENT FAILED
     * ==========================================
     */

    const paymentUpdate: Record<
      string,
      unknown
    > = {
      status: "failed",
    };

    if (
      razorpayPaymentId
    ) {
      paymentUpdate.razorpayPaymentId =
        razorpayPaymentId;
    }

    const updatedPayment =
      await Payment.findOneAndUpdate(
        {
          _id: payment._id,

          status: {
            $nin: [
              "paid",
              "refunded",
            ],
          },
        },
        {
          $set:
            paymentUpdate,
        },
        {
          new: true,
        }
      );

    /*
     * A concurrent successful webhook/
     * verification may have won the race.
     */

    if (!updatedPayment) {
      const latestPayment =
        await Payment.findById(
          payment._id
        );

      if (
        latestPayment?.status ===
        "paid"
      ) {
        return NextResponse.json({
          success: true,
          message:
            "Payment was already marked as paid.",
        });
      }

      if (
        latestPayment?.status ===
        "refunded"
      ) {
        return NextResponse.json({
          success: true,
          message:
            "Payment has already been refunded.",
        });
      }

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to safely record the payment failure.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * ==========================================
     * ATOMICALLY UPDATE BOOKING
     * ==========================================
     */

    const bookingUpdate: Record<
      string,
      unknown
    > = {
      paymentStatus:
        "failed",

      status:
        "payment_pending",
    };

    if (
      razorpayPaymentId
    ) {
      bookingUpdate.razorpayPaymentId =
        razorpayPaymentId;
    }

    const updatedBooking =
      await Booking.findOneAndUpdate(
        {
          _id: booking._id,

          paymentStatus: {
            $nin: [
              "paid",
              "refunded",
            ],
          },

          status: {
            $nin: [
              "completed",
              "consultant_assigned",
              "cancelled",
            ],
          },
        },
        {
          $set:
            bookingUpdate,
        },
        {
          new: true,
        }
      );

    /*
     * A concurrent successful webhook may
     * have finalized the booking after the
     * payment update above.
     */

    if (
      !updatedBooking
    ) {
      const latestBooking =
        await Booking.findById(
          booking._id
        );

      if (
        latestBooking?.paymentStatus ===
        "paid"
      ) {
        return NextResponse.json({
          success: true,
          message:
            "Payment was already marked as paid.",
        });
      }

      if (
        latestBooking?.paymentStatus ===
        "refunded"
      ) {
        return NextResponse.json({
          success: true,
          message:
            "Payment has already been refunded.",
        });
      }

      return NextResponse.json(
        {
          success: false,
          error:
            "Payment was recorded, but the booking state could not be safely updated.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * ==========================================
     * RELEASE TEMPORARY SLOT HOLD
     * ==========================================
     */

    if (
      updatedBooking.consultantId
    ) {
      await releaseSlotHold({
        consultantId:
          updatedBooking.consultantId,

        date:
          updatedBooking.date,

        time:
          updatedBooking.time,

        bookingId:
          updatedBooking.bookingId,
      });
    }

    /*
     * ==========================================
     * SUCCESS
     * ==========================================
     */

    return NextResponse.json({
      success: true,

      message:
        "Failed payment recorded.",

      bookingId:
        updatedBooking.bookingId,

      paymentStatus:
        updatedBooking.paymentStatus,

      bookingStatus:
        updatedBooking.status,
    });
  } catch {
    /*
     * Never expose or log:
     * - payment IDs
     * - order IDs
     * - customer data
     * - request body
     */

    console.error(
      "FAILED PAYMENT UPDATE"
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to update failed payment.",
      },
      {
        status: 500,
      }
    );
  }
}
