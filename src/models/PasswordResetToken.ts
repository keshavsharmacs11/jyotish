import mongoose, {
  Schema,
  Document,
  Model,
} from "mongoose";

export interface IPasswordResetToken
  extends Document {
  userId: mongoose.Types.ObjectId;
  tokenHash: string;
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
}

const PasswordResetTokenSchema =
  new Schema<IPasswordResetToken>(
    {
      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      tokenHash: {
        type: String,
        required: true,
        unique: true,
      },

      expiresAt: {
        type: Date,
        required: true,
      },

      used: {
        type: Boolean,
        default: false,
      },
    },
    {
      timestamps: {
        createdAt: true,
        updatedAt: false,
      },
    }
  );

/*
 * Automatically remove expired reset tokens.
 *
 * This is intentionally the only index definition
 * for expiresAt. The TTL index both indexes the field
 * and removes documents once expiresAt is reached.
 */
PasswordResetTokenSchema.index(
  { expiresAt: 1 },
  {
    expireAfterSeconds: 0,
  }
);

const PasswordResetToken: Model<IPasswordResetToken> =
  mongoose.models.PasswordResetToken ||
  mongoose.model<IPasswordResetToken>(
    "PasswordResetToken",
    PasswordResetTokenSchema
  );

export default PasswordResetToken;