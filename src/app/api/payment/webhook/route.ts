import { NextResponse } from "next/server";
import crypto from "crypto";

import { connectMongoose } from "@/lib/mongodb";

import Booking from "@/models/Booking";
import Payment from "@/models/Payment";

export async function POST(
  request: Request
) {
  try {
    /*
     * ============================================
     * READ RAW BODY
     * ============================================
     */

    const rawBody =
      await request.text();

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
     * ============================================
     * VERIFY SIGNATURE
     * ============================================
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
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid webhook signature.",
        },
        { status: 400 }
      );
    }

    const isValid =
      crypto.timingSafeEqual(
        expectedBuffer,
        receivedBuffer
      );

    if (!isValid) {
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
     * ============================================
     * PARSE EVENT
     * ============================================
     */

    const event =
      JSON.parse(rawBody);

    console.log(
      "RAZORPAY WEBHOOK:",
      event.event
    );

    /*
     * ============================================
     * DATABASE
     * ============================================
     */

    await connectMongoose();

    /*
     * =====================================================
     * PAYMENT CAPTURED
     * =====================================================
     */

    if (
      event.event ===
        "payment.captured" ||
      event.event ===
        "order.paid"
    ) {
      let orderId:
        | string
        | null = null;

      let paymentId:
        | string
        | null = null;

      /*
       * ------------------------------------------
       * payment.captured
       * ------------------------------------------
       */

      if (
        event.event ===
        "payment.captured"
      ) {
        const paymentEntity =
          event.payload?.payment
            ?.entity;

        orderId =
          paymentEntity?.order_id ||
          null;

        paymentId =
          paymentEntity?.id ||
          null;
      }

      /*
       * ------------------------------------------
       * order.paid
       * ------------------------------------------
       */

      if (
        event.event ===
        "order.paid"
      ) {
        const orderEntity =
          event.payload?.order?.entity;

        const paymentEntity =
          event.payload?.payment
            ?.entity;

        orderId =
          orderEntity?.id ||
          paymentEntity?.order_id ||
          null;

        paymentId =
          paymentEntity?.id ||
          null;
      }

      if (!orderId) {
        console.error(
          "Webhook payment/order ID missing."
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

      const payment =
        await Payment.findOne({
          razorpayOrderId:
            orderId,
        });

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
       * Already processed
       */

      if (
        payment.status ===
          "paid" &&
        booking.paymentStatus ===
          "paid"
      ) {
        return NextResponse.json({
          success: true,

          message:
            "Payment already processed.",
        });
      }

      /*
       * Never resurrect cancelled/completed
       * bookings through a payment webhook.
       */

      if (
        booking.status ===
          "completed" ||
        booking.status ===
          "cancelled"
      ) {
        return NextResponse.json({
          success: true,

          message:
            "Booking is already completed or cancelled.",
        });
      }

      /*
       * ==========================================
       * CLAIM CONSULTANT SLOT
       * ==========================================
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
         * Duplicate consultant/date/time
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
           * Do not mark our internal payment
           * record as paid because this booking
           * could not claim the slot.
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
       * ==========================================
       * UPDATE PAYMENT
       * ==========================================
       */

      payment.status =
        "paid";

      if (paymentId) {
        payment.razorpayPaymentId =
          paymentId;
      }

      await payment.save();

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
      event.event ===
      "payment.failed"
    ) {
      const paymentEntity =
        event.payload?.payment
          ?.entity;

      const orderId =
        paymentEntity?.order_id;

      const paymentId =
        paymentEntity?.id;

      if (!orderId) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Payment order ID missing.",
          },
          { status: 400 }
        );
      }

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
       * Never change an already-paid payment
       * back to failed.
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

      payment.status =
        "failed";

      if (paymentId) {
        payment.razorpayPaymentId =
          paymentId;
      }

      await payment.save();

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
     * Refund exists but may still be processing.
     */

    if (
      event.event ===
      "refund.created"
    ) {
      const refundEntity =
        event.payload?.refund
          ?.entity;

      const refundId =
        refundEntity?.id;

      const paymentId =
        refundEntity?.payment_id;

      if (!paymentId) {
        return NextResponse.json({
          success: true,

          message:
            "Refund event acknowledged; payment ID missing.",
        });
      }

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

      if (refundId) {
        payment.razorpayRefundId =
          refundId;
      }

      payment.refundStatus =
        "pending";

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
     */

    if (
      event.event ===
      "refund.processed"
    ) {
      const refundEntity =
        event.payload?.refund
          ?.entity;

      const refundId =
        refundEntity?.id;

      const paymentId =
        refundEntity?.payment_id;

      if (!paymentId) {
        return NextResponse.json({
          success: true,

          message:
            "Refund processed event acknowledged; payment ID missing.",
        });
      }

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

      if (refundId) {
        payment.razorpayRefundId =
          refundId;
      }

      payment.refundStatus =
        "processed";

      payment.status =
        "refunded";

      await payment.save();

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
     */

    if (
      event.event ===
      "refund.failed"
    ) {
      const refundEntity =
        event.payload?.refund
          ?.entity;

      const refundId =
        refundEntity?.id;

      const paymentId =
        refundEntity?.payment_id;

      if (!paymentId) {
        return NextResponse.json({
          success: true,

          message:
            "Refund failed event acknowledged; payment ID missing.",
        });
      }

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

      if (refundId) {
        payment.razorpayRefundId =
          refundId;
      }

      payment.refundStatus =
        "failed";

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
      event.event
    );

    return NextResponse.json({
      success: true,

      message:
        "Webhook event acknowledged.",

      event:
        event.event,
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