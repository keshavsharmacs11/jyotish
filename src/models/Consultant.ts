import mongoose, {
  Schema,
  Document,
  Model,
} from "mongoose";

export interface IConsultant
  extends Document {
  name: string;
  email: string;
  phone: string;
  specialization: string;

  /*
   * Consultant profile photo.
   *
   * Stored as a compressed base64 data URL.
   */
  photo?: string;

  availableModes: (
    | "video"
    | "voice"
  )[];

  availability: {
    date: string;
    times: string[];
  }[];

  active: boolean;

  createdAt: Date;
  updatedAt: Date;
}

const ConsultantSchema =
  new Schema<IConsultant>(
    {
      /*
       * =========================================
       * BASIC INFORMATION
       * =========================================
       */

      name: {
        type: String,
        required: true,
        trim: true,
      },

      email: {
        type: String,
        required: true,
        lowercase: true,
        trim: true,
      },

      phone: {
        type: String,
        required: true,
        trim: true,
      },

      specialization: {
        type: String,
        required: true,
        trim: true,
      },

      /*
       * =========================================
       * CONSULTANT PHOTO
       * =========================================
       *
       * The frontend compresses the image before
       * sending it to the API.
       *
       * Example:
       *
       * data:image/jpeg;base64,/9j/4AAQ...
       *
       * Optional because a consultant may exist
       * without a photo.
       */

      photo: {
        type: String,
        default: "",
      },

      /*
       * =========================================
       * CONSULTATION MODES
       * =========================================
       */

      availableModes: {
        type: [String],
        enum: [
          "video",
          "voice",
        ],
        default: [
          "video",
          "voice",
        ],
      },

      /*
       * =========================================
       * AVAILABILITY
       * =========================================
       */

      availability: [
        {
          date: {
            type: String,
            required: true,
          },

          times: {
            type: [String],
            default: [],
          },
        },
      ],

      /*
       * =========================================
       * ACTIVE / INACTIVE
       * =========================================
       *
       * We don't permanently delete consultants
       * because historical bookings may refer
       * to them.
       */

      active: {
        type: Boolean,
        default: true,
        index: true,
      },
    },

    {
      timestamps: true,
    }
  );

const Consultant: Model<IConsultant> =
  mongoose.models.Consultant ||
  mongoose.model<IConsultant>(
    "Consultant",
    ConsultantSchema
  );

export default Consultant;