import mongoose, {
  Schema,
  Document,
  Model,
} from "mongoose";

/*
 * =========================================================
 * BOOKING STATUS
 * =========================================================
 */

export type BookingStatus =
  | "payment_pending"
  | "paid"
  | "confirmed"
  | "consultant_assigned"
  | "completed"
  | "cancelled";

/*
 * =========================================================
 * PAYMENT STATUS
 * =========================================================
 */

export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded";

/*
 * =========================================================
 * BOOKING MODE
 * =========================================================
 */

export type BookingMode =
  | "video"
  | "voice";

/*
 * =========================================================
 * BOOKING INTERFACE
 * =========================================================
 */

export interface IBooking
  extends Document {
  bookingId: string;

  userId?: mongoose.Types.ObjectId | null;

  /*
   * SERVICE
   */

  serviceId: string;

  serviceName: string;
  category: string;

  /*
   * CONSULTATION
   */

  mode: BookingMode;

  date: string;
  time: string;

  /*
   * CONSULTANT
   */

  consultantId?: mongoose.Types.ObjectId | null;
  consultantName?: string;

  /*
   * CUSTOMER
   */

  customer: {
    fullName: string;

    dob?: string;
    birthTime?: string;
    birthPlace?: string;
    gender?: string;

    mobile: string;
    email: string;

    concern?: string;
    language?: string;

    currentName?: string;

    person2Name?: string;
    person2Dob?: string;
    person2BirthTime?: string;
    person2BirthPlace?: string;

    tarotQuestion?: string;
  };

  /*
   * PRICE SNAPSHOT
   */

  price: number;

  currency: string;

  /*
   * BOOKING STATUS
   */

  status: BookingStatus;

  /*
   * PAYMENT STATUS
   */

  paymentStatus: PaymentStatus;

  /*
   * REFUND
   */

  refundReason?: string;

  /*
   * RAZORPAY
   */

  razorpayOrderId?: string;
  razorpayPaymentId?: string;

  /*
   * TIMESTAMPS
   */

  createdAt: Date;
  updatedAt: Date;
}

/*
 * =========================================================
 * BOOKING SCHEMA
 * =========================================================
 */

const BookingSchema =
  new Schema<IBooking>(
    {
      /*
       * =========================================
       * BOOKING ID
       * =========================================
       */

      bookingId: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },

      /*
       * =========================================
       * USER
       * =========================================
       */

      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
        index: true,
      },

      /*
       * =========================================
       * SERVICE
       * =========================================
       */

      serviceId: {
        type: String,
        required: true,
        index: true,
      },

      serviceName: {
        type: String,
        required: true,
      },

      category: {
        type: String,
        required: true,
      },

      /*
       * =========================================
       * CONSULTATION
       * =========================================
       */

      mode: {
        type: String,
        enum: [
          "video",
          "voice",
        ],
        required: true,
      },

      date: {
        type: String,
        required: true,
      },

      time: {
        type: String,
        required: true,
      },

      /*
       * =========================================
       * CONSULTANT
       * =========================================
       */

      consultantId: {
        type: Schema.Types.ObjectId,
        ref: "Consultant",
        default: null,
      },

      consultantName: {
        type: String,
        default: "To be assigned",
      },

      /*
       * =========================================
       * CUSTOMER
       * =========================================
       */

      customer: {
        fullName: {
          type: String,
          required: true,
        },

        dob: {
          type: String,
          default: "",
        },

        birthTime: {
          type: String,
          default: "",
        },

        birthPlace: {
          type: String,
          default: "",
        },

        gender: {
          type: String,
          default: "",
        },

        mobile: {
          type: String,
          required: true,
        },

        email: {
          type: String,
          required: true,
          lowercase: true,
        },

        concern: {
          type: String,
          default: "",
        },

        language: {
          type: String,
          default: "",
        },

        currentName: {
          type: String,
          default: "",
        },

        person2Name: {
          type: String,
          default: "",
        },

        person2Dob: {
          type: String,
          default: "",
        },

        person2BirthTime: {
          type: String,
          default: "",
        },

        person2BirthPlace: {
          type: String,
          default: "",
        },

        tarotQuestion: {
          type: String,
          default: "",
        },
      },

      /*
       * =========================================
       * PRICE SNAPSHOT
       * =========================================
       */

      price: {
        type: Number,
        required: true,
        min: 0,
      },

      currency: {
        type: String,
        default: "INR",
      },

      /*
       * =========================================
       * BOOKING STATUS
       * =========================================
       */

      status: {
        type: String,
        enum: [
          "payment_pending",
          "paid",
          "confirmed",
          "consultant_assigned",
          "completed",
          "cancelled",
        ],
        default: "payment_pending",
        index: true,
      },

      /*
       * =========================================
       * PAYMENT STATUS
       * =========================================
       */

      paymentStatus: {
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
       * =========================================
       * REFUND REASON
       * =========================================
       *
       * Stores the reason provided by the
       * administrator when cancelling/refunding
       * a paid booking.
       */

      refundReason: {
        type: String,
        default: "",
      },

      /*
       * =========================================
       * RAZORPAY
       * =========================================
       */

      razorpayOrderId: {
        type: String,
        default: "",
        index: true,
      },

      razorpayPaymentId: {
        type: String,
        default: "",
        index: true,
      },
    },

    /*
     * =========================================
     * SCHEMA OPTIONS
     * =========================================
     */

    {
      timestamps: true,
    }
  );

/*
 * =========================================================
 * PREVENT DOUBLE BOOKING
 * =========================================================
 *
 * A consultant/date/time combination becomes unique
 * ONLY when paymentStatus is "paid".
 *
 * Therefore:
 *
 * payment_pending
 *      -> does NOT block the slot
 *
 * paid
 *      -> blocks the slot
 *
 * confirmed
 *      -> blocks the slot
 *
 * consultant_assigned
 *      -> blocks the slot
 *
 * completed
 *      -> blocks the slot
 *
 * refunded
 *      -> releases the slot because paymentStatus
 *         becomes "refunded"
 *
 * cancelled unpaid
 *      -> does NOT block the slot
 *
 * This protects against two customers successfully
 * paying for the exact same consultant/time slot.
 * =========================================================
 */

BookingSchema.index(
  {
    consultantId: 1,
    date: 1,
    time: 1,
  },
  {
    unique: true,

    partialFilterExpression: {
      consultantId: {
        $exists: true,
      },

      paymentStatus: "paid",

      status: {
        $in: [
          "paid",
          "confirmed",
          "consultant_assigned",
        ],
      },
    },

    name:
      "unique_active_paid_consultant_time_slot",
  }
);

/*
 * =========================================================
 * MODEL
 * =========================================================
 *
 * Prevent model recompilation during Next.js development
 * and hot reload.
 * =========================================================
 */

const Booking: Model<IBooking> =
  mongoose.models.Booking ||
  mongoose.model<IBooking>(
    "Booking",
    BookingSchema
  );

export default Booking;