import mongoose, {
  Schema,
  Document,
  Model,
} from "mongoose";

export type BookingStatus =
  | "payment_pending"
  | "paid"
  | "confirmed"
  | "consultant_assigned"
  | "completed"
  | "cancelled";

export type PaymentStatus =
  | "pending"
  | "paid"
  | "failed"
  | "refunded";

export type BookingMode =
  | "video"
  | "voice";

export interface IBooking
  extends Document {
  bookingId: string;

  userId?: mongoose.Types.ObjectId | null;

  serviceId: string;

  serviceName: string;
  category: string;

  mode: BookingMode;

  date: string;
  time: string;

  consultantId?: mongoose.Types.ObjectId | null;
  consultantName?: string;

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

  price: number;

  currency: string;

  status: BookingStatus;

  paymentStatus: PaymentStatus;

  razorpayOrderId?: string;
  razorpayPaymentId?: string;

  createdAt: Date;
  updatedAt: Date;
}

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
        enum: ["video", "voice"],
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
 * Stores why the business cancelled the
 * booking and initiated a refund.
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
 * ONLY after the booking has been successfully paid.
 *
 * Therefore:
 *
 * payment_pending → does not block slot
 * paid            → blocks slot
 * confirmed       → blocks slot
 * consultant_assigned → blocks slot
 * completed       → blocks slot
 * refunded        → releases slot
 *
 * This protects against two customers successfully
 * paying for the exact same consultant/time slot.
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
      paymentStatus: "paid",
      consultantId: {
        $exists: true,
      },
    },

    name:
      "unique_paid_consultant_time_slot",
  }
);

const Booking: Model<IBooking> =
  mongoose.models.Booking ||
  mongoose.model<IBooking>(
    "Booking",
    BookingSchema
  );

export default Booking;