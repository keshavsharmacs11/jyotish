import { NextResponse } from "next/server";
import crypto from "crypto";

import { connectMongoose } from "@/lib/mongodb";

import Booking from "@/models/Booking";
import Payment from "@/models/Payment";

import {
  releaseSlotHold,
} from "@/lib/slotHold";

/*
 * =========================================================
 * RAZORPAY WEBHOOK
 * =========================================================
 *
 * Handles:
 *
 * PAYMENT
 * - payment.captured
 * - order.paid
 * - payment.failed
 *
 * REFUND
 * - refund.created
 * - refund.processed
 * - refund.failed
 *
 * IMPORTANT:
 *
 * Razorpay webhook signature is verified against the
 * ORIGINAL RAW REQUEST BODY.
 *
 * Refunds are considered final only after Razorpay
 * confirms the refund state.
 */

export async function POST(
  request: Request
) {
  console.log(
    "🔥 RAZORPAY WEBHOOK REQUEST RECEIVED"
  );

  try {
    /*
     * =====================================================
     * READ RAW BODY
     * =====================================================
     */

    const rawBody =
      await request.text();

    /*
     * =====================================================
     * WEBHOOK SIGNATURE
     * =====================================================
     */

    const signature =
      request.headers.get(
        "x-razorpay-signature"
      );

    const webhookSecret =
      process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error(
        "RAZORPAY_WEBHOOK_SECRET is not configured."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Webhook secret is not configured.",
        },
        { status: 500 }
      );
    }

    if (!signature) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing Razorpay webhook signature.",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * VERIFY RAZORPAY SIGNATURE
     * =====================================================
     */

    const expectedSignature =
      crypto
        .createHmac(
          "sha256",
          webhookSecret
        )
        .update(rawBody)
        .digest("hex");

    const expectedBuffer =
      Buffer.from(
        expectedSignature,
        "hex"
      );

    const receivedBuffer =
      Buffer.from(
        signature,
        "hex"
      );

    if (
      expectedBuffer.length !==
      receivedBuffer.length
    ) {
      console.error(
        "Invalid Razorpay webhook signature length."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid webhook signature.",
        },
        { status: 400 }
      );
    }

    const signatureValid =
      crypto.timingSafeEqual(
        expectedBuffer,
        receivedBuffer
      );

    if (!signatureValid) {
      console.error(
        "Razorpay webhook signature verification failed."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid webhook signature.",
        },
        { status: 400 }
      );
    }

    /*
     * =====================================================
     * PARSE EVENT
     * =====================================================
     */

    let event: any;

    try {
      event =
        JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid webhook JSON.",
        },
        { status: 400 }
      );
    }

    const eventName =
      event?.event;

    console.log(
      "RAZORPAY WEBHOOK:",
      eventName
    );

    /*
     * =====================================================
     * DATABASE
     * =====================================================
     */

    await connectMongoose();

    /*
     * =====================================================
     * PAYMENT CAPTURED
     * =====================================================
     *
     * Razorpay can notify payment capture through:
     *
     * payment.captured
     * order.paid
     *
     * Both represent a successfully captured payment.
     */

    if (
      eventName ===
        "payment.captured" ||
      eventName ===
        "order.paid"
    ) {
      let orderId:
        | string
        | null = null;

      let paymentId:
        | string
        | null = null;

      /*
       * -----------------------------------------------------
       * payment.captured
       * -----------------------------------------------------
       */

      if (
        eventName ===
        "payment.captured"
      ) {
        const paymentEntity =
          event.payload
            ?.payment
            ?.entity;

        orderId =
          paymentEntity?.order_id ||
          null;

        paymentId =
          paymentEntity?.id ||
          null;
      }

      /*
       * -----------------------------------------------------
       * order.paid
       * -----------------------------------------------------
       */

      if (
        eventName ===
        "order.paid"
      ) {
        const orderEntity =
          event.payload
            ?.order
            ?.entity;

        const paymentEntity =
          event.payload
            ?.payment
            ?.entity;

        orderId =
          orderEntity?.id ||
          paymentEntity?.order_id ||
          null;

        paymentId =
          paymentEntity?.id ||
          null;
      }

      /*
       * -----------------------------------------------------
       * VALIDATE ORDER ID
       * -----------------------------------------------------
       */

      if (!orderId) {
        console.error(
          "Razorpay payment webhook order ID missing."
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Payment order ID missing.",
          },
          { status: 400 }
        );
      }

      /*
       * -----------------------------------------------------
       * FIND PAYMENT
       * -----------------------------------------------------
       */

      const payment =
        await Payment.findOne({
          razorpayOrderId:
            orderId,
        });

      /*
       * The webhook may arrive for an order that
       * does not belong to our application.
       *
       * Acknowledge it instead of repeatedly
       * receiving the same webhook.
       */

      if (!payment) {
        console.error(
          "Payment record not found:",
          orderId
        );

        return NextResponse.json({
          success: true,
          message:
            "Payment record not found; event acknowledged.",
        });
      }

      /*
       * -----------------------------------------------------
       * FIND BOOKING
       * -----------------------------------------------------
       */

      const booking =
        await Booking.findById(
          payment.bookingId
        );

      if (!booking) {
        console.error(
          "Booking not found:",
          payment.bookingId
        );

        return NextResponse.json({
          success: true,
          message:
            "Payment found; booking not found.",
        });
      }

      /*
       * -----------------------------------------------------
       * ALREADY PROCESSED
       * -----------------------------------------------------
       *
       * Razorpay can send webhook events more than once.
       *
       * If the verification endpoint already processed
       * the payment, the permanent paid Booking already
       * protects the slot.
       *
       * We still release any leftover temporary hold.
       */

      if (
        payment.status ===
          "paid" &&
        booking.paymentStatus ===
          "paid"
      ) {
        await releaseSlotHold({
          consultantId:
            booking.consultantId!,

          date:
            booking.date,

          time:
            booking.time,

          bookingId:
            booking.bookingId,
        });

        return NextResponse.json({
          success: true,
          message:
            "Payment already processed.",
        });
      }

      /*
       * -----------------------------------------------------
       * NEVER RESURRECT CANCELLED / COMPLETED BOOKINGS
       * -----------------------------------------------------
       */

      if (
        booking.status ===
          "completed" ||
        booking.status ===
          "cancelled"
      ) {
        console.warn(
          "Payment webhook received for completed/cancelled booking:",
          booking.bookingId
        );

        return NextResponse.json({
          success: true,
          message:
            "Booking is already completed or cancelled.",
        });
      }

      /*
       * -----------------------------------------------------
       * CLAIM CONSULTANT SLOT
       * -----------------------------------------------------
       *
       * The unique MongoDB index protects the slot.
       *
       * If another paid booking already owns the same
       * consultant/date/time combination, save() will
       * throw duplicate key error 11000.
       */

      try {
        booking.paymentStatus =
          "paid";

        booking.status =
          "confirmed";

        if (paymentId) {
          booking.razorpayPaymentId =
            paymentId;
        }

        await booking.save();
      } catch (error: any) {
        /*
         * ---------------------------------------------------
         * DUPLICATE CONSULTANT SLOT
         * ---------------------------------------------------
         */

        if (
          error?.code === 11000
        ) {
          console.error(
            "CONSULTANT SLOT ALREADY BOOKED:",
            {
              bookingId:
                booking.bookingId,

              consultantId:
                booking.consultantId
                  ?.toString(),

              date:
                booking.date,

              time:
                booking.time,
            }
          );

          /*
           * IMPORTANT:
           *
           * We intentionally do NOT mark our internal
           * Payment record as paid.
           *
           * Razorpay has received the money, but our
           * booking could not claim the requested slot.
           *
           * This still requires the automatic refund
           * resolution that we will implement next.
           */

          return NextResponse.json({
            success: true,

            slotConflict: true,

            message:
              "Payment received but the selected consultation slot is already booked. Manual payment resolution is required.",

            bookingId:
              booking.bookingId,
          });
        }

        throw error;
      }

      /*
       * -----------------------------------------------------
       * UPDATE PAYMENT RECORD
       * -----------------------------------------------------
       */

      payment.status =
        "paid";

      if (paymentId) {
        payment.razorpayPaymentId =
          paymentId;
      }

      /*
       * A successful new payment must not retain an
       * old refund state.
       */

      payment.refundStatus =
        "none";

      await payment.save();

      /*
       * -----------------------------------------------------
       * RELEASE TEMPORARY SLOT HOLD
       * -----------------------------------------------------
       *
       * The payment is now successfully recorded.
       *
       * The permanent paid Booking protects the slot,
       * so the temporary hold can be removed.
       */

      await releaseSlotHold({
        consultantId:
          booking.consultantId!,

        date:
          booking.date,

        time:
          booking.time,

        bookingId:
          booking.bookingId,
      });

      console.log(
        "PAYMENT CAPTURED:",
        {
          bookingId:
            booking.bookingId,

          orderId,

          paymentId,
        }
      );

      return NextResponse.json({
        success: true,

        message:
          "Payment webhook processed successfully.",

        bookingId:
          booking.bookingId,

        bookingStatus:
          booking.status,

        paymentStatus:
          booking.paymentStatus,
      });
    }

    /*
     * =====================================================
     * PAYMENT FAILED
     * =====================================================
     */

    if (
      eventName ===
      "payment.failed"
    ) {
      const paymentEntity =
        event.payload
          ?.payment
          ?.entity;

      const orderId =
        paymentEntity?.order_id;

      const paymentId =
        paymentEntity?.id;

      if (!orderId) {
        console.error(
          "Failed payment webhook order ID missing."
        );

        return NextResponse.json(
          {
            success: false,
            error:
              "Payment order ID missing.",
          },
          { status: 400 }
        );
      }

      /*
       * -----------------------------------------------------
       * FIND PAYMENT
       * -----------------------------------------------------
       */

      const payment =
        await Payment.findOne({
          razorpayOrderId:
            orderId,
        });

      if (!payment) {
        return NextResponse.json({
          success: true,

          message:
            "Payment record not found; event acknowledged.",
        });
      }

      /*
       * -----------------------------------------------------
       * NEVER CHANGE PAID → FAILED
       * -----------------------------------------------------
       */

      if (
        payment.status ===
        "paid"
      ) {
        return NextResponse.json({
          success: true,

          message:
            "Payment already paid; failure ignored.",
        });
      }

      /*
       * -----------------------------------------------------
       * UPDATE PAYMENT
       * -----------------------------------------------------
       */

      payment.status =
        "failed";

      if (paymentId) {
        payment.razorpayPaymentId =
          paymentId;
      }

      await payment.save();

      /*
       * -----------------------------------------------------
       * UPDATE BOOKING
       * -----------------------------------------------------
       */

      const booking =
        await Booking.findById(
          payment.bookingId
        );

      if (
        booking &&
        booking.paymentStatus !==
          "paid"
      ) {
        booking.paymentStatus =
          "failed";

        booking.status =
          "payment_pending";

        if (paymentId) {
          booking.razorpayPaymentId =
            paymentId;
        }

        await booking.save();

        /*
         * ---------------------------------------------------
         * RELEASE TEMPORARY SLOT HOLD
         * ---------------------------------------------------
         *
         * Payment failed, so the temporary reservation
         * can be removed immediately.
         */

        await releaseSlotHold({
          consultantId:
            booking.consultantId!,

          date:
            booking.date,

          time:
            booking.time,

          bookingId:
            booking.bookingId,
        });
      }

      console.log(
        "PAYMENT FAILED:",
        {
          orderId,
          paymentId,
        }
      );

      return NextResponse.json({
        success: true,

        message:
          "Failed payment webhook processed.",
      });
    }

    /*
     * =====================================================
     * REFUND CREATED
     * =====================================================
     *
     * Razorpay has created the refund.
     *
     * The refund may still be processing.
     *
     * Therefore:
     *
     * payment.status       = paid
     * payment.refundStatus = pending
     *
     * We DO NOT mark the payment as refunded here.
     */

    if (
      eventName ===
      "refund.created"
    ) {
      const refundEntity =
        event.payload
          ?.refund
          ?.entity;

      const refundId =
        refundEntity?.id;

      const paymentId =
        refundEntity?.payment_id;

      if (!paymentId) {
        console.warn(
          "Refund created event missing payment ID."
        );

        return NextResponse.json({
          success: true,

          message:
            "Refund event acknowledged; payment ID missing.",
        });
      }

      /*
       * -----------------------------------------------------
       * FIND PAYMENT
       * -----------------------------------------------------
       */

      const payment =
        await Payment.findOne({
          razorpayPaymentId:
            paymentId,
        });

      if (!payment) {
        console.error(
          "Refund payment not found:",
          paymentId
        );

        return NextResponse.json({
          success: true,

          message:
            "Refund payment record not found; event acknowledged.",
        });
      }

      /*
       * -----------------------------------------------------
       * SAVE REFUND INFORMATION
       * -----------------------------------------------------
       */

      if (refundId) {
        payment.razorpayRefundId =
          refundId;
      }

      payment.refundStatus =
        "pending";

      /*
       * Keep payment.status = paid.
       *
       * The money has not yet reached its final
       * refund state according to our system.
       */

      if (
        payment.status !==
        "refunded"
      ) {
        payment.status =
          "paid";
      }

      await payment.save();

      console.log(
        "REFUND CREATED:",
        {
          paymentId,
          refundId,
        }
      );

      return NextResponse.json({
        success: true,

        message:
          "Refund created webhook processed.",
      });
    }

    /*
     * =====================================================
     * REFUND PROCESSED
     * =====================================================
     *
     * This is the final successful refund state.
     *
     * ONLY HERE do we change:
     *
     * Payment:
     *   status       → refunded
     *   refundStatus → processed
     *
     * Booking:
     *   paymentStatus → refunded
     *   status        → cancelled
     */

    if (
      eventName ===
      "refund.processed"
    ) {
      const refundEntity =
        event.payload
          ?.refund
          ?.entity;

      const refundId =
        refundEntity?.id;

      const paymentId =
        refundEntity?.payment_id;

      if (!paymentId) {
        console.warn(
          "Refund processed event missing payment ID."
        );

        return NextResponse.json({
          success: true,

          message:
            "Refund processed event acknowledged; payment ID missing.",
        });
      }

      /*
       * -----------------------------------------------------
       * FIND PAYMENT
       * -----------------------------------------------------
       */

      const payment =
        await Payment.findOne({
          razorpayPaymentId:
            paymentId,
        });

      if (!payment) {
        console.error(
          "Refund payment not found:",
          paymentId
        );

        return NextResponse.json({
          success: true,

          message:
            "Refund payment record not found; event acknowledged.",
        });
      }

      /*
       * -----------------------------------------------------
       * UPDATE PAYMENT
       * -----------------------------------------------------
       */

      if (refundId) {
        payment.razorpayRefundId =
          refundId;
      }

      payment.refundStatus =
        "processed";

      payment.status =
        "refunded";

      await payment.save();

      /*
       * -----------------------------------------------------
       * UPDATE BOOKING
       * -----------------------------------------------------
       */

      const booking =
        await Booking.findById(
          payment.bookingId
        );

      if (booking) {
        booking.paymentStatus =
          "refunded";

        booking.status =
          "cancelled";

        await booking.save();
      }

      console.log(
        "REFUND PROCESSED:",
        {
          paymentId,
          refundId,

          bookingId:
            booking?.bookingId,
        }
      );

      return NextResponse.json({
        success: true,

        message:
          "Refund processed successfully.",

        paymentId,

        refundId,

        bookingId:
          booking?.bookingId,
      });
    }

    /*
     * =====================================================
     * REFUND FAILED
     * =====================================================
     *
     * A failed refund does NOT mean the payment failed.
     *
     * Therefore:
     *
     * payment.status       remains paid
     * payment.refundStatus becomes failed
     *
     * booking.paymentStatus remains paid
     *
     * This allows the admin to investigate/retry
     * the refund without our database falsely
     * claiming that the customer received money.
     */

    if (
      eventName ===
      "refund.failed"
    ) {
      const refundEntity =
        event.payload
          ?.refund
          ?.entity;

      const refundId =
        refundEntity?.id;

      const paymentId =
        refundEntity?.payment_id;

      if (!paymentId) {
        console.warn(
          "Refund failed event missing payment ID."
        );

        return NextResponse.json({
          success: true,

          message:
            "Refund failed event acknowledged; payment ID missing.",
        });
      }

      /*
       * -----------------------------------------------------
       * FIND PAYMENT
       * -----------------------------------------------------
       */

      const payment =
        await Payment.findOne({
          razorpayPaymentId:
            paymentId,
        });

      if (!payment) {
        console.error(
          "Refund payment not found:",
          paymentId
        );

        return NextResponse.json({
          success: true,

          message:
            "Refund payment record not found; event acknowledged.",
        });
      }

      /*
       * -----------------------------------------------------
       * UPDATE REFUND STATUS
       * -----------------------------------------------------
       */

      if (refundId) {
        payment.razorpayRefundId =
          refundId;
      }

      payment.refundStatus =
        "failed";

      /*
       * DO NOT change:
       *
       * payment.status
       *
       * It should remain "paid" because the original
       * payment succeeded and the refund failed.
       */

      if (
        payment.status !==
        "refunded"
      ) {
        payment.status =
          "paid";
      }

      await payment.save();

      console.error(
        "REFUND FAILED:",
        {
          paymentId,
          refundId,
        }
      );

      return NextResponse.json({
        success: true,

        message:
          "Refund failed webhook processed.",
      });
    }

    /*
     * =====================================================
     * OTHER EVENTS
     * =====================================================
     */

    console.log(
      "Unhandled Razorpay webhook:",
      eventName
    );

    return NextResponse.json({
      success: true,

      message:
        "Webhook event acknowledged.",

      event:
        eventName,
    });
  } catch (error) {
    console.error(
      "RAZORPAY WEBHOOK ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          "Unable to process Razorpay webhook.",
      },
      {
        status: 500,
      }
    );
  }
}