import { NextRequest, NextResponse } from "next/server";

import { connectMongoose } from "@/lib/mongodb";
import Booking from "@/models/Booking";

export async function GET(request: NextRequest) {
  try {
    const bookingId =
      request.nextUrl.searchParams.get("bookingId")?.trim() || "";

    if (!bookingId) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking ID is required.",
        },
        { status: 400 }
      );
    }

    if (bookingId.length > 80) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid Booking ID.",
        },
        { status: 400 }
      );
    }

    await connectMongoose();

    const booking = await Booking.findOne({
      bookingId,
    })
      .select("bookingId serviceName")
      .lean();

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          message: "Booking ID not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      booking: {
        bookingId: booking.bookingId,
        serviceName: booking.serviceName || "",
      },
    });
  } catch (error) {
    console.error("CONTACT BOOKING LOOKUP ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to verify the Booking ID right now.",
      },
      { status: 500 }
    );
  }
}