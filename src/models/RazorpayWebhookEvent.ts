import mongoose, {
  Schema,
  Document,
  Model,
} from "mongoose";

/*
 * =========================================================
 * RAZORPAY WEBHOOK EVENT
 * =========================================================
 *
 * Stores the Razorpay webhook event identifier so the same
 * webhook event is not processed more than once.
 *
 * The webhook route currently uses:
 *
 * - eventId
 * - eventName
 * - status
 * - processedAt
 *
 * We intentionally keep the model small because the webhook
 * payload itself is not required for the current processing
 * flow.
 */

export type RazorpayWebhookEventStatus =
  | "processing"
  | "processed";

export interface IRazorpayWebhookEvent
  extends Document {
  eventId: string;
  eventName: string;
  status: RazorpayWebhookEventStatus;
  processedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const RazorpayWebhookEventSchema =
  new Schema<IRazorpayWebhookEvent>(
    {
      /*
       * Razorpay's unique webhook event ID.
       *
       * This MUST be unique because the webhook route
       * uses duplicate-key detection for idempotency.
       */

      eventId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
      },

      /*
       * Example:
       *
       * payment.captured
       * order.paid
       * payment.failed
       * refund.created
       */

      eventName: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },

      /*
       * Processing lifecycle.
       */

      status: {
        type: String,
        required: true,
        enum: [
          "processing",
          "processed",
        ],
        default: "processing",
        index: true,
      },

      /*
       * Set when the webhook has been successfully
       * handled.
       */

      processedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

/*
 * =========================================================
 * MODEL
 * =========================================================
 *
 * Prevent model recompilation errors in Next.js development
 * and Turbopack hot reload.
 */

const RazorpayWebhookEvent =
  (mongoose.models
    .RazorpayWebhookEvent as Model<IRazorpayWebhookEvent>) ||
  mongoose.model<IRazorpayWebhookEvent>(
    "RazorpayWebhookEvent",
    RazorpayWebhookEventSchema
  );

export default RazorpayWebhookEvent;