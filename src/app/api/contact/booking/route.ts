import { NextRequest, NextResponse } from "next/server";

import { connectMongoose } from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/requestSecurity";

const BOOKING_ID_PATTERN = /^AKJ-\d{4}-\d{6}$/i;

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit({
      key: `contact-booking-lookup:${getClientIp(request)}`,
      limit: 20,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: "Too many booking lookups. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    const bookingId =
      request.nextUrl.searchParams
        .get("bookingId")
        ?.trim() || "";

    if (!BOOKING_ID_PATTERN.test(bookingId)) {
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
