import mongoose, { Document, Model, Schema } from "mongoose";

export type ContactQueryStatus =
  | "new"
  | "in_progress"
  | "resolved"
  | "closed";

export type ContactQueryPriority =
  | "normal"
  | "high"
  | "urgent";

export type ContactQueryMessageSender =
  | "customer"
  | "admin";

export interface IContactQueryMessage {
  sender: ContactQueryMessageSender;
  message: string;
  sentAt: Date;
  adminId?: mongoose.Types.ObjectId | null;
}

export interface IContactQuery extends Document {
  queryId: string;
  name: string;
  email: string;
  mobile?: string;
  subject: string;
  category: string;
  message: string;
  status: ContactQueryStatus;
  priority: ContactQueryPriority;
  messages: IContactQueryMessage[];
  lastRepliedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ContactQueryMessageSchema =
  new Schema<IContactQueryMessage>(
    {
      sender: {
        type: String,
        enum: ["customer", "admin"],
        required: true,
      },

      message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5000,
      },

      sentAt: {
        type: Date,
        required: true,
        default: Date.now,
      },

      adminId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },
    },
    {
      _id: false,
    }
  );

const ContactQuerySchema =
  new Schema<IContactQuery>(
    {
      queryId: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },

      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: 120,
      },

      email: {
        type: String,
        required: true,
        trim: true,
        lowercase: true,
        maxlength: 320,
        index: true,
      },

      mobile: {
        type: String,
        trim: true,
        maxlength: 30,
      },

      subject: {
        type: String,
        required: true,
        trim: true,
        maxlength: 180,
      },

      category: {
        type: String,
        required: true,
        trim: true,
        maxlength: 80,
      },

      message: {
        type: String,
        required: true,
        trim: true,
        maxlength: 5000,
      },

      status: {
        type: String,
        enum: [
          "new",
          "in_progress",
          "resolved",
          "closed",
        ],
        default: "new",
        index: true,
      },

      priority: {
        type: String,
        enum: [
          "normal",
          "high",
          "urgent",
        ],
        default: "normal",
        index: true,
      },

      messages: {
        type: [ContactQueryMessageSchema],
        default: [],
      },

      lastRepliedAt: {
        type: Date,
        default: null,
      },
    },
    {
      timestamps: true,
    }
  );

ContactQuerySchema.index({
  createdAt: -1,
});

ContactQuerySchema.index({
  status: 1,
  createdAt: -1,
});

const ContactQuery: Model<IContactQuery> =
  mongoose.models.ContactQuery ||
  mongoose.model<IContactQuery>(
    "ContactQuery",
    ContactQuerySchema
  );

export default ContactQuery;
