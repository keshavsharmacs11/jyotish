import mongoose, {
  Schema,
  Document,
  Model,
} from "mongoose";

export interface ICustomerSession
  extends Document {
  sessionHash: string;
  userId: mongoose.Types.ObjectId;
  expiresAt: Date;
  createdAt: Date;
  lastUsedAt?: Date;
  revokedAt?: Date | null;
}

const CustomerSessionSchema =
  new Schema<ICustomerSession>(
    {
      /*
       * Hash of the opaque customer session
       * secret. The raw session secret is
       * never stored in MongoDB.
       */

      sessionHash: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },

      /*
       * Customer who owns this session.
       */

      userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true,
      },

      /*
       * Session expiration time.
       *
       * IMPORTANT:
       * Do not add index: true here because
       * the TTL index is declared separately
       * below.
       */

      expiresAt: {
        type: Date,
        required: true,
      },

      /*
       * Last time this session was successfully
       * used for authentication.
       */

      lastUsedAt: {
        type: Date,
      },

      /*
       * Set when this individual session is
       * explicitly revoked, such as logout.
       */

      revokedAt: {
        type: Date,
        default: null,
        index: true,
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
 * Automatically remove expired sessions.
 *
 * MongoDB's TTL monitor may take a little time
 * to physically remove the document, so the
 * authentication code also checks expiresAt.
 */

CustomerSessionSchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds: 0,
  }
);

const CustomerSession: Model<ICustomerSession> =
  mongoose.models.CustomerSession ||
  mongoose.model<ICustomerSession>(
    "CustomerSession",
    CustomerSessionSchema
  );

export default CustomerSession;