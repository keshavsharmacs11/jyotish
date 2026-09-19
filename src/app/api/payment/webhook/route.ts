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
import RazorpayWebhookEvent from "@/models/RazorpayWebhookEvent";

import {
  releaseSlotHold,
} from "@/lib/slotHold";

/*
 * Razorpay can retry webhook deliveries for an extended period.
 * Keep a replay window long enough to accept a legitimate delayed
 * delivery, while still rejecting very old, previously unseen payloads.
 */
const MAX_WEBHOOK_AGE_SECONDS =
  24 * 60 * 60;

/*
 * Maximum accepted webhook body size.
 *
 * Razorpay webhook payloads are normally far smaller than this.
 * The limit protects the endpoint from unnecessarily large
 * unauthenticated HTTP bodies before JSON parsing/processing.
 */
const MAX_WEBHOOK_BODY_BYTES =
  256 * 1024;

/*
 * =========================================================
 * RAZORPAY WEBHOOK
 * =========================================================
 *
 * Security properties:
 *
 * - Raw-body HMAC verification
 * - Event-ID idempotency
 * - Replay/stale-event protection
 * - Payment ↔ Booking consistency
 * - Amount/currency validation
 * - Safe state transitions
 * - No sensitive identifiers in logs
 */

export async function POST(
  request: NextRequest
) {
  let webhookStep = "request";

  try {
    /*
     * =====================================================
     * READ / VALIDATE CONTENT LENGTH
     * =====================================================
     *
     * Content-Length is only an early rejection mechanism.
     * The actual body is checked again after reading because
     * request headers must not be trusted as the sole size control.
     */

    webhookStep = "validate content length";
    const contentLength =
      Number(
        request.headers.get(
          "content-length"
        ) || "0"
      );

    if (
      Number.isFinite(
        contentLength
      ) &&
      contentLength >
        MAX_WEBHOOK_BODY_BYTES
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Webhook payload is too large.",
        },
        {
          status: 413,
        }
      );
    }

    /*
     * =====================================================
     * READ RAW BODY
     * =====================================================
     *
     * Signature verification must use the raw request body.
     * Do not parse and re-stringify before HMAC verification.
     */

    webhookStep = "read raw body";
    const rawBody =
      await request.text();

    /*
     * Enforce the body limit again using the actual bytes.
     */

    if (
      Buffer.byteLength(
        rawBody,
        "utf8"
      ) >
      MAX_WEBHOOK_BODY_BYTES
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Webhook payload is too large.",
        },
        {
          status: 413,
        }
      );
    }

    /*
     * =====================================================
     * READ REQUIRED HEADERS
     * =====================================================
     */

    webhookStep = "validate webhook headers";
    const signature =
      request.headers.get(
        "x-razorpay-signature"
      );

    const eventId =
      request.headers.get(
        "x-razorpay-event-id"
      );

    const webhookSecret =
      process.env
        .RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error(
        "RAZORPAY_WEBHOOK_SECRET is not configured."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Webhook configuration error.",
        },
        {
          status: 500,
        }
      );
    }

    /*
     * Razorpay signs the payload using SHA-256 HMAC.
     *
     * Require the exact hexadecimal representation expected
     * from a SHA-256 digest before converting it to a Buffer.
     */

    if (
      !signature ||
      !/^[a-f0-9]{64}$/i.test(
        signature
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid webhook signature.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Razorpay documents x-razorpay-event-id
     * as the unique identifier for an event.
     */

    if (!eventId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Missing webhook event identifier.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * Defensive upper bound for the event identifier.
     * We do not need to enforce a provider-specific exact format
     * here because the value is only used as an idempotency key.
     */

    if (
      eventId.length >
      200
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid webhook event identifier.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * VERIFY SIGNATURE AGAINST RAW BODY
     * =====================================================
     */

    webhookStep = "verify webhook signature";
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
        {
          status: 400,
        }
      );
    }

    if (
      !crypto.timingSafeEqual(
        expectedBuffer,
        receivedBuffer
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid webhook signature.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * PARSE VERIFIED BODY
     * =====================================================
     */

    webhookStep = "parse webhook payload";
    let event: any;

    try {
      event =
        JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid webhook payload.",
        },
        {
          status: 400,
        }
      );
    }

    const eventName =
      typeof event?.event ===
      "string"
        ? event.event
        : "";

    if (!eventName) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Webhook event type is missing.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =====================================================
     * DATABASE + EVENT IDEMPOTENCY
     * =====================================================
     *
     * Check the event record before applying the age window.
     * Razorpay may retry the same authenticated event after a
     * previous delivery failed. A retry must be allowed to resume
     * a previously-started event instead of being discarded solely
     * because its original created_at is now older.
     */

    webhookStep = "connect to database";
    await connectMongoose();

    const existingEvent =
      await RazorpayWebhookEvent.findOne({
        eventId,
      });

    if (
      existingEvent?.status ===
      "processed"
    ) {
      return NextResponse.json({
        success: true,
        message:
          "Webhook event already processed.",
      });
    }

    /*
     * =====================================================
     * REPLAY / STALE EVENT PROTECTION
     * =====================================================
     *
     * Razorpay webhook payloads include created_at.
     */

    const createdAt =
      Number(
        event?.created_at
      );

    if (
      !Number.isFinite(
        createdAt
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Webhook timestamp is missing.",
        },
        {
          status: 400,
        }
      );
    }

    const eventAge =
      Math.floor(
        Date.now() / 1000
      ) - createdAt;

    /*
     * Reject obviously future-dated events.
     */

    if (
      eventAge <
      -60
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid webhook timestamp.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * A previously-started event is allowed to continue through a
     * legitimate Razorpay retry even if its created_at is outside
     * the normal replay window. This is the important retry path.
     */

    if (
      eventAge >
        MAX_WEBHOOK_AGE_SECONDS &&
      existingEvent?.status !==
        "processing"
    ) {
      return NextResponse.json({
        success: true,
        message:
          "Stale webhook event ignored.",
      });
    }

    /*
     * =====================================================
     * EVENT IDEMPOTENCY RECORD
     * =====================================================
     */

    if (
      existingEvent?.status ===
      "processing"
    ) {
      await RazorpayWebhookEvent.updateOne(
        {
          eventId,
        },
        {
          $set: {
            eventName,
            status:
              "processing",
            processedAt:
              null,
          },
        }
      );
    } else {
      try {
        await RazorpayWebhookEvent.create({
          eventId,
          eventName,
          status:
            "processing",
        });
      } catch (
        error
      ) {
        /*
         * Another concurrent delivery may have created the
         * event between findOne() and create(). Re-read it.
         */
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === 11000
        ) {
          const concurrentEvent =
            await RazorpayWebhookEvent.findOne({
              eventId,
            });

          if (
            concurrentEvent?.status ===
            "processed"
          ) {
            return NextResponse.json({
              success: true,
              message:
                "Webhook event already processed.",
            });
          }

          await RazorpayWebhookEvent.updateOne(
            {
              eventId,
            },
            {
              $set: {
                eventName,
                status:
                  "processing",
                processedAt:
                  null,
              },
            }
          );
        } else {
          throw error;
        }
      }
    }

    /*
     * =====================================================
     * PAYMENT CAPTURED / ORDER PAID
     * =====================================================
     */

    webhookStep = `process ${eventName}`;

    if (
      eventName ===
        "payment.captured" ||
      eventName ===
        "order.paid"
    ) {
      const paymentEntity =
        event.payload
          ?.payment
          ?.entity;

      const orderEntity =
        event.payload
          ?.order
          ?.entity;

      const orderId =
        paymentEntity?.order_id ||
        orderEntity?.id ||
        null;

      const paymentId =
        paymentEntity?.id ||
        null;

      const webhookAmount =
        Number(
          paymentEntity?.amount ??
            orderEntity?.amount
        );

      const webhookCurrency =
        String(
          paymentEntity?.currency ||
            orderEntity?.currency ||
            ""
        )
          .trim()
          .toUpperCase();

      if (!orderId) {
        throw new Error(
          "PAYMENT_ORDER_ID_MISSING"
        );
      }

      if (
        !Number.isFinite(
          webhookAmount
        ) ||
        webhookAmount <= 0
      ) {
        throw new Error(
          "PAYMENT_AMOUNT_INVALID"
        );
      }

      if (
        !webhookCurrency
      ) {
        throw new Error(
          "PAYMENT_CURRENCY_MISSING"
        );
      }

      /*
       * Find our Payment first using the
       * authenticated Razorpay order ID.
       */

      const payment =
        await Payment.findOne({
          razorpayOrderId:
            orderId,
        });

      if (!payment) {
        /*
         * The event is authentic but belongs
         * to an order outside our application.
         *
         * Mark event processed and acknowledge.
         */

        await RazorpayWebhookEvent.updateOne(
          {
            eventId,
          },
          {
            $set: {
              status:
                "processed",
              processedAt:
                new Date(),
            },
          }
        );

        return NextResponse.json({
          success: true,
          message:
            "Webhook acknowledged.",
        });
      }

      const booking =
        await Booking.findById(
          payment.bookingId
        );

      if (!booking) {
        throw new Error(
          "PAYMENT_BOOKING_NOT_FOUND"
        );
      }

      /*
       * Payment ↔ Booking relationship.
       */

      if (
        payment.bookingId.toString() !==
        booking._id.toString()
      ) {
        throw new Error(
          "PAYMENT_BOOKING_MISMATCH"
        );
      }

      /*
       * Order ↔ Booking relationship.
       */

      if (
        booking.razorpayOrderId !==
        orderId
      ) {
        throw new Error(
          "ORDER_BOOKING_MISMATCH"
        );
      }

      /*
       * Payment ID consistency.
       */

      if (
        payment.razorpayPaymentId &&
        payment.razorpayPaymentId !==
          paymentId
      ) {
        throw new Error(
          "PAYMENT_ID_MISMATCH"
        );
      }

      /*
       * Amount consistency.
       *
       * Razorpay amount is in the smallest
       * currency unit (for INR: paise).
       *
       * Our Payment model stores the booking
       * amount in the application's currency
       * unit.
       */

      const expectedAmount =
        Math.round(
          Number(
            payment.amount
          ) * 100
        );

      if (
        expectedAmount !==
        Math.round(
          webhookAmount
        )
      ) {
        throw new Error(
          "PAYMENT_AMOUNT_MISMATCH"
        );
      }

      const expectedCurrency =
        String(
          payment.currency
        )
          .trim()
          .toUpperCase();

      if (
        expectedCurrency !==
        webhookCurrency
      ) {
        throw new Error(
          "PAYMENT_CURRENCY_MISMATCH"
        );
      }

      /*
       * Already processed.
       */

      if (
        payment.status ===
          "paid" &&
        booking.paymentStatus ===
          "paid"
      ) {
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

        await RazorpayWebhookEvent.updateOne(
          {
            eventId,
          },
          {
            $set: {
              status:
                "processed",
              processedAt:
                new Date(),
            },
          }
        );

        return NextResponse.json({
          success: true,
          message:
            "Payment already processed.",
        });
      }

      /*
       * Never resurrect a cancelled booking
       * through a webhook.
       *
       * Completed bookings should also not
       * be moved backwards.
       */

      if (
        booking.status ===
          "cancelled" ||
        booking.status ===
          "completed"
      ) {
        await RazorpayWebhookEvent.updateOne(
          {
            eventId,
          },
          {
            $set: {
              status:
                "processed",
              processedAt:
                new Date(),
            },
          }
        );

        return NextResponse.json({
          success: true,
          message:
            "Webhook acknowledged.",
        });
      }

      /*
       * Claim permanent slot.
       */

      try {
        booking.paymentStatus =
          "paid";

        booking.status =
          "confirmed";

        if (
          paymentId
        ) {
          booking.razorpayPaymentId =
            paymentId;
        }

        await booking.save();
      } catch (
        error
      ) {
        if (
          error &&
          typeof error === "object" &&
          "code" in error &&
          error.code === 11000
        ) {
          /*
           * Payment reached Razorpay but the
           * requested slot is already owned.
           *
           * Do not silently mark the internal
           * payment as paid.
           */

          console.error(
            "CONSULTANT SLOT CLAIM FAILED"
          );

          /*
           * Leave event unprocessed so the
           * application can deliberately handle
           * this exceptional payment-resolution
           * path rather than falsely acknowledging
           * it as completely resolved.
           */

          return NextResponse.json(
            {
              success: false,
              error:
                "Payment received but the consultation slot is unavailable.",
            },
            {
              status: 409,
            }
          );
        }

        throw error;
      }

      payment.status =
        "paid";

      if (
        paymentId
      ) {
        payment.razorpayPaymentId =
          paymentId;
      }

      payment.refundStatus =
        "none";

      await payment.save();

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

      await RazorpayWebhookEvent.updateOne(
        {
          eventId,
        },
        {
          $set: {
            status:
              "processed",
            processedAt:
              new Date(),
          },
        }
      );

      return NextResponse.json({
        success: true,
        message:
          "Payment webhook processed.",
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
        throw new Error(
          "FAILED_PAYMENT_ORDER_ID_MISSING"
        );
      }

      const payment =
        await Payment.findOne({
          razorpayOrderId:
            orderId,
        });

      if (!payment) {
        await RazorpayWebhookEvent.updateOne(
          {
            eventId,
          },
          {
            $set: {
              status:
                "processed",
              processedAt:
                new Date(),
            },
          }
        );

        return NextResponse.json({
          success: true,
          message:
            "Webhook acknowledged.",
        });
      }

      /*
       * A failed event must never downgrade
       * an already-paid payment.
       *
       * Razorpay documents that a payment.failed
       * event can be followed by payment.captured.
       */

      if (
        payment.status ===
        "paid"
      ) {
        await RazorpayWebhookEvent.updateOne(
          {
            eventId,
          },
          {
            $set: {
              status:
                "processed",
              processedAt:
                new Date(),
            },
          }
        );

        return NextResponse.json({
          success: true,
          message:
            "Already-paid payment ignored.",
        });
      }

      if (
        payment.razorpayPaymentId &&
        paymentId &&
        payment.razorpayPaymentId !==
          paymentId
      ) {
        throw new Error(
          "FAILED_PAYMENT_ID_MISMATCH"
        );
      }

      payment.status =
        "failed";

      if (
        paymentId
      ) {
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

        if (
          paymentId
        ) {
          booking.razorpayPaymentId =
            paymentId;
        }

        await booking.save();

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
      }

      await RazorpayWebhookEvent.updateOne(
        {
          eventId,
        },
        {
          $set: {
            status:
              "processed",
            processedAt:
              new Date(),
          },
        }
      );

      return NextResponse.json({
        success: true,
        message:
          "Payment failure webhook processed.",
      });
    }

    /*
     * =====================================================
     * REFUND CREATED
     * =====================================================
     */

    if (
      eventName ===
      "refund.created"
    ) {
      webhookStep = "refund.created";
      const refundEntity =
        event.payload
          ?.refund
          ?.entity;

      const refundId =
        refundEntity?.id;

      const paymentId =
        refundEntity?.payment_id;

      if (!paymentId) {
        throw new Error(
          "REFUND_PAYMENT_ID_MISSING"
        );
      }

      if (!refundId) {
        throw new Error(
          "REFUND_ID_MISSING"
        );
      }

      const payment =
        await Payment.findOne({
          razorpayPaymentId:
            paymentId,
        });

      if (!payment) {
        await RazorpayWebhookEvent.updateOne(
          {
            eventId,
          },
          {
            $set: {
              status:
                "processed",
              processedAt:
                new Date(),
            },
          }
        );

        return NextResponse.json({
          success: true,
          message:
            "Webhook acknowledged.",
        });
      }

      /*
       * Keep the latest known refund ID.
       */
      payment.razorpayRefundId =
        refundId;

      /*
       * Refund state must not move backwards.
       * A delayed refund.created event must never
       * turn an already-processed refund back to pending.
       */
      if (
        payment.refundStatus !==
          "processed" &&
        payment.status !==
          "refunded"
      ) {
        payment.refundStatus =
          "pending";

        payment.status =
          "paid";
      }

      await payment.save();

      await RazorpayWebhookEvent.updateOne(
        {
          eventId,
        },
        {
          $set: {
            status:
              "processed",
            processedAt:
              new Date(),
          },
        }
      );

      return NextResponse.json({
        success: true,
        message:
          "Refund creation webhook processed.",
      });
    }

    /*
     * =====================================================
     * REFUND PROCESSED
     * =====================================================
     */

    if (
      eventName ===
      "refund.processed"
    ) {
      webhookStep = "refund.processed";
      const refundEntity =
        event.payload
          ?.refund
          ?.entity;

      const refundId =
        refundEntity?.id;

      const paymentId =
        refundEntity?.payment_id;

      if (!paymentId) {
        throw new Error(
          "PROCESSED_REFUND_PAYMENT_ID_MISSING"
        );
      }

      if (!refundId) {
        throw new Error(
          "PROCESSED_REFUND_ID_MISSING"
        );
      }

      const payment =
        await Payment.findOne({
          razorpayPaymentId:
            paymentId,
        });

      if (!payment) {
        await RazorpayWebhookEvent.updateOne(
          {
            eventId,
          },
          {
            $set: {
              status:
                "processed",
              processedAt:
                new Date(),
            },
          }
        );

        return NextResponse.json({
          success: true,
          message:
            "Webhook acknowledged.",
        });
      }

      payment.razorpayRefundId =
        refundId;

      payment.refundStatus =
        "processed";

      payment.status =
        "refunded";

      await payment.save();

      const booking =
        await Booking.findById(
          payment.bookingId
        );

      if (
        booking
      ) {
        booking.paymentStatus =
          "refunded";

        booking.status =
          "cancelled";

        await booking.save();
      }

      await RazorpayWebhookEvent.updateOne(
        {
          eventId,
        },
        {
          $set: {
            status:
              "processed",
            processedAt:
              new Date(),
          },
        }
      );

      return NextResponse.json({
        success: true,
        message:
          "Refund processed webhook handled.",
      });
    }

    /*
     * =====================================================
     * REFUND FAILED
     * =====================================================
     */

    if (
      eventName ===
      "refund.failed"
    ) {
      webhookStep = "refund.failed";
      const refundEntity =
        event.payload
          ?.refund
          ?.entity;

      const refundId =
        refundEntity?.id;

      const paymentId =
        refundEntity?.payment_id;

      if (!paymentId) {
        throw new Error(
          "FAILED_REFUND_PAYMENT_ID_MISSING"
        );
      }

      if (!refundId) {
        throw new Error(
          "FAILED_REFUND_ID_MISSING"
        );
      }

      const payment =
        await Payment.findOne({
          razorpayPaymentId:
            paymentId,
        });

      if (!payment) {
        await RazorpayWebhookEvent.updateOne(
          {
            eventId,
          },
          {
            $set: {
              status:
                "processed",
              processedAt:
                new Date(),
            },
          }
        );

        return NextResponse.json({
          success: true,
          message:
            "Webhook acknowledged.",
        });
      }

      payment.razorpayRefundId =
        refundId;

      /*
       * A late refund.failed event must not
       * downgrade a refund that is already known
       * to be processed.
       */
      if (
        payment.refundStatus !==
          "processed" &&
        payment.status !==
          "refunded"
      ) {
        payment.refundStatus =
          "failed";

        /*
         * Original payment remains paid.
         */
        payment.status =
          "paid";
      }

      await payment.save();

      await RazorpayWebhookEvent.updateOne(
        {
          eventId,
        },
        {
          $set: {
            status:
              "processed",
            processedAt:
              new Date(),
          },
        }
      );

      return NextResponse.json({
        success: true,
        message:
          "Refund failure webhook handled.",
      });
    }

    /*
     * =====================================================
     * UNHANDLED EVENT
     * =====================================================
     *
     * We acknowledge events we don't currently
     * need, without exposing the event payload.
     */

    await RazorpayWebhookEvent.updateOne(
      {
        eventId,
      },
      {
        $set: {
          status:
            "processed",
          processedAt:
            new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message:
        "Webhook event acknowledged.",
    });
  } catch (
    error
  ) {
    /*
     * Do not log the webhook body, signature,
     * event ID, payment ID or customer data.
     *
     * The step and error message are safe diagnostics
     * and make server-side failures actionable while
     * keeping sensitive webhook data out of logs.
     */

    const errorMessage =
      error instanceof Error
        ? error.message
        : "Unknown webhook processing error.";

    const errorStack =
      error instanceof Error
        ? error.stack
        : undefined;

    console.error(
      "RAZORPAY WEBHOOK PROCESSING FAILED:",
      {
        step: webhookStep,
        message: errorMessage,
        stack: errorStack,
      }
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to process webhook.",
        errorCode:
          `RAZORPAY_WEBHOOK_${webhookStep
            .toUpperCase()
            .replace(/[^A-Z0-9]+/g, "_")}`,
      },
      {
        status: 500,
      }
    );
  }
}