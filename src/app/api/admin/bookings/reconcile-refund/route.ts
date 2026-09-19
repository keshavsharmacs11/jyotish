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
 * POST /api/admin/bookings/reconcile-refund
 * =========================================================
 *
 * ADMIN ONLY
 *
 * This endpoint NEVER creates a refund.
 *
 * It asks Razorpay for the current status of the refund already
 * stored on our Payment document, then synchronizes our database
 * with Razorpay's authoritative refund state.
 *
 * If the refund is already processed, it also sends the customer
 * refund confirmation email if that email has not already been sent.
 *
 * Email failure NEVER rolls back or changes the successful refund.
 */

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await request.json();

    const bookingId = String(
      body.bookingId || ""
    ).trim();

    const paymentId = String(
      body.paymentId || ""
    ).trim();

    if (!bookingId && !paymentId) {
      return NextResponse.json(
        {
          success: false,
          error: "Booking ID or Razorpay Payment ID is required.",
        },
        { status: 400 }
      );
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return NextResponse.json(
        {
          success: false,
          error: "Refund service is not configured.",
        },
        { status: 500 }
      );
    }

    await connectMongoose();

    let payment: any = null;

    if (paymentId) {
      payment = await Payment.findOne({
        razorpayPaymentId: paymentId,
      });
    } else {
      const booking = await Booking.findOne({
        bookingId,
      });

      if (booking) {
        payment = await Payment.findOne({
          bookingId: booking._id,
        });
      }
    }

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment record could not be found.",
        },
        { status: 404 }
      );
    }

    const razorpayPaymentId = String(
      payment.razorpayPaymentId || ""
    ).trim();

    const refundId = String(
      payment.razorpayRefundId || ""
    ).trim();

    if (!razorpayPaymentId) {
      return NextResponse.json(
        {
          success: false,
          error: "The payment does not have a Razorpay Payment ID.",
        },
        { status: 400 }
      );
    }

    if (!refundId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The payment does not have a Razorpay Refund ID to reconcile.",
        },
        { status: 400 }
      );
    }

    /*
     * =========================================================
     * VERIFY THE EXACT REFUND WITH RAZORPAY
     * =========================================================
     */

    const authHeader = Buffer.from(
      `${keyId}:${keySecret}`
    ).toString("base64");

    const razorpayResponse = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(
        razorpayPaymentId
      )}/refunds/${encodeURIComponent(refundId)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Basic ${authHeader}`,
          Accept: "application/json",
        },
        cache: "no-store",
      }
    );

    const responseText =
      await razorpayResponse.text();

    let razorpayData: any = null;

    try {
      razorpayData = responseText
        ? JSON.parse(responseText)
        : null;
    } catch {
      console.error(
        "RAZORPAY REFUND RECONCILIATION NON-JSON RESPONSE:",
        responseText.slice(0, 1000)
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Razorpay returned an unexpected response while checking the refund.",
        },
        { status: 502 }
      );
    }

    if (!razorpayResponse.ok) {
      console.error(
        "RAZORPAY REFUND RECONCILIATION FAILED:",
        razorpayResponse.status,
        razorpayData
      );

      return NextResponse.json(
        {
          success: false,
          error:
            razorpayData?.error?.description ||
            razorpayData?.error?.reason ||
            "Razorpay could not verify the stored refund.",
        },
        { status: razorpayResponse.status }
      );
    }

    const verifiedRefundId = String(
      razorpayData?.id || ""
    ).trim();

    const verifiedPaymentId = String(
      razorpayData?.payment_id || ""
    ).trim();

    const refundStatus = String(
      razorpayData?.status || ""
    )
      .trim()
      .toLowerCase();

    /*
     * =========================================================
     * SAFETY CHECKS
     * =========================================================
     */

    if (
      verifiedRefundId !== refundId ||
      verifiedPaymentId !== razorpayPaymentId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Razorpay returned a refund that does not match the stored payment record.",
        },
        { status: 409 }
      );
    }

    const refundAmount = Number(
      razorpayData?.amount ?? NaN
    );

    if (
      Number.isFinite(refundAmount) &&
      refundAmount !== Number(payment.amount) * 100
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Razorpay refund amount does not match the payment amount. Database was not changed.",
        },
        { status: 409 }
      );
    }

    if (
      refundStatus !== "processed" &&
      refundStatus !== "pending" &&
      refundStatus !== "failed"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: `Razorpay returned an unsupported refund status: ${
            refundStatus || "unknown"
          }. Database was not changed.`,
        },
        { status: 409 }
      );
    }

    /*
     * =========================================================
     * SYNCHRONIZE PAYMENT
     * =========================================================
     */

    payment.razorpayRefundId = refundId;

    if (refundStatus === "processed") {
      payment.refundStatus = "processed";
      payment.status = "refunded";
    } else if (refundStatus === "failed") {
      payment.refundStatus = "failed";
      payment.status = "paid";
    } else {
      payment.refundStatus = "pending";

      if (payment.status !== "refunded") {
        payment.status = "paid";
      }
    }

    await payment.save();

    /*
     * =========================================================
     * SYNCHRONIZE BOOKING
     * =========================================================
     */

    const booking = await Booking.findById(
      payment.bookingId
    );

    if (booking && refundStatus === "processed") {
      booking.paymentStatus = "refunded";
      booking.status = "cancelled";

      /*
       * Keep an existing refund reason if the booking already
       * has one. Otherwise use the Payment refund reason.
       */
      if (
        !booking.refundReason &&
        payment.refundReason
      ) {
        booking.refundReason =
          String(payment.refundReason).slice(0, 255);
      }

      await booking.save();
    }

    /*
     * =========================================================
     * CUSTOMER REFUND EMAIL
     * =========================================================
     *
     * Only send after Razorpay has confirmed the refund is
     * processed and our database has been synchronized.
     *
     * IMPORTANT:
     * - Never send a duplicate email.
     * - Never fail the refund because email delivery fails.
     * - Save customerRefundEmailSentAt only after the email
     *   service accepts the message.
     */

    let customerRefundEmailSent = false;
    let customerRefundEmailError: string | null = null;

    if (
      booking &&
      refundStatus === "processed" &&
      !payment.customerRefundEmailSentAt
    ) {
      try {
        const customerEmail = String(
          booking.customer?.email || ""
        ).trim();

        if (!customerEmail) {
          customerRefundEmailError =
            "Customer email address is missing.";
          console.error(
            "CUSTOMER REFUND EMAIL FAILED: Customer email address is missing."
          );
        } else {
          await sendCustomerRefundEmail({
            email: customerEmail,

            name:
              booking.customer?.fullName ||
              "Customer",

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
              Number(payment.amount),

            currency:
              payment.currency,

            refundId,

            reason:
              payment.refundReason ||
              booking.refundReason ||
              "Cancelled by administrator",
          });

          /*
           * Mark the email as sent ONLY after the email
           * service successfully accepts it.
           */
          payment.customerRefundEmailSentAt =
            new Date();

          await payment.save();

          customerRefundEmailSent = true;

          console.log(
            "CUSTOMER REFUND EMAIL SENT:",
            customerEmail,
            refundId
          );
        }
      } catch (error) {
        customerRefundEmailError =
          error instanceof Error
            ? error.message
            : "Unknown email delivery error.";

        /*
         * Do NOT fail the refund because email delivery failed.
         */
        console.error(
          "CUSTOMER REFUND EMAIL FAILED:",
          error
        );
      }
    } else if (
      booking &&
      refundStatus === "processed" &&
      payment.customerRefundEmailSentAt
    ) {
      /*
       * The email was already recorded as sent.
       * Do not send it again.
       */
      customerRefundEmailSent = true;
    }

    /*
     * =========================================================
     * RESPONSE
     * =========================================================
     */

    return NextResponse.json({
      success: true,
      reconciled: true,

      refund: {
        refundId,
        paymentId: razorpayPaymentId,
        status: refundStatus,
        speedProcessed:
          razorpayData?.speed_processed || null,
      },

      email: {
        attempted:
          Boolean(
            booking &&
            refundStatus === "processed"
          ),
        sent:
          customerRefundEmailSent,
        error:
          customerRefundEmailError,
      },

      booking: booking
        ? {
            bookingId:
              booking.bookingId,
            status:
              booking.status,
            paymentStatus:
              booking.paymentStatus,
          }
        : null,

      payment: {
        status:
          payment.status,
        refundStatus:
          payment.refundStatus,
        razorpayRefundId:
          payment.razorpayRefundId,
        customerRefundEmailSentAt:
          payment.customerRefundEmailSentAt ||
          null,
      },
    });
  } catch (error) {
    console.error(
      "REFUND RECONCILIATION ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to reconcile the refund status.",
      },
      { status: 500 }
    );
  }
}
