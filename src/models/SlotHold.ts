import mongoose, {
  Schema,
  Document,
  Model,
} from "mongoose";

export interface ISlotHold
  extends Document {
  _id: string;

  bookingId: string;

  consultantId: mongoose.Types.ObjectId;

  date: string;

  time: string;

  expiresAt: Date;

  createdAt: Date;

  updatedAt: Date;
}

const SlotHoldSchema =
  new Schema<ISlotHold>(
    {
      /*
       * Slot key:
       *
       * consultantId|date|time
       *
       * This is the unique identity
       * of the slot.
       */

      _id: {
        type: String,
        required: true,
      },

      bookingId: {
        type: String,
        required: true,
        index: true,
      },

      consultantId: {
        type: Schema.Types.ObjectId,
        ref: "Consultant",
        required: true,
        index: true,
      },

      date: {
        type: String,
        required: true,
      },

      time: {
        type: String,
        required: true,
      },

      /*
       * MongoDB TTL automatically removes
       * expired holds.
       *
       * IMPORTANT:
       * Do not use index: true here because
       * the TTL index is declared separately
       * below.
       */

      expiresAt: {
        type: Date,
        required: true,
      },
    },
    {
      timestamps: true,
    }
  );

/*
 * Automatically delete the hold once
 * expiresAt is reached.
 *
 * MongoDB's TTL monitor may take a little
 * time to physically remove the document,
 * so application availability checks must
 * ALSO check expiresAt.
 */

SlotHoldSchema.index(
  {
    expiresAt: 1,
  },
  {
    expireAfterSeconds: 0,
  }
);

const SlotHold: Model<ISlotHold> =
  mongoose.models.SlotHold ||
  mongoose.model<ISlotHold>(
    "SlotHold",
    SlotHoldSchema
  );

export default SlotHold;