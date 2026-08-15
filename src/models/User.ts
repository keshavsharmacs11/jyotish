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