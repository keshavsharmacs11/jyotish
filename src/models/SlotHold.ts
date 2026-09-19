import mongoose, {
  Schema,
  Model,
} from "mongoose";

export interface ISlotHold {
  /**
   * Slot key:
   * consultantId|date|time
   *
   * The slot key is intentionally a string because
   * this document uses the slot itself as its MongoDB _id.
   */
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
       * MongoDB's _id is unique automatically, so
       * simultaneous attempts to acquire the exact
       * same slot cannot both create a hold.
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
       * MongoDB TTL automatically removes expired
       * holds after expiresAt is reached.
       *
       * IMPORTANT:
       * Do not add index: true here because the TTL
       * index is declared separately below.
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
 * Automatically remove expired holds.
 *
 * The MongoDB TTL monitor is asynchronous, so the
 * application-level acquire/read logic must still
 * evaluate expiresAt instead of relying only on the
 * physical deletion of the document.
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
