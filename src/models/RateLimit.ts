import mongoose, {
  Schema,
  Document,
  Model,
} from "mongoose";

export interface IRateLimit
  extends Document {
  key: string;
  count: number;
  windowStart: Date;
  expiresAt: Date;
}

const RateLimitSchema =
  new Schema<IRateLimit>(
    {
      key: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },

      count: {
        type: Number,
        required: true,
        default: 0,
      },

      windowStart: {
        type: Date,
        required: true,
      },

      expiresAt: {
        type: Date,
        required: true,
      },
    },
    {
      timestamps: true,
    }
  );

/*
 * Automatically remove expired
 * rate-limit records.
 */
RateLimitSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

const RateLimit: Model<IRateLimit> =
  mongoose.models.RateLimit ||
  mongoose.model<IRateLimit>(
    "RateLimit",
    RateLimitSchema
  );

export default RateLimit;