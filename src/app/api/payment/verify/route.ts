
import {
  NextRequest,
  NextResponse,
} from "next/server";

import crypto from "crypto";

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
  sendBookingConfirmationEmail,
  sendAdminBookingNotificationEmail,
} from "@/lib/email";

const CONFIRMATION_ACCESS_COOKIE =
  "akj_booking_confirmation_access";

const CONFIRMATION_ACCESS_TTL_SECONDS =
  10 * 60;

const MAX_REQUEST_BODY_BYTES =
  32 * 1024;

const BOOKING_ID_PATTERN =
  /^AKJ-\d{4}-\d{6}$/i;

function createConfirmationAccessToken(
  bookingId: string
): string {
  const secret =
    process.env.CUSTOMER_SESSION_SECRET;

  if (!secret) {
    throw new Error(
      "CUSTOMER_SESSION_SECRET is not configured."
    );
  }

  const issuedAt = Date.now()
    .toString();

  const payload =
    `${bookingId}|${issuedAt}`;

  const signature =
    crypto
      .createHmac(
        "sha256",
        secret
      )
      .update(payload)
      .digest("hex");

  return `${payload}|${signature}`;
}

function attachConfirmationAccessCookie(
  response: NextResponse,
  bookingId: string
): NextResponse {
  const token =
    createConfirmationAccessToken(
      bookingId
    );

  response.cookies.set({
    name:
      CONFIRMATION_ACCESS_COOKIE,

    value:
      token,

    httpOnly:
      true,

    secure:
      process.env.NODE_ENV ===
      "production",

    sameSite:
      "lax",

    path:
      "/api/guest/booking",

    maxAge:
      CONFIRMATION_ACCESS_TTL_SECONDS,
  });

  return response;
}

/*
 * ==========================================
 * SEND BOOKING EMAILS
 * ==========================================
 *
 * Email delivery must never make a successful
 * Razorpay payment appear unsuccessful.
 *
 * Each email is tracked independently on the
 * Payment document.
 */

async function sendBookingEmails({
  booking,
  payment,
}: {
  booking: any;
  payment: any;
}) {
  /*
   * ==========================================
   * CUSTOMER CONFIRMATION EMAIL
   * ==========================================
   */

  if (
    !payment.customerConfirmationEmailSentAt
  ) {
    try {
      await sendBookingConfirmationEmail({
        email:
          booking.customer.email,

        name:
          booking.customer.fullName,

        bookingId:
          booking.bookingId,

        serviceName:
          booking.serviceName,

        consultantName:
          booking.consultantName ||
          "To be assigned",

        date:
          booking.date,

        time:
          booking.time,

        mode:
          booking.mode,

        price:
          Number(booking.price),

        currency:
          booking.currency,
      });

      payment.customerConfirmationEmailSentAt =
        new Date();

      await payment.save();
    } catch {
      /*
       * Do NOT fail the payment because
       * an email provider failed.
       */

      console.error(
        "CUSTOMER BOOKING CONFIRMATION EMAIL FAILED"
      );
    }
  }

  /*
   * ==========================================
   * ADMIN BOOKING EMAIL
   * ==========================================
   */

  if (
    !payment.adminBookingEmailSentAt
  ) {
    try {
      await sendAdminBookingNotificationEmail({
        bookingId:
          booking.bookingId,

        customerName:
          booking.customer.fullName,

        customerEmail:
          booking.customer.email,

        customerMobile:
          booking.customer.mobile,

        serviceName:
          booking.serviceName,

        category:
          booking.category,

        consultantName:
          booking.consultantName ||
          "To be assigned",

        date:
          booking.date,

        time:
          booking.time,

        mode:
          booking.mode,

        price:
          Number(booking.price),

        currency:
          booking.currency,
      });

      payment.adminBookingEmailSentAt =
        new Date();

      await payment.save();
    } catch {
      /*
       * Do NOT fail the payment because
       * an admin email failed.
       */

      console.error(
        "ADMIN BOOKING NOTIFICATION EMAIL FAILED"
      );
    }
  }
}

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
          `payment-verify-ip:${clientIp}`,

        limit:
          20,

        windowMs:
          15 * 60 * 1000,
      });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,

          verified: false,

          error:
            "Too many payment verification attempts. Please try again later.",
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
        MAX_REQUEST_BODY_BYTES
    ) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          error:
            "Request body is too large.",
        },
        { status: 413 }
      );
    }

    const rawBody =
      await request.text();

    if (
      new TextEncoder().encode(
        rawBody
      ).byteLength >
      MAX_REQUEST_BODY_BYTES
    ) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          error:
            "Request body is too large.",
        },
        { status: 413 }
      );
    }

    let body: unknown;

    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          error:
            "Invalid request body.",
        },
        { status: 400 }
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          error:
            "Invalid request body.",
        },
        { status: 400 }
      );
    }

    const requestBody =
      body as Record<
        string,
        unknown
      >;

    const razorpayOrderId =
      typeof requestBody.razorpay_order_id ===
      "string"
        ? requestBody.razorpay_order_id.trim()
        : "";

    const razorpayPaymentId =
      typeof requestBody.razorpay_payment_id ===
      "string"
        ? requestBody.razorpay_payment_id.trim()
        : "";

    const razorpaySignature =
      typeof requestBody.razorpay_signature ===
      "string"
        ? requestBody.razorpay_signature.trim()
        : "";

    const bookingId =
      typeof requestBody.bookingId ===
      "string"
        ? requestBody.bookingId.trim()
        : "";

    /*
     * ==========================================
     * VALIDATION
     * ==========================================
     */

    if (
      !razorpayOrderId ||
      !razorpayPaymentId ||
      !razorpaySignature ||
      !BOOKING_ID_PATTERN.test(
        bookingId
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          verified: false,

          error:
            "Missing payment verification details.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * BASIC LENGTH VALIDATION
     * ==========================================
     */

    if (
      razorpayOrderId.length >
        200 ||
      razorpayPaymentId.length >
        200 ||
      razorpaySignature.length >
        200 ||
      bookingId.length >
        200
    ) {
      return NextResponse.json(
        {
          success: false,

          verified: false,

          error:
            "Invalid payment verification request.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * RAZORPAY SECRET
     * ==========================================
     */

    const keySecret =
      process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
      console.error(
        "RAZORPAY_KEY_SECRET is not configured."
      );

      return NextResponse.json(
        {
          success: false,

          verified: false,

          error:
            "Payment verification is not configured.",
        },
        {
          status: 500,
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

          verified: false,

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
     * ORDER ↔ BOOKING CHECK
     * ==========================================
     */

    if (
      booking.razorpayOrderId !==
      razorpayOrderId
    ) {
      return NextResponse.json(
        {
          success: false,

          verified: false,

          error:
            "Razorpay order does not match the booking.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * RAZORPAY SIGNATURE VERIFICATION
     * ==========================================
     */

    const bodyToSign =
      `${razorpayOrderId}|${razorpayPaymentId}`;

    const expectedSignature =
      crypto
        .createHmac(
          "sha256",
          keySecret
        )
        .update(bodyToSign)
        .digest("hex");

    const expectedBuffer =
      Buffer.from(
        expectedSignature,
        "hex"
      );

    const receivedBuffer =
      Buffer.from(
        razorpaySignature,
        "hex"
      );

    if (
      expectedBuffer.length !==
      receivedBuffer.length
    ) {
      return NextResponse.json(
        {
          success: false,

          verified: false,

          error:
            "Invalid payment signature.",
        },
        {
          status: 400,
        }
      );
    }

    const signatureValid =
      crypto.timingSafeEqual(
        expectedBuffer,
        receivedBuffer
      );

    if (!signatureValid) {
      return NextResponse.json(
        {
          success: false,

          verified: false,

          error:
            "Payment signature verification failed.",
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

          verified: false,

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
     * PAYMENT ↔ BOOKING CHECK
     * ==========================================
     */

    if (
      payment.bookingId.toString() !==
      booking._id.toString()
    ) {
      return NextResponse.json(
        {
          success: false,

          verified: false,

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
     * AMOUNT / CURRENCY CONSISTENCY
     * ==========================================
     */

    const bookingAmount =
      Number(
        booking.price
      );

    const bookingCurrency =
      String(
        booking.currency ||
          "INR"
      )
        .trim()
        .toUpperCase();

    const paymentAmount =
      Number(
        payment.amount
      );

    const paymentCurrency =
      String(
        payment.currency ||
          ""
      )
        .trim()
        .toUpperCase();

    if (
      !Number.isFinite(
        bookingAmount
      ) ||
      !Number.isFinite(
        paymentAmount
      ) ||
      bookingAmount <= 0 ||
      paymentAmount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,

          verified: false,

          error:
            "Invalid payment amount.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      Math.round(
        bookingAmount * 100
      ) !==
      Math.round(
        paymentAmount * 100
      )
    ) {
      return NextResponse.json(
        {
          success: false,

          verified: false,

          error:
            "Payment amount does not match the booking.",
        },
        {
          status: 409,
        }
      );
    }

    if (
      bookingCurrency !==
      paymentCurrency
    ) {
      return NextResponse.json(
        {
          success: false,

          verified: false,

          error:
            "Payment currency does not match the booking.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * ==========================================
     * IDEMPOTENCY
     * ==========================================
     */

    if (
      payment.status ===
        "paid" &&
      booking.paymentStatus ===
        "paid"
    ) {
      /*
       * If the same successful payment is
       * verified again, do not change the
       * payment state.
       */

      if (
        payment.razorpayPaymentId &&
        payment.razorpayPaymentId !==
          razorpayPaymentId
      ) {
        return NextResponse.json(
          {
            success: false,

            verified: false,

            error:
              "Payment ID does not match the existing payment record.",
          },
          {
            status: 409,
          }
        );
      }

      /*
       * If email delivery was interrupted
       * previously, this retry can complete
       * the missing notifications.
       */

      await sendBookingEmails({
        booking,
        payment,
      });

      /*
       * Release temporary hold.
       */

      if (
        booking.consultantId
      ) {
        await releaseSlotHold({
          consultantId:
            booking.consultantId,

          date:
            booking.date,

          time:
            booking.time,

          bookingId:
            booking.bookingId,
        });
      }

      const response =
        NextResponse.json({
          success: true,

          verified: true,

          paymentId:
            payment.razorpayPaymentId ||
            razorpayPaymentId,

          orderId:
            payment.razorpayOrderId,

          bookingId:
            booking.bookingId,

          message:
            "Payment was already verified.",
        });

      return attachConfirmationAccessCookie(
        response,
        booking.bookingId
      );
    }

    /*
     * ==========================================
     * PROTECT AGAINST PAYMENT-ID REUSE
     * ==========================================
     */

    if (
      payment.razorpayPaymentId &&
      payment.razorpayPaymentId !==
        razorpayPaymentId
    ) {
      return NextResponse.json(
        {
          success: false,

          verified: false,

          error:
            "A different payment is already associated with this order.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * ==========================================
     * CLAIM CONSULTANT SLOT
     * ==========================================
     */

    try {
      booking.razorpayPaymentId =
        razorpayPaymentId;

      booking.paymentStatus =
        "paid";

      booking.status =
        "confirmed";

      await booking.save();
    } catch (
      error: unknown
    ) {
      /*
       * Duplicate-key means the permanent
       * paid booking slot is already owned.
       */

      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === 11000
      ) {
        console.error(
          "CONSULTANT SLOT CLAIM FAILED"
        );

        return NextResponse.json(
          {
            success: false,

            verified: false,

            error:
              "This consultation slot has just been booked by another customer. Your payment succeeded but could not be attached to this booking. Please contact support for payment resolution.",
          },
          {
            status: 409,
          }
        );
      }

      throw error;
    }

    /*
     * ==========================================
     * UPDATE PAYMENT
     * ==========================================
     */

    payment.razorpayPaymentId =
      razorpayPaymentId;

    payment.status =
      "paid";

    payment.refundStatus =
      "none";

    await payment.save();

    /*
     * ==========================================
     * RELEASE TEMPORARY HOLD
     * ==========================================
     */

    if (
      booking.consultantId
    ) {
      await releaseSlotHold({
        consultantId:
          booking.consultantId,

        date:
          booking.date,

        time:
          booking.time,

        bookingId:
          booking.bookingId,
      });
    }

    /*
     * ==========================================
     * SEND CONFIRMATION EMAILS
     * ==========================================
     *
     * Payment is already persisted as paid.
     *
     * Email failure must NOT change that state.
     */

    await sendBookingEmails({
      booking,
      payment,
    });

    /*
     * ==========================================
     * SUCCESS
     * ==========================================
     */

    const response =
      NextResponse.json({
        success: true,

        verified: true,

        paymentId:
          razorpayPaymentId,

        orderId:
          razorpayOrderId,

        bookingId:
          booking.bookingId,

        bookingStatus:
          booking.status,

        paymentStatus:
          booking.paymentStatus,
      });

    return attachConfirmationAccessCookie(
      response,
      booking.bookingId
    );
  } catch {
    /*
     * Do not expose internal errors.
     *
     * Do not log:
     * - payment IDs
     * - order IDs
     * - signatures
     * - request bodies
     * - customer information
     */

    console.error(
      "RAZORPAY PAYMENT VERIFICATION FAILED"
    );

    return NextResponse.json(
      {
        success: false,

        verified: false,

        error:
          "Unable to verify Razorpay payment.",
      },
      {
        status: 500,
      }
    );
  }
}
