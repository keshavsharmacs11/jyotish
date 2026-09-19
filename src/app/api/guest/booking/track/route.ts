import {
  NextRequest,
  NextResponse,
} from "next/server";
import crypto from "crypto";

import {
  connectMongoose,
} from "@/lib/mongodb";
import Booking from "@/models/Booking";
import GuestBookingAccess from "@/models/GuestBookingAccess";
import Service from "@/models/Service";

const ACCESS_COOKIE_NAME =
  "guest_booking_access";

function hashAccessToken(
  token: string
) {
  const secret =
    process.env.CUSTOMER_SESSION_SECRET;

  if (!secret) {
    throw new Error(
      "CUSTOMER_SESSION_SECRET is not configured."
    );
  }

  return crypto
    .createHash("sha256")
    .update(
      `${token}:${secret}`
    )
    .digest("hex");
}

export async function GET(
  request: NextRequest
) {
  try {
    const token =
      request.cookies.get(
        ACCESS_COOKIE_NAME
      )?.value;

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Booking verification is required.",
        },
        { status: 401 }
      );
    }

    await connectMongoose();

    const access =
      await GuestBookingAccess.findOne({
        accessTokenHash:
          hashAccessToken(token),
        accessTokenExpiresAt: {
          $gt: new Date(),
        },
        verifiedAt: {
          $ne: null,
        },
      }).lean();

    if (!access) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Booking verification has expired. Please verify again.",
        },
        { status: 401 }
      );
    }

    const booking =
      await Booking.findById(
        access.bookingId
      ).lean();

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Booking could not be found.",
        },
        { status: 404 }
      );
    }

    const service =
      await Service.findOne({
        serviceId:
          booking.serviceId,
      })
        .select(
          "duration"
        )
        .lean();

    const duration =
      service &&
      typeof service.duration ===
        "number" &&
      service.duration > 0
        ? service.duration
        : 15;

    const [hour, minute] =
      booking.time
        .split(":")
        .map(Number);

    const startMinutes =
      hour * 60 + minute;

    const endMinutes =
      Math.min(
        1439,
        startMinutes +
          duration
      );

    const formatTime = (
      totalMinutes: number
    ) => {
      const h = Math.floor(
        totalMinutes / 60
      );
      const m =
        totalMinutes % 60;

      return `${String(h).padStart(
        2,
        "0"
      )}:${String(m).padStart(
        2,
        "0"
      )}`;
    };

    return NextResponse.json({
      success: true,
      booking: {
        bookingId:
          booking.bookingId,
        serviceName:
          booking.serviceName,
        category:
          booking.category,
        consultantName:
          booking.consultantName,
        date:
          booking.date,
        time:
          booking.time,
        endTime:
          formatTime(
            endMinutes
          ),
        duration,
        mode:
          booking.mode,
        price:
          booking.price,
        currency:
          booking.currency,
        status:
          booking.status,
        paymentStatus:
          booking.paymentStatus,
        refundReason:
          booking.refundReason ||
          "",
      },
    });
  } catch (error) {
    console.error(
      "GUEST BOOKING TRACK ERROR:",
      error instanceof Error
        ? error.message
        : error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to load the booking.",
      },
      { status: 500 }
    );
  }
}
