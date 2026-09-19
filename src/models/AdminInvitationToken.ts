import mongoose, {
  Schema,
  Document,
  Model,
} from "mongoose";

export interface IAdminInvitationToken
  extends Document {
  email: string;
  name: string;
  tokenHash: string;
  expiresAt: Date;
  used: boolean;
  invitedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const AdminInvitationTokenSchema =
  new Schema<IAdminInvitationToken>(
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
      },
      invitedBy: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    },
    {
      timestamps: {
        createdAt: true,
        updatedAt: false,
      },
    }
  );

AdminInvitationTokenSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

const AdminInvitationToken: Model<IAdminInvitationToken> =
  mongoose.models.AdminInvitationToken ||
  mongoose.model<IAdminInvitationToken>(
    "AdminInvitationToken",
    AdminInvitationTokenSchema
  );

export default AdminInvitationToken;
