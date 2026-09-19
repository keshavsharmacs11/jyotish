import {
  NextRequest,
  NextResponse,
} from "next/server";

import { connectMongoose } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/adminAuth";

import Booking from "@/models/Booking";
import Payment from "@/models/Payment";

import {
  sendCustomerRefundEmail,
} from "@/lib/email";

/*
 * =========================================================
 * SERIALIZE BOOKING
 * =========================================================
 *
 * Refund information is stored in Payment.
 *
 * The frontend needs the refund information every time it
 * loads/reloads a booking.
 *
 * IMPORTANT:
 *
 * If either Payment.status or Booking.paymentStatus already
 * says "refunded", the API treats the refund as processed.
 *
 * This prevents the UI from becoming stuck on "pending"
 * because of stale/inconsistent refundStatus data.
 */

function serializeBooking(
  booking: any,
  payment?: any
) {
  const normalizedRefundStatus =
    payment?.status === "refunded" ||
    booking.paymentStatus === "refunded"
      ? "processed"
      : payment?.refundStatus || null;

  return {
    _id: booking._id
      ? booking._id.toString()
      : undefined,

    bookingId:
      booking.bookingId,

    userId:
      booking.userId
        ? booking.userId.toString()
        : null,

    serviceId:
      booking.serviceId,

    serviceName:
      booking.serviceName,

    category:
      booking.category,

    mode:
      booking.mode,

    date:
      booking.date,

    time:
      booking.time,

    consultantId:
      booking.consultantId
        ? booking.consultantId.toString()
        : null,

    consultantName:
      booking.consultantName || "",

    customer:
      booking.customer || {},

    price:
      booking.price,

    currency:
      booking.currency,

    status:
      booking.status,

    paymentStatus:
      booking.paymentStatus,

    refundReason:
      booking.refundReason || "",

    razorpayOrderId:
      booking.razorpayOrderId || "",

    razorpayPaymentId:
      booking.razorpayPaymentId || "",

    /*
     * Payment refund information
     */

    refundStatus:
      normalizedRefundStatus,

    razorpayRefundId:
      payment?.razorpayRefundId || null,

    refundReasonFromPayment:
      payment?.refundReason || "",

    paymentStatusFromPayment:
      payment?.status || null,

    /*
     * Customer refund email delivery
     */

    customerRefundEmailSentAt:
      payment?.customerRefundEmailSentAt ||
      null,

    createdAt:
      booking.createdAt,

    updatedAt:
      booking.updatedAt,
  };
}

/*
 * =========================================================
 * POST /api/admin/bookings/refund
 * =========================================================
 *
 * ADMIN ONLY
 *
 * Refund lifecycle:
 *
 * none
 *   ↓
 * pending
 *   ↓
 * ┌───────────────┐
 * ↓               ↓
 * processed       failed
 * ↓               ↓
 * refunded        retry allowed
 *
 * IMPORTANT:
 *
 * We do NOT mark the booking as cancelled while the refund
 * is still pending.
 *
 * The booking is cancelled only after the refund is
 * actually processed.
 */

export async function POST(
  request: NextRequest
) {
  /*
   * =======================================================
   * ADMIN AUTHENTICATION
   * =======================================================
   */

  const auth =
    await requireAdmin(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    /*
     * =====================================================
     * READ REQUEST
     * =====================================================
     */

    const body =
      await request.json();

    const bookingId =
      String(
        body.bookingId || ""
      ).trim();

    const reason =
      String(
        body.reason ||
          body.refundReason ||
          "Booking cancelled by administrator."
      ).trim();

    /*
     * =====================================================
     * VALIDATE BOOKING ID
     * =====================================================
     */

    if (!bookingId) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Booking ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      bookingId.length > 100
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Invalid booking ID.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * RAZORPAY CONFIGURATION
     * =====================================================
     */

    const keyId =
      process.env.RAZORPAY_KEY_ID;

    const keySecret =
      process.env.RAZORPAY_KEY_SECRET;

    if (
      !keyId ||
      !keySecret
    ) {
      console.error(
        "RAZORPAY REFUND CONFIGURATION ERROR: Missing Razorpay credentials."
      );

      return NextResponse.json(
        {
          success: false,

          error:
            "Refund service is not configured.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * =====================================================
     * DATABASE
     * =====================================================
     */

    await connectMongoose();

    /*
     * =====================================================
     * FIND BOOKING
     * =====================================================
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
            "Booking could not be found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * =====================================================
     * COMPLETED BOOKING
     * =====================================================
     */

    if (
      booking.status ===
      "completed"
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "A completed consultation cannot be refunded through this cancellation flow.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * FIND PAYMENT
     * =====================================================
     */

    const payment =
      await Payment.findOne({
        bookingId:
          booking._id,
      });

    if (!payment) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Payment record could not be found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * =====================================================
     * ALREADY REFUNDED
     * =====================================================
     */

    if (
      payment.status ===
        "refunded" ||
      payment.refundStatus ===
        "processed"
    ) {
      return NextResponse.json(
        {
          success: false,

          refunded: true,

          refundPending: false,

          refundFailed: false,

          error:
            "This payment has already been refunded.",

          refund: {
            refundId:
              payment.razorpayRefundId ||
              null,

            amount:
              payment.amount,

            currency:
              payment.currency,

            status:
              payment.refundStatus,

            reason:
              payment.refundReason ||
              "",
          },

          booking:
            serializeBooking(
              booking,
              payment
            ),
        },
        {
          status: 409,
        }
      );
    }

    /*
     * =====================================================
     * REFUND ALREADY PENDING
     * =====================================================
     */

    if (
      payment.refundStatus ===
      "pending"
    ) {
      return NextResponse.json(
        {
          success: true,

          refunded: false,

          refundPending: true,

          refundFailed: false,

          message:
            "A refund is already being processed. Please wait for Razorpay confirmation.",

          refund: {
            refundId:
              payment.razorpayRefundId ||
              null,

            amount:
              payment.amount,

            currency:
              payment.currency,

            status:
              payment.refundStatus,

            reason:
              payment.refundReason ||
              "",
          },

          booking:
            serializeBooking(
              booking,
              payment
            ),
        },
        {
          status: 200,
        }
      );
    }

    /*
     * =====================================================
     * BOOKING MUST BE PAID
     * =====================================================
     */

    if (
      booking.paymentStatus !==
      "paid"
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Only paid bookings can be refunded.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * PAYMENT MUST BE PAID
     * =====================================================
     */

    if (
      payment.status !==
      "paid"
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "The payment is not eligible for refund.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * RAZORPAY PAYMENT ID
     * =====================================================
     */

    const razorpayPaymentId =
      payment.razorpayPaymentId ||
      booking.razorpayPaymentId;

    if (!razorpayPaymentId) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Razorpay payment ID is missing.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * REFUND AMOUNT
     * =====================================================
     *
     * Razorpay expects the smallest currency unit.
     *
     * ₹5,000 = 500000 paise
     */

    const refundAmount =
      Math.round(
        Number(
          payment.amount
        ) * 100
      );

    if (
      !Number.isFinite(
        refundAmount
      ) ||
      refundAmount <= 0
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Refund amount must be greater than zero.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * NEW REFUND ATTEMPT
     * =====================================================
     */

    const isRetry =
      payment.refundStatus ===
      "failed";

    if (isRetry) {
      payment.razorpayRefundId =
        undefined;

      payment.customerRefundEmailSentAt =
        null;
    }

    /*
     * Mark the new attempt as pending BEFORE calling
     * Razorpay.
     */

    payment.refundStatus =
      "pending";

    payment.refundReason =
      reason.slice(
        0,
        255
      );

    await payment.save();

    /*
     * =====================================================
     * UNIQUE REFUND ATTEMPT ID
     * =====================================================
     */

    const attemptId =
      `${booking.bookingId}_${Date.now()}`;

    const idempotencyKey =
      `refund_${attemptId}`;

    const receipt =
      `refund_${attemptId}`;

    /*
     * =====================================================
     * AUTHORIZATION
     * =====================================================
     */

    const authorization =
      Buffer.from(
        `${keyId}:${keySecret}`
      ).toString(
        "base64"
      );

    /*
     * =====================================================
     * RAZORPAY REFUND URL
     * =====================================================
     */

    const razorpayUrl =
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(
        razorpayPaymentId
      )}/refund`;

    /*
     * =====================================================
     * CALL RAZORPAY
     * =====================================================
     */

    const razorpayResponse =
      await fetch(
        razorpayUrl,
        {
          method:
            "POST",

          headers: {
            Authorization:
              `Basic ${authorization}`,

            "Content-Type":
              "application/json",

            "X-Refund-Idempotency":
              idempotencyKey,
          },

          body:
            JSON.stringify({
              amount:
                refundAmount,

              speed:
                "optimum",

              receipt,

              notes: {
                bookingId:
                  booking.bookingId,

                reason:
                  reason.slice(
                    0,
                    255
                  ),
              },
            }),
        }
      );

    /*
     * =====================================================
     * READ RESPONSE SAFELY
     * =====================================================
     */

    const responseText =
      await razorpayResponse.text();

    let razorpayData:
      any = {};

    if (
      responseText
    ) {
      try {
        razorpayData =
          JSON.parse(
            responseText
          );
      } catch {
        console.error(
          "RAZORPAY RETURNED NON-JSON RESPONSE:",
          {
            status:
              razorpayResponse.status,
          }
        );

        /*
         * We cannot safely say the refund definitely failed.
         *
         * Keep it pending to prevent a duplicate refund.
         */

        payment.refundStatus =
          "pending";

        await payment.save();

        return NextResponse.json(
          {
            success: false,

            refunded: false,

            refundPending: true,

            refundFailed: false,

            error:
              `Razorpay returned an unexpected response (HTTP ${razorpayResponse.status}). The refund state has been kept pending to prevent a duplicate refund.`,
          },
          {
            status: 502,
          }
        );
      }
    }

    /*
     * =====================================================
     * RAZORPAY REQUEST FAILED
     * =====================================================
     */

    if (
      !razorpayResponse.ok
    ) {
      console.error(
        "RAZORPAY REFUND FAILED:",
        {
          status:
            razorpayResponse.status,

          reason:
            razorpayData?.error
              ?.reason ||
            "unknown",
        }
      );

      payment.refundStatus =
        "failed";

      payment.razorpayRefundId =
        undefined;

      payment.customerRefundEmailSentAt =
        null;

      await payment.save();

      return NextResponse.json(
        {
          success: false,

          refunded: false,

          refundPending: false,

          refundFailed: true,

          error:
            razorpayData?.error
              ?.description ||
            razorpayData?.error
              ?.reason ||
            "Razorpay refund failed.",

          booking:
            serializeBooking(
              booking,
              payment
            ),
        },
        {
          status:
            razorpayResponse.status >=
              400 &&
            razorpayResponse.status <
              500
              ? razorpayResponse.status
              : 502,
        }
      );
    }

    /*
     * =====================================================
     * EXTRACT REFUND ID
     * =====================================================
     */

    const refundId =
      razorpayData?.id;

    if (!refundId) {
      console.error(
        "RAZORPAY REFUND RESPONSE DID NOT CONTAIN REFUND ID"
      );

      payment.refundStatus =
        "pending";

      await payment.save();

      return NextResponse.json(
        {
          success: false,

          refunded: false,

          refundPending: true,

          refundFailed: false,

          error:
            "Razorpay accepted an unexpected response without a refund ID. The refund has been kept pending to prevent a duplicate refund.",

          booking:
            serializeBooking(
              booking,
              payment
            ),
        },
        {
          status: 502,
        }
      );
    }

    /*
     * =====================================================
     * READ RAZORPAY REFUND STATUS
     * =====================================================
     */

    const razorpayRefundStatus =
      razorpayData?.status ||
      "pending";

    /*
     * =====================================================
     * SAVE REFUND ID
     * =====================================================
     */

    payment.razorpayRefundId =
      refundId;

    payment.refundReason =
      reason.slice(
        0,
        255
      );

    /*
     * =====================================================
     * HANDLE REFUND STATUS
     * =====================================================
     */

    if (
      razorpayRefundStatus ===
      "processed"
    ) {
      payment.refundStatus =
        "processed";

      payment.status =
        "refunded";
    } else if (
      razorpayRefundStatus ===
      "failed"
    ) {
      payment.refundStatus =
        "failed";

      payment.status =
        "paid";

      payment.razorpayRefundId =
        undefined;

      payment.customerRefundEmailSentAt =
        null;
    } else {
      payment.refundStatus =
        "pending";

      payment.status =
        "paid";
    }

    await payment.save();

    /*
     * =====================================================
     * UPDATE BOOKING ONLY WHEN REFUND PROCESSED
     * =====================================================
     */

    if (
      razorpayRefundStatus ===
      "processed"
    ) {
      booking.paymentStatus =
        "refunded";

      booking.status =
        "cancelled";

      booking.refundReason =
        reason.slice(
          0,
          255
        );

      await booking.save();

      /*
       * ===================================================
       * CUSTOMER REFUND EMAIL
       * ===================================================
       */

      if (
        !payment.customerRefundEmailSentAt
      ) {
        try {
          await sendCustomerRefundEmail({
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

            amount:
              Number(
                payment.amount
              ),

            currency:
              payment.currency,

            refundId,

            reason:
              payment.refundReason ||
              reason,
          });

          payment.customerRefundEmailSentAt =
            new Date();

          await payment.save();
        } catch {
          console.error(
            "CUSTOMER REFUND EMAIL FAILED"
          );
        }
      }
    }

    /*
     * =====================================================
     * RESPONSE
     * =====================================================
     */

    return NextResponse.json({
      success: true,

      refunded:
        razorpayRefundStatus ===
        "processed",

      refundPending:
        razorpayRefundStatus ===
        "pending",

      refundFailed:
        razorpayRefundStatus ===
        "failed",

      message:
        razorpayRefundStatus ===
        "processed"
          ? "Booking cancelled and refund processed successfully."
          : razorpayRefundStatus ===
            "failed"
          ? "Refund failed. You can retry the refund."
          : "Refund request submitted successfully. Waiting for Razorpay confirmation.",

      refund: {
        refundId,

        amount:
          payment.amount,

        currency:
          payment.currency,

        status:
          payment.refundStatus,

        razorpayStatus:
          razorpayRefundStatus,

        reason:
          payment.refundReason ||
          "",
      },

      booking:
        serializeBooking(
          booking,
          payment
        ),
    });
  } catch (error) {
    console.error(
      "ADMIN REFUND ERROR:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return NextResponse.json(
      {
        success: false,

        refunded: false,

        refundPending: false,

        error:
          error instanceof Error
            ? error.message
            : "Unable to process refund.",
      },
      {
        status: 500,
      }
    );
  }
}