import mongoose, {
  Schema,
  Document,
  Model,
} from "mongoose";

export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded";

export type RefundStatus =
  | "none"
  | "pending"
  | "processed"
  | "failed";

export interface IPayment extends Document {
  bookingId: mongoose.Types.ObjectId;

  razorpayOrderId: string;
  razorpayPaymentId?: string;

  amount: number;
  currency: string;

  status: PaymentStatus;

  /*
   * ============================================
   * REFUND INFORMATION
   * ============================================
   */

  refundStatus: RefundStatus;

  razorpayRefundId?: string;

  refundReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema =
  new Schema<IPayment>(
    {
      /*
       * ==========================================
       * BOOKING
       * ==========================================
       */

      bookingId: {
        type: Schema.Types.ObjectId,
        ref: "Booking",
        required: true,
        index: true,
      },

      /*
       * ==========================================
       * RAZORPAY ORDER
       * ==========================================
       */

      razorpayOrderId: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },

      /*
       * ==========================================
       * RAZORPAY PAYMENT
       * ==========================================
       */

      razorpayPaymentId: {
        type: String,
        default: "",
        index: true,
      },

      /*
       * ==========================================
       * AMOUNT
       * ==========================================
       */

      amount: {
        type: Number,
        required: true,
        min: 0,
      },

      currency: {
        type: String,
        default: "INR",
      },

      /*
       * ==========================================
       * PAYMENT STATUS
       * ==========================================
       */

      status: {
        type: String,
        enum: [
          "pending",
          "paid",
          "failed",
          "refunded",
        ],
        default: "pending",
        index: true,
      },

      /*
       * ==========================================
       * REFUND STATUS
       * ==========================================
       *
       * none
       *   No refund has been requested.
       *
       * pending
       *   Refund request has been sent.
       *
       * processed
       *   Razorpay refund was successfully created.
       *
       * failed
       *   Refund request failed.
       */

      refundStatus: {
        type: String,
        enum: [
          "none",
          "pending",
          "processed",
          "failed",
        ],
        default: "none",
        index: true,
      },

      /*
       * ==========================================
       * RAZORPAY REFUND ID
       * ==========================================
       */

      razorpayRefundId: {
        type: String,
        default: "",
        index: true,
      },

      /*
       * ==========================================
       * REFUND REASON
       * ==========================================
       */

      refundReason: {
        type: String,
        default: "",
      },
    },
    {
      timestamps: true,
    }
  );

const Payment: Model<IPayment> =
  mongoose.models.Payment ||
  mongoose.model<IPayment>(
    "Payment",
    PaymentSchema
  );

export default Payment;