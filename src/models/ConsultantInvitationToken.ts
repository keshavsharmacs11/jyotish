import mongoose, {
  Schema,
  Document,
  Model,
} from "mongoose";

export interface IConsultantInvitationToken
  extends Document {
  email: string;
  name: string;
  tokenHash: string;
  expiresAt: Date;
  used: boolean;
  invitedBy: mongoose.Types.ObjectId;
  completedConsultantId?: mongoose.Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
}

const ConsultantInvitationTokenSchema =
  new Schema<IConsultantInvitationToken>(
    {
      email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
      },
      name: {
        type: String,
        required: true,
        trim: true,
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
        index: true,
      },
      invitedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
      completedConsultantId: {
        type: Schema.Types.ObjectId,
        ref: "Consultant",
        default: null,
      },
    },
    {
      timestamps: true,
    },
  );

ConsultantInvitationTokenSchema.index({
  email: 1,
  used: 1,
});

ConsultantInvitationTokenSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 },
);

const ConsultantInvitationToken: Model<IConsultantInvitationToken> =
  mongoose.models.ConsultantInvitationToken ||
  mongoose.model<IConsultantInvitationToken>(
    "ConsultantInvitationToken",
    ConsultantInvitationTokenSchema,
  );

export default ConsultantInvitationToken;
