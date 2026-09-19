import mongoose, {
  Schema,
  Document,
  Model,
} from "mongoose";

export type UserRole =
  | "customer"
  | "admin";

export interface IUser extends Document {
  name: string;
  email: string;
  phone?: string;
  passwordHash: string;
  role: UserRole;
  isSuperAdmin?: boolean;
  active?: boolean;
  /** True only for admins who completed an administrator invitation. */
  consultantProfileEligible?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema =
  new Schema<IUser>(
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
      },

      phone: {
        type: String,
        default: "",
        trim: true,
      },

      /*
       * We NEVER store the actual password.
       * Only the hashed password will be stored.
       */
      passwordHash: {
        type: String,
        required: true,
      },

      /*
       * Customers and Admins use the same
       * collection but have different roles.
       */
      role: {
        type: String,
        enum: ["customer", "admin"],
        default: "customer",
      },

      /*
       * Identifies accounts with Super Administrator
       * privileges when explicitly enabled.
       */
      isSuperAdmin: {
        type: Boolean,
        default: false,
      },

      /*
       * Controls whether an account is currently
       * allowed to access the system.
       *
       * Existing accounts without this field are
       * treated as active by the authentication logic.
       */
      active: {
        type: Boolean,
        default: true,
      },

      /**
       * Only administrator accounts activated through the
       * administrator invitation flow can create their own
       * linked consultant profile.
       *
       * Existing/manual admin accounts remain false unless
       * explicitly migrated server-side.
       */
      consultantProfileEligible: {
        type: Boolean,
        default: false,
      },
    },
    {
      timestamps: true,
    }
  );

const User: Model<IUser> =
  mongoose.models.User ||
  mongoose.model<IUser>(
    "User",
    UserSchema
  );

export default User;