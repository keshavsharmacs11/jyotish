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

const ACCESS_COOKIE_NAME =
  "guest_booking_access";

const ACCESS_TTL_MS =
  30 * 60 * 1000;

const MAX_OTP_ATTEMPTS = 5;

const MAX_REQUEST_BODY_BYTES =
  32 * 1024;

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

export async function POST(
  request: NextRequest
) {
  try {
    const contentLength =
      request.headers.get("content-length");

    if (
      contentLength &&
      Number(contentLength) >
        MAX_REQUEST_BODY_BYTES
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Request body is too large.",
        },
        { status: 413 }
      );
    }

    const rawBody =
      await request.text();

    if (
      Buffer.byteLength(
        rawBody,
        "utf8"
      ) > MAX_REQUEST_BODY_BYTES
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Request body is too large.",
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
          error:
            "Invalid request body.",
        },
        { status: 400 }
      );
    }

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid request body.",
        },
        { status: 400 }
      );
    }

    const requestBody =
      body as Record<
        string,
        unknown
      >;

    const bookingId =
      typeof requestBody.bookingId ===
      "string"
        ? requestBody.bookingId.trim()
        : "";

    const otp =
      typeof requestBody.otp ===
      "string"
        ? requestBody.otp.trim()
        : "";

    const clientIp =
      getClientIp(request);

    const ipLimit =
      await checkRateLimit({
        key: `guest-booking-verify-ip:${clientIp}`,
        limit: 20,
        windowMs:
          15 * 60 * 1000,
      });

    if (!ipLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Too many verification attempts. Please try again later.",
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

    if (
      !BOOKING_ID_PATTERN.test(
        bookingId
      ) ||
      !/^\d{6}$/.test(otp)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Enter the six-digit verification code.",
        },
        { status: 400 }
      );
    }

    await connectMongoose();

    const booking =
      await Booking.findOne({
        bookingId,
        userId: null,
      }).select("_id bookingId");

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The verification code is invalid or has expired.",
        },
        { status: 400 }
      );
    }

    const access =
      await GuestBookingAccess.findOne({
        bookingId: booking._id,
      });

    if (!access) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The verification code is invalid or has expired.",
        },
        { status: 400 }
      );
    }

    const now = new Date();
    const candidateHash =
      hashOtp(
        otp,
        booking._id.toString()
      );

    if (
      access.attempts >=
      MAX_OTP_ATTEMPTS
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Too many incorrect codes. Request a new code.",
        },
        { status: 429 }
      );
    }

    if (
      !access.otpExpiresAt ||
      access.otpExpiresAt.getTime() <=
        now.getTime()
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The verification code has expired. Request a new code.",
        },
        { status: 400 }
      );
    }

    /*
     * Atomically claim the valid OTP.
     * Only one concurrent request can match the live otpHash.
     */
    const accessToken =
      crypto
        .randomBytes(32)
        .toString("hex");

    const claimedAccess =
      await GuestBookingAccess.findOneAndUpdate(
        {
          _id: access._id,
          otpHash: candidateHash,
          otpExpiresAt: {
            $gt: now,
          },
          attempts: {
            $lt: MAX_OTP_ATTEMPTS,
          },
        },
        {
          $set: {
            accessTokenHash:
              hashAccessToken(
                accessToken
              ),
            accessTokenExpiresAt:
              new Date(
                now.getTime() +
                  ACCESS_TTL_MS
              ),
            verifiedAt: now,
            attempts: 0,
            /* Make the old OTP impossible to reuse. */
            otpHash:
              crypto
                .randomBytes(32)
                .toString("hex"),
            otpExpiresAt:
              new Date(0),
          },
        },
        {
          returnDocument:
            "after",
        }
      );

    if (!claimedAccess) {
      /*
       * Atomically increment incorrect-attempt count only when the
       * current record still has attempts available and the OTP did
       * not match. This prevents concurrent requests from bypassing
       * MAX_OTP_ATTEMPTS through lost updates.
       */
      const attemptUpdate =
        await GuestBookingAccess.updateOne(
          {
            _id: access._id,
            otpExpiresAt: {
              $gt: now,
            },
            attempts: {
              $lt: MAX_OTP_ATTEMPTS,
            },
          },
          {
            $inc: {
              attempts: 1,
            },
          }
        );

      if (
        attemptUpdate.matchedCount === 0
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "The verification code is invalid or has expired.",
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error:
            "The verification code is incorrect.",
        },
        { status: 400 }
      );
    }

    const response =
      NextResponse.json({
        success: true,
        message:
          "Booking verified successfully.",
        booking: {
          bookingId:
            booking.bookingId,
        },
      });

    response.cookies.set(
      ACCESS_COOKIE_NAME,
      accessToken,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "lax",
        path: "/api/guest/booking",
        maxAge:
          Math.floor(
            ACCESS_TTL_MS /
              1000
          ),
      }
    );

    return response;
  } catch (error) {
    console.error(
      "GUEST BOOKING OTP VERIFY ERROR:",
      error instanceof Error
        ? error.message
        : error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to verify the booking.",
      },
      { status: 500 }
    );
  }
}
