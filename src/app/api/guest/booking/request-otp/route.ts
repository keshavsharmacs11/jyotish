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
import {
  checkRateLimit,
} from "@/lib/rateLimit";
import {
  getClientIp,
} from "@/lib/requestSecurity";
import {
  sendGuestBookingOtpEmail,
} from "@/lib/email";

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

const OTP_TTL_MS =
  10 * 60 * 1000;

const RESEND_COOLDOWN_MS =
  60 * 1000;

const MAX_DAILY_ATTEMPTS = 6;

const MAX_REQUEST_BODY_BYTES = 32 * 1024;

const BOOKING_ID_PATTERN =
  /^AKJ-\d{4}-\d{6}$/i;

function hashOtp(
  otp: string,
  bookingId: string
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
      `${otp}:${bookingId}:${secret}`
    )
    .digest("hex");
}

export async function POST(
  request: NextRequest
) {
  try {
    const contentLength = Number(
      request.headers.get("content-length") || "0"
    );

    if (
      Number.isFinite(contentLength) &&
      contentLength > MAX_REQUEST_BODY_BYTES
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Request payload is too large.",
        },
        { status: 413 }
      );
    }

    const rawBody = await request.text();

    if (
      Buffer.byteLength(rawBody, "utf8") >
      MAX_REQUEST_BODY_BYTES
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Request payload is too large.",
        },
        { status: 413 }
      );
    }

    let body: unknown;

    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request payload.",
        },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request payload.",
        },
        { status: 400 }
      );
    }

    const clientIp =
      getClientIp(request);

    const ipLimit =
      await checkRateLimit({
        key: `guest-booking-otp-ip:${clientIp}`,
        limit: 12,
        windowMs: 15 * 60 * 1000,
      });

    if (!ipLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Too many requests. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              ipLimit.retryAfterSeconds
            ),
          },
        }
      );
    }

    const bookingId = String(
      (body as Record<string, unknown>)?.bookingId || ""
    ).trim();

    const email = String(
      (body as Record<string, unknown>)?.email || ""
    )
      .trim()
      .toLowerCase();

    if (
      !BOOKING_ID_PATTERN.test(bookingId) ||
      !EMAIL_PATTERN.test(email)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Enter a valid booking ID and email address.",
        },
        { status: 400 }
      );
    }

    await connectMongoose();

    const booking =
      await Booking.findOne({
        bookingId,
        userId: null,
      });

    /*
     * Do not reveal whether a booking exists.
     */
    if (!booking) {
      return NextResponse.json({
        success: true,
        message:
          "If the booking details match, a verification code has been sent to the registered email address.",
      });
    }

    const bookingEmail = String(
      booking.customer?.email || ""
    )
      .trim()
      .toLowerCase();

    if (
      !bookingEmail ||
      bookingEmail !== email
    ) {
      return NextResponse.json({
        success: true,
        message:
          "If the booking details match, a verification code has been sent to the registered email address.",
      });
    }

    const accountLimit =
      await checkRateLimit({
        key: `guest-booking-otp-email:${email}`,
        limit: MAX_DAILY_ATTEMPTS,
        windowMs: 24 * 60 * 60 * 1000,
      });

    if (!accountLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Too many verification attempts for this booking email. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              accountLimit.retryAfterSeconds
            ),
          },
        }
      );
    }

    const existing =
      await GuestBookingAccess.findOne({
        bookingId: booking._id,
        email,
      });

    if (
      existing &&
      Date.now() -
        existing.lastSentAt.getTime() <
        RESEND_COOLDOWN_MS
    ) {
      return NextResponse.json({
        success: true,
        message:
          "A verification code was recently sent. Please check your email.",
      });
    }

    const otp =
      String(
        crypto.randomInt(
          100000,
          1000000
        )
      );

    const now = new Date();
    const otpExpiresAt =
      new Date(
        Date.now() +
          OTP_TTL_MS
      );

    const otpHash = hashOtp(
      otp,
      booking._id.toString()
    );

    await GuestBookingAccess.findOneAndUpdate(
      {
        bookingId: booking._id,
        email,
      },
      {
        $set: {
          bookingId:
            booking._id,
          bookingReference:
            booking.bookingId,
          email,
          otpHash,
          otpExpiresAt,
          attempts: 0,
          lastSentAt: now,
          accessTokenHash:
            null,
          accessTokenExpiresAt:
            null,
          verifiedAt: null,
        },
      },
      {
        upsert: true,
        setDefaultsOnInsert:
          true,
      }
    );

    await sendGuestBookingOtpEmail({
      email,
      name:
        booking.customer?.fullName ||
        "Customer",
      bookingId:
        booking.bookingId,
      otp,
      expiresInMinutes: 10,
    });

    return NextResponse.json({
      success: true,
      message:
        "A verification code has been sent to the registered email address.",
    });
  } catch (error) {
    console.error(
      "GUEST BOOKING OTP REQUEST ERROR:",
      error instanceof Error
        ? error.message
        : error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to send the verification code.",
      },
      { status: 500 }
    );
  }
}
