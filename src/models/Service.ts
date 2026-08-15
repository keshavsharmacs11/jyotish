import mongoose, {
  Schema,
  Document,
  Model,
} from "mongoose";

export interface IService extends Document {
  serviceId: string;
  name: string;
  category: string;
  description?: string;
  duration?: number | null;
  price: number;
  currency: string;
  consultantIds: string[];
  availableModes: ("video" | "voice")[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceSchema =
  new Schema<IService>(
    {
      /*
       * This keeps the same stable IDs
       * currently used by services.ts.
       *
       * Example:
       * basic-astrology
       * detailed-kundali
       */
      serviceId: {
        type: String,
        required: true,
        unique: true,
        index: true,
        trim: true,
      },

      name: {
        type: String,
        required: true,
        trim: true,
      },

      category: {
        type: String,
        required: true,
        trim: true,
      },

      description: {
        type: String,
        default: "",
      },

      duration: {
        type: Number,
        default: null,
      },

      /*
       * Admin-controlled price.
       *
       * Current testing price = ₹2000.
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

      consultantIds: {
        type: [String],
        default: [],
      },

      availableModes: {
        type: [String],
        enum: ["video", "voice"],
        default: ["video", "voice"],
      },

      active: {
        type: Boolean,
        default: true,
      },
    },
    {
      timestamps: true,
    }
  );

const Service: Model<IService> =
  mongoose.models.Service ||
  mongoose.model<IService>(
    "Service",
    ServiceSchema
  );

export default Service;