import mongoose, {
  Schema,
  Document,
  Model,
} from "mongoose";

export interface IGuestBookingAccess
  extends Document {
  bookingId: mongoose.Types.ObjectId;
  bookingReference: string;
  email: string;
  otpHash: string;
  otpExpiresAt: Date;
  attempts: number;
  lastSentAt: Date;
  accessTokenHash?: string | null;
  accessTokenExpiresAt?: Date | null;
  verifiedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const GuestBookingAccessSchema =
  new Schema<IGuestBookingAccess>(
    {
      bookingId: {
        type: Schema.Types.ObjectId,
        ref: "Booking",
        required: true,
        index: true,
      },

      bookingReference: {
        type: String,
        required: true,
        trim: true,
        index: true,
      },

      email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
        index: true,
      },

      otpHash: {
        type: String,
        required: true,
      },

      otpExpiresAt: {
      type: Date,
      },

      attempts: {
        type: Number,
        required: true,
        default: 0,
        min: 0,
      },

      lastSentAt: {
        type: Date,
        required: true,
      },

      accessTokenHash: {
        type: String,
        default: null,
        index: true,
      },

      accessTokenExpiresAt: {
        type: Date,
        default: null,
      },

      verifiedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

GuestBookingAccessSchema.index(
  {
    bookingId: 1,
    email: 1,
  },
  {
    unique: true,
    name: "unique_guest_booking_access",
  }
);

GuestBookingAccessSchema.index(
  {
    otpExpiresAt: 1,
  },
  {
    expireAfterSeconds: 24 * 60 * 60,
  }
);

const GuestBookingAccess: Model<IGuestBookingAccess> =
  mongoose.models.GuestBookingAccess ||
  mongoose.model<IGuestBookingAccess>(
    "GuestBookingAccess",
    GuestBookingAccessSchema
  );

export default GuestBookingAccess;
