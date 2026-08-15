import {
  NextResponse,
} from "next/server";

import {
  connectMongoose,
} from "@/lib/mongodb";

import Booking from "@/models/Booking";

import {
  getCustomerId,
} from "@/lib/customerAuth";

export async function GET() {
  try {
    /*
     * ============================================
     * GET LOGGED-IN CUSTOMER
     * ============================================
     */

    const userId =
      await getCustomerId();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You are not logged in.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * ============================================
     * DATABASE
     * ============================================
     */

    await connectMongoose();

    /*
     * ============================================
     * FIND CUSTOMER BOOKINGS
     * ============================================
     */

    const bookings =
      await Booking.find({
        userId,
      })
        .sort({
          createdAt: -1,
        })
        .lean();

    /*
     * ============================================
     * SUCCESS
     * ============================================
     */

    return NextResponse.json({
      success: true,

      count:
        bookings.length,

      bookings,
    });
  } catch (error) {
    console.error(
      "MY BOOKINGS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to fetch your bookings.",
      },
      {
        status: 500,
      }
    );
  }
}