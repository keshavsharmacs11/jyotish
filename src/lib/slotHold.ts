import mongoose from "mongoose";

import { connectMongoose } from "@/lib/mongodb";
import SlotHold from "@/models/SlotHold";

export const SLOT_HOLD_MINUTES = 15;

export function getSlotKey(
  consultantId: string,
  date: string,
  time: string
) {
  return `${consultantId}|${date}|${time}`;
}

export async function acquireSlotHold(
  {
    bookingId,
    consultantId,
    date,
    time,
  }: {
    bookingId: string;
    consultantId:
      | string
      | mongoose.Types.ObjectId;
    date: string;
    time: string;
  }
) {
  await connectMongoose();

  const consultantIdString =
    consultantId.toString();

  const slotKey =
    getSlotKey(
      consultantIdString,
      date,
      time
    );

  const now = new Date();

  const expiresAt =
    new Date(
      now.getTime() +
        SLOT_HOLD_MINUTES *
          60 *
          1000
    );

  try {
    const hold =
      await SlotHold.findOneAndUpdate(
        {
          _id: slotKey,

          /*
           * We may claim the slot when:
           *
           * 1. no active hold exists
           * 2. the existing hold has expired
           * 3. this same booking already owns it
           */

          $or: [
            {
              expiresAt: {
                $lte: now,
              },
            },
            {
              bookingId,
            },
          ],
        },

        {
          $set: {
            bookingId,

            consultantId:
              consultantId,

            date,

            time,

            expiresAt,
          },
        },

        {
          upsert: true,

          /*
           * Mongoose 9:
           * return the updated document.
           */

          returnDocument: "after",

          setDefaultsOnInsert:
            true,
        }
      );

    if (
      !hold ||
      hold.bookingId !==
        bookingId
    ) {
      return {
        success: false,
        reason:
          "SLOT_UNAVAILABLE",
      };
    }

    return {
      success: true,

      expiresAt:
        hold.expiresAt,
    };
  } catch (error: any) {
    /*
     * Two customers can reach this exact
     * operation simultaneously.
     *
     * MongoDB's unique _id prevents both
     * from winning.
     */

    if (
      error?.code === 11000
    ) {
      return {
        success: false,

        reason:
          "SLOT_UNAVAILABLE",
      };
    }

    throw error;
  }
}

export async function releaseSlotHold(
  {
    consultantId,
    date,
    time,
    bookingId,
  }: {
    consultantId:
      | string
      | mongoose.Types.ObjectId;
    date: string;
    time: string;
    bookingId: string;
  }
) {
  await connectMongoose();

  const slotKey =
    getSlotKey(
      consultantId.toString(),
      date,
      time
    );

  await SlotHold.deleteOne({
    _id: slotKey,
    bookingId,
  });
}