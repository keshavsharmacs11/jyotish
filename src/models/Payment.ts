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

  /*
   * ============================================
   * BOOKING EMAIL DELIVERY
   * ============================================
   */

  customerConfirmationEmailSentAt?: Date | null;

  adminBookingEmailSentAt?: Date | null;

  /*
   * ============================================
   * REFUND EMAIL DELIVERY
   * ============================================
   *
   * Stores when the customer refund email was
   * successfully accepted by Resend.
   *
   * This prevents duplicate refund emails when
   * the admin endpoint is called again.
   */

  customerRefundEmailSentAt?: Date | null;

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

      /*
       * ==========================================
       * CUSTOMER BOOKING CONFIRMATION EMAIL
       * ==========================================
       */

      customerConfirmationEmailSentAt: {
        type: Date,
        default: null,
      },

      /*
       * ==========================================
       * ADMIN BOOKING EMAIL
       * ==========================================
       */

      adminBookingEmailSentAt: {
        type: Date,
        default: null,
      },

      /*
       * ==========================================
       * CUSTOMER REFUND EMAIL
       * ==========================================
       */

      customerRefundEmailSentAt: {
        type: Date,
        default: null,
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