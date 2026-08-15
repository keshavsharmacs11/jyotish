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
 * POST REFUND
 * =========================================================
 *
 * Admin-only full refund endpoint.
 *
 * POST /api/bookings/refund
 *
 * Body:
 *
 * {
 *   bookingId: "AKJ-2026-123456",
 *   reason: "Customer requested cancellation"
 * }
 *
 * IMPORTANT:
 *
 * This endpoint creates the refund in Razorpay.
 *
 * It does NOT assume that the refund is finally
 * processed immediately.
 *
 * Final refund state is confirmed through:
 *
 * refund.processed
 * refund.failed
 *
 * Razorpay webhook events.
 */

export async function POST(
  request: NextRequest
) {
  /*
   * ==========================================
   * ADMIN AUTHENTICATION
   * ==========================================
   */

  const auth =
    await requireAdmin(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    /*
     * ==========================================
     * REQUEST BODY
     * ==========================================
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
          "Booking cancelled"
      ).trim();

    /*
     * ==========================================
     * VALIDATION
     * ==========================================
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
     * ==========================================
     * RAZORPAY CONFIGURATION
     * ==========================================
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
        "RAZORPAY REFUND CONFIGURATION ERROR."
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
          error:
            "Booking could not be found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * ==========================================
     * COMPLETED BOOKING
     * ==========================================
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
     * ==========================================
     * PAYMENT MUST BE PAID
     * ==========================================
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
     * ==========================================
     * FIND PAYMENT
     * ==========================================
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
     * ==========================================
     * PAYMENT MUST BE PAID
     * ==========================================
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
     * ==========================================
     * RAZORPAY PAYMENT ID
     * ==========================================
     */

    if (
      !payment.razorpayPaymentId
    ) {
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
     * ==========================================
     * REFUND ALREADY PROCESSED
     * ==========================================
     */

    if (
      payment.status ===
        "refunded" ||
      payment.refundStatus ===
        "processed" ||
      payment.razorpayRefundId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This payment has already been refunded.",
        },
        {
          status: 409,
        }
      );
    }

    /*
     * ==========================================
     * MARK REFUND REQUEST AS PENDING
     * ==========================================
     *
     * We intentionally keep:
     *
     * payment.status = "paid"
     *
     * until Razorpay confirms the refund.
     *
     * This prevents our database from claiming
     * that money has been refunded before the
     * payment processor confirms it.
     */

    payment.refundStatus =
      "pending";

    payment.refundReason =
      reason;

    await payment.save();

    /*
     * ==========================================
     * RAZORPAY REFUND
     * ==========================================
     *
     * Full refund.
     *
     * Razorpay amount is in the smallest
     * currency unit.
     *
     * Example:
     *
     * ₹3000 -> 300000 paise
     */

    const refundAmount =
      Math.round(
        payment.amount * 100
      );

    /*
     * ==========================================
     * IDEMPOTENCY KEY
     * ==========================================
     *
     * Same booking + payment always produces
     * the same key.
     *
     * Therefore a safe retry will not create
     * another refund.
     */

    const idempotencyKey =
      `refund_${booking.bookingId}_${payment.razorpayPaymentId}`;

    const receipt =
      `refund_${booking.bookingId}`;

    /*
     * ==========================================
     * CALL RAZORPAY
     * ==========================================
     */

    const razorpayResponse =
      await fetch(
        `https://api.razorpay.com/v1/payments/${encodeURIComponent(
          payment.razorpayPaymentId
        )}/refund`,
        {
          method: "POST",

          headers: {
            Authorization:
              `Basic ${Buffer.from(
                `${keyId}:${keySecret}`
              ).toString("base64")}`,

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
     * ==========================================
     * READ RAZORPAY RESPONSE
     * ==========================================
     */

    const razorpayData =
      await razorpayResponse.json();

    /*
     * ==========================================
     * RAZORPAY ERROR
     * ==========================================
     */

    if (
      !razorpayResponse.ok
    ) {
      console.error(
        "RAZORPAY REFUND FAILED:",
        razorpayData
      );

      payment.refundStatus =
        "failed";

      await payment.save();

      return NextResponse.json(
        {
          success: false,

          error:
            razorpayData?.error
              ?.description ||
            razorpayData?.error
              ?.reason ||
            "Razorpay refund failed.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ==========================================
     * REFUND ID
     * ==========================================
     */

    const razorpayRefundId =
      razorpayData?.id;

    if (
      !razorpayRefundId
    ) {
      console.error(
        "Razorpay refund response did not contain refund ID:",
        razorpayData
      );

      payment.refundStatus =
        "failed";

      await payment.save();

      return NextResponse.json(
        {
          success: false,

          error:
            "Refund was created but Razorpay did not return a refund ID.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * ==========================================
     * IMPORTANT
     * ==========================================
     *
     * DO NOT mark payment as "refunded" yet.
     *
     * Razorpay can return a refund that is still
     * pending.
     *
     * The refund webhook will provide the final
     * state.
     */

    payment.refundStatus =
      "pending";

    payment.razorpayRefundId =
      razorpayRefundId;

    payment.refundReason =
      reason;

    await payment.save();

    /*
     * ==========================================
     * SUCCESS
     * ==========================================
     */

    console.log(
      "REFUND CREATED:",
      {
        bookingId:
          booking.bookingId,

        paymentId:
          payment.razorpayPaymentId,

        refundId:
          razorpayRefundId,

        amount:
          payment.amount,

        refundStatus:
          payment.refundStatus,
      }
    );

    return NextResponse.json({
      success: true,

      message:
        "Refund request created successfully. Waiting for Razorpay confirmation.",

      refund: {
        refundId:
          razorpayRefundId,

        amount:
          payment.amount,

        currency:
          payment.currency,

        status:
          payment.refundStatus,

        razorpayStatus:
          razorpayData?.status ||
          "pending",

        reason:
          payment.refundReason,
      },

      booking: {
        bookingId:
          booking.bookingId,

        status:
          booking.status,

        paymentStatus:
          booking.paymentStatus,
      },
    });
  } catch (error) {
    console.error(
      "ADMIN REFUND ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

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