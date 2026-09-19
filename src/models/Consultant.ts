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

  availabilityWindows: {
    date: string;
    startTime: string;
    endTime: string;
  }[];

  active: boolean;

  /**
   * When present, this profile belongs to the administrator
   * who created it for their own consultations. Consultant-only
   * invited profiles keep this field null.
   */
  administratorId?: mongoose.Types.ObjectId | null;

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
       * AVAILABILITY WINDOWS
       * =========================================
       *
       * Calendar-managed availability windows.
       * The legacy availability field is retained
       * for backward compatibility.
       */

      availabilityWindows: [
        {
          date: {
            type: String,
            required: true,
          },

          startTime: {
            type: String,
            required: true,
          },

          endTime: {
            type: String,
            required: true,
          },
        },
      ],

      /*
       * =========================================
       * ACTIVE / INACTIVE
       * =========================================
       *
       * Normal removal is a soft revoke so historical
       * bookings remain intact. Permanent deletion is
       * handled by the protected admin API only when
       * no historical booking references the consultant.
       */

      active: {
        type: Boolean,
        default: true,
        index: true,
      },

      /**
       * One-to-one link to an administrator account when this
       * is that administrator's own consultant profile.
       * Sparse uniqueness allows consultant-only profiles to
       * leave the field empty/null.
       */
      administratorId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        unique: true,
        sparse: true,
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