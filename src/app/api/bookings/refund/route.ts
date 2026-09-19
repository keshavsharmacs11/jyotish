import {
  NextRequest,
  NextResponse,
} from "next/server";

import { connectMongoose } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/adminAuth";

import Booking from "@/models/Booking";
import Payment from "@/models/Payment";

/*
 * =========================================================
 * SERIALIZE BOOKING
 * =========================================================
 *
 * Refund information is stored in Payment.
 *
 * The frontend needs the refund information every time it
 * loads/reloads a booking.
 */

function serializeBooking(
  booking: any,
  payment?: any
) {
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
      payment?.refundStatus || null,

    razorpayRefundId:
      payment?.razorpayRefundId || null,

    refundReasonFromPayment:
      payment?.refundReason || "",

    paymentStatusFromPayment:
      payment?.status || null,

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
 * null
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
     *
     * Do not refund a completed consultation through
     * this cancellation flow.
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
     *
     * THIS IS THE MOST IMPORTANT PROTECTION.
     *
     * If a refund has already been created and is pending,
     * NEVER create another refund.
     *
     * This also means that if the admin closes the booking
     * and opens it again, another refund cannot be created.
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
     *
     * If a refund previously failed, the booking remains
     * paid and can be retried.
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
     *
     * We only reach this point when:
     *
     * - there is no refund yet
     * OR
     * - the previous refund failed.
     *
     * A failed refund can be retried.
     */

    const isRetry =
      payment.refundStatus ===
      "failed";

    /*
     * Clear the old refund ID only when retrying a failed
     * refund.
     */

    if (isRetry) {
      payment.razorpayRefundId =
        undefined;
    }

    /*
     * Mark the new attempt as pending BEFORE calling
     * Razorpay.
     *
     * This protects against another admin request arriving
     * while this request is being processed.
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
     *
     * Each genuinely new refund attempt receives a unique
     * idempotency key.
     *
     * This is appropriate for:
     *
     * first attempt
     * OR
     * retry after confirmed failure
     */

    const attemptId =
      `${booking.bookingId}_${Date.now()}`;

    const idempotencyKey =
      `refund_${attemptId}`;

    /*
     * Razorpay idempotency keys support alphanumeric,
     * underscore and hyphen characters.
     */

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

    console.log(
      "CREATING RAZORPAY REFUND:",
      {
        bookingId:
          booking.bookingId,

        paymentId:
          razorpayPaymentId,

        amount:
          refundAmount,

        idempotencyKey,

        receipt,

        retry:
          isRetry,
      }
    );

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
              /*
               * Full refund.
               */

              amount:
                refundAmount,

              /*
               * Razorpay Instant Refund mode.
               *
               * Razorpay's current API uses `optimum` for Instant
               * Refunds: it attempts instant fund transfer when
               * eligible and automatically falls back to normal
               * processing when instant refund is unavailable.
               */

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

            response:
              responseText.slice(
                0,
                1000
              ),
          }
        );

        /*
         * We cannot safely say the refund definitely failed.
         *
         * However, because this request did not give us a
         * refund ID, leave it pending rather than exposing
         * another refund button immediately.
         *
         * The admin should verify the Razorpay dashboard/
         * webhook before retrying.
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
     *
     * This means Razorpay explicitly rejected the refund
     * request.
     *
     * Therefore this attempt is genuinely failed and the
     * admin may retry.
     */

    if (
      !razorpayResponse.ok
    ) {
      console.error(
        "RAZORPAY REFUND FAILED:",
        {
          status:
            razorpayResponse.status,

          data:
            razorpayData,
        }
      );

      payment.refundStatus =
        "failed";

      /*
       * There is no successful refund ID for this attempt.
       */

      payment.razorpayRefundId =
        undefined;

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
        "RAZORPAY REFUND RESPONSE DID NOT CONTAIN REFUND ID:",
        razorpayData
      );

      /*
       * We do NOT mark this as failed automatically.
       *
       * Razorpay may have accepted the refund even if our
       * response was incomplete.
       *
       * Keeping it pending prevents a duplicate refund.
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
      /*
       * FINAL SUCCESS
       */

      payment.refundStatus =
        "processed";

      payment.status =
        "refunded";
    } else if (
      razorpayRefundStatus ===
      "failed"
    ) {
      /*
       * FINAL FAILURE
       *
       * Keep the original payment as paid.
       * This allows another refund attempt.
       */

      payment.refundStatus =
        "failed";

      payment.status =
        "paid";
    } else {
      /*
       * PENDING
       */

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
     *
     * IMPORTANT:
     *
     * Pending refund:
     *   booking remains paid
     *   booking remains in current status
     *   refund button must disappear
     *
     * Processed refund:
     *   booking becomes cancelled
     *   payment becomes refunded
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
    }

    /*
     * =====================================================
     * LOG
     * =====================================================
     */

    console.log(
      "RAZORPAY REFUND RESULT:",
      {
        bookingId:
          booking.bookingId,

        paymentId:
          razorpayPaymentId,

        refundId,

        amount:
          payment.amount,

        refundStatus:
          payment.refundStatus,

        razorpayStatus:
          razorpayRefundStatus,
      }
    );

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
    /*
     * =====================================================
     * UNEXPECTED ERROR
     * =====================================================
     */

    console.error(
      "ADMIN REFUND ERROR:",
      error
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