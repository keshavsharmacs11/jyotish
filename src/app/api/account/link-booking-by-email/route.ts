import { NextRequest, NextResponse } from "next/server";

import { connectMongoose } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import User from "@/models/User";

/*
 * =========================================================
 * POST /api/account/link-booking-by-email
 * =========================================================
 *
 * This endpoint is intentionally used only AFTER successful payment.
 *
 * Guest booking flow:
 *   paid booking + email
 *        ↓
 *   find existing customer account
 *        ↓
 *   existing account -> connect booking.userId
 *   new email         -> leave booking unlinked for account creation
 *
 * This endpoint NEVER creates an account and NEVER creates a customer
 * session. The existing account-creation flow remains responsible for
 * creating a new account and connecting a new customer to the booking.
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const bookingId = String(
      body?.bookingId || ""
    )
      .trim()
      .slice(0, 100);

    const email = String(
      body?.email || ""
    )
      .trim()
      .toLowerCase()
      .slice(0, 320);

    if (!bookingId || !email) {
      return NextResponse.json(
        {
          success: false,
          error: "Booking ID and email are required.",
        },
        { status: 400 }
      );
    }

    await connectMongoose();

    const booking = await Booking.findOne({
      bookingId,
    });

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          error: "Booking could not be found.",
        },
        { status: 404 }
      );
    }

    /*
     * Only a successfully paid booking can be connected through this
     * post-payment guest flow.
     */
    if (booking.paymentStatus !== "paid") {
      return NextResponse.json(
        {
          success: false,
          error: "This booking has not been successfully paid.",
        },
        { status: 400 }
      );
    }

    const bookingEmail = String(
      booking.customer?.email || ""
    )
      .trim()
      .toLowerCase();

    if (!bookingEmail || bookingEmail !== email) {
      return NextResponse.json(
        {
          success: false,
          error: "The email does not match the booking email.",
        },
        { status: 403 }
      );
    }

    /*
     * If the booking is already connected, preserve that ownership.
     */
    if (booking.userId) {
      const linkedUser = await User.findOne({
        _id: booking.userId,
        role: "customer",
      })
        .select("_id email")
        .lean();

      if (
        linkedUser &&
        String(linkedUser.email || "")
          .trim()
          .toLowerCase() === email
      ) {
        return NextResponse.json({
          success: true,
          accountExists: true,
          linked: true,
        });
      }

      return NextResponse.json(
        {
          success: false,
          error: "This booking is already connected to another customer account.",
        },
        { status: 409 }
      );
    }

    /*
     * Find the existing customer account by the exact normalized booking
     * email. We return only the boolean needed by the booking UI.
     */
    const existingUser = await User.findOne({
      email,
      role: "customer",
    })
      .select("_id")
      .lean();

    if (!existingUser) {
      return NextResponse.json({
        success: true,
        accountExists: false,
        linked: false,
      });
    }

    booking.userId = existingUser._id;
    await booking.save();

    return NextResponse.json({
      success: true,
      accountExists: true,
      linked: true,
    });
  } catch (error) {
    console.error(
      "POST-PAYMENT BOOKING ACCOUNT LINK ERROR:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to connect the booking to the customer account.",
      },
      { status: 500 }
    );
  }
}
