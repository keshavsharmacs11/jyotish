import { NextResponse } from "next/server";
import crypto from "crypto";

import clientPromise from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Payment from "@/models/Payment";

export async function POST(request: Request) {
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
     * VERIFY WEBHOOK SIGNATURE
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
     * PARSE BODY
     * ============================================
     */

    const event =
      JSON.parse(rawBody);

    console.log(
      "Razorpay webhook received:",
      event.event
    );

    /*
     * ============================================
     * DATABASE
     * ============================================
     */

    const client =
      await clientPromise;

    await client
      .db("codepunkdb")
      .command({
        ping: 1,
      });

    /*
     * ============================================
     * PAYMENT CAPTURED
     * ============================================
     */

    if (
      event.event ===
        "payment.captured" ||
      event.event ===
        "order.paid"
    ) {
      let paymentEntity: any;
      let orderId: string | null = null;
      let paymentId: string | null = null;

      /*
       * ------------------------------------------
       * payment.captured
       * ------------------------------------------
       */

      if (
        event.event ===
        "payment.captured"
      ) {
        paymentEntity =
          event.payload?.payment?.entity;

        orderId =
          paymentEntity?.order_id;

        paymentId =
          paymentEntity?.id;
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

        const paymentData =
          event.payload?.payment?.entity;

        orderId =
          orderEntity?.id;

        paymentId =
          paymentData?.id;

        paymentEntity =
          paymentData;
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

      /*
       * ==========================================
       * FIND PAYMENT
       * ==========================================
       */

      const payment =
        await Payment.findOne({
          razorpayOrderId:
            orderId,
        });

      if (!payment) {
        console.error(
          "Payment record not found for order:",
          orderId
        );

        /*
         * Acknowledge unknown payment so
         * Razorpay does not repeatedly retry it.
         */

        return NextResponse.json({
          success: true,
          message:
            "Payment record not found; event acknowledged.",
        });
      }

      /*
       * ==========================================
       * FIND BOOKING
       * ==========================================
       */

      const booking =
        await Booking.findById(
          payment.bookingId
        );

      if (!booking) {
        console.error(
          "Booking not found for payment:",
          payment._id
        );

        return NextResponse.json({
          success: true,
          message:
            "Payment found; booking not found.",
        });
      }

      /*
       * ==========================================
       * IDEMPOTENCY
       * ==========================================
       */

      if (
        payment.status === "paid" &&
        booking.paymentStatus === "paid"
      ) {
        return NextResponse.json({
          success: true,
          message:
            "Payment already processed.",
        });
      }

      /*
       * ==========================================
       * PROTECT COMPLETED / CANCELLED BOOKINGS
       * ==========================================
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
       *
       * Booking.ts contains a partial unique
       * index:
       *
       * consultantId + date + time
       *
       * only when paymentStatus === "paid".
       *
       * Therefore this save is the point where
       * MongoDB protects the slot.
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
         * ========================================
         * DUPLICATE SLOT
         * ========================================
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
           * Do NOT mark our Payment document
           * as paid here.
           *
           * The Razorpay payment itself may
           * already have been captured, so this
           * situation requires payment resolution
           * rather than silently confirming the
           * booking.
           *
           * We acknowledge the webhook so Razorpay
           * doesn't endlessly retry the same event.
           */

          return NextResponse.json({
            success: true,

            message:
              "Payment received but the selected consultation slot is already booked. Manual payment resolution is required.",

            slotConflict: true,

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

      /*
       * ==========================================
       * SUCCESS
       * ==========================================
       */

      console.log(
        "Webhook successfully updated payment and booking:",
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
     * ============================================
     * PAYMENT FAILED
     * ============================================
     */

    if (
      event.event ===
      "payment.failed"
    ) {
      const paymentEntity =
        event.payload?.payment?.entity;

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
 * ============================================
 * REFUND PROCESSED
 * ============================================
 */

if (
  event.event ===
    "refund.processed" ||
  event.event ===
    "refund.created" ||
  event.event ===
    "refund.failed"
) {
  const refundEntity =
    event.payload?.refund?.entity;

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
    return NextResponse.json({
      success: true,
      message:
        "Refund payment record not found; event acknowledged.",
    });
  }

  /*
   * Save Razorpay refund ID.
   */

  if (refundId) {
    payment.razorpayRefundId =
      refundId;
  }

  /*
   * REFUND PROCESSED
   */

  if (
    event.event ===
    "refund.processed"
  ) {
    payment.refundStatus =
      "processed";

    payment.status =
      "refunded";

    const booking =
      await Booking.findById(
        payment.bookingId
      );

    if (booking) {
      booking.paymentStatus =
        "refunded";

      /*
       * Booking should already be cancelled
       * when the admin initiated the refund.
       */

      booking.status =
        "cancelled";

      await booking.save();
    }
  }

  /*
   * REFUND CREATED
   *
   * Refund exists but may still be
   * processing.
   */

  if (
    event.event ===
    "refund.created"
  ) {
    payment.refundStatus =
      "pending";
  }

        /*
        * REFUND FAILED
        */

        if (
            event.event ===
            "refund.failed"
        ) {
            payment.refundStatus =
            "failed";
        }

        await payment.save();

        console.log(
            "Refund webhook processed:",
            {
            event:
                event.event,

            paymentId,

            refundId,
            }
        );

        return NextResponse.json({
            success: true,

            message:
            "Refund webhook processed successfully.",
        });
        }

      /*
       * Never turn an already-paid payment
       * back into failed.
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
        "Failed payment webhook processed:",
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
 * ============================================
 * REFUND EVENTS
 * ============================================
 */

if (
  event.event ===
    "refund.created" ||
  event.event ===
    "refund.processed" ||
  event.event ===
    "refund.failed"
) {
  const refundEntity =
    event.payload?.refund?.entity;

  const refundId =
    refundEntity?.id;

  const paymentId =
    refundEntity?.payment_id;

  /*
   * ==========================================
   * PAYMENT ID VALIDATION
   * ==========================================
   */

  if (!paymentId) {
    console.error(
      "Refund webhook: payment ID missing."
    );

    return NextResponse.json({
      success: true,

      message:
        "Refund event acknowledged; payment ID missing.",
    });
  }

  /*
   * ==========================================
   * FIND PAYMENT
   * ==========================================
   */

  const payment =
    await Payment.findOne({
      razorpayPaymentId:
        paymentId,
    });

  if (!payment) {
    console.error(
      "Refund webhook: payment record not found.",
      paymentId
    );

    return NextResponse.json({
      success: true,

      message:
        "Refund payment record not found; event acknowledged.",
    });
  }

  /*
   * ==========================================
   * SAVE REFUND ID
   * ==========================================
   */

  if (refundId) {
    payment.razorpayRefundId =
      refundId;
  }

  /*
   * ==========================================
   * REFUND CREATED
   * ==========================================
   *
   * Refund has been created but may still
   * be processing.
   */

  if (
    event.event ===
    "refund.created"
  ) {
    payment.refundStatus =
      "pending";
  }

  /*
   * ==========================================
   * REFUND PROCESSED
   * ==========================================
   *
   * Razorpay has successfully processed
   * the refund.
   */

  if (
    event.event ===
    "refund.processed"
  ) {
    payment.refundStatus =
      "processed";

    payment.status =
      "refunded";

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
  }

  /*
   * ==========================================
   * REFUND FAILED
   * ==========================================
   */

  if (
    event.event ===
    "refund.failed"
  ) {
    payment.refundStatus =
      "failed";
  }

  await payment.save();

  /*
   * ==========================================
   * SUCCESS
   * ==========================================
   */

  console.log(
    "Refund webhook processed:",
    {
      event:
        event.event,

      paymentId,

      refundId,
    }
  );

  return NextResponse.json({
    success: true,

    message:
      "Refund webhook processed successfully.",
  });
}

    /*
     * ============================================
     * OTHER EVENTS
     * ============================================
     */

    return NextResponse.json({
      success: true,

      message:
        "Webhook event acknowledged.",

      event:
        event.event,
    });
  } catch (error) {
    console.error(
      "Razorpay webhook error:",
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