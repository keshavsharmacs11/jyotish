import {
  NextRequest,
  NextResponse,
} from "next/server";

import crypto from "crypto";

import {
  connectMongoose,
} from "@/lib/mongodb";

import Booking from "@/models/Booking";

import {
  sendBookingConfirmationEmail,
} from "@/lib/email";

import {
  checkRateLimit,
} from "@/lib/rateLimit";

import {
  getClientIp,
} from "@/lib/requestSecurity";

const CONFIRMATION_ACCESS_COOKIE =
  "akj_booking_confirmation_access";

const CONFIRMATION_ACCESS_TTL_MS =
  10 * 60 * 1000;

const MAX_REQUEST_BODY_BYTES =
  32 * 1024;

const BOOKING_ID_PATTERN =
  /^AKJ-\d{4}-\d{6}$/i;

function isValidConfirmationAccess(
  token: string | undefined,
  bookingId: string
): boolean {
  if (!token) {
    return false;
  }

  const parts =
    token.split("|");

  if (parts.length !== 3) {
    return false;
  }

  const [
    tokenBookingId,
    issuedAtRaw,
    receivedSignature,
  ] = parts;

  if (
    tokenBookingId !==
    bookingId
  ) {
    return false;
  }

  if (
  !/^\d{13}$/.test(
    issuedAtRaw
  )
     ){
    return false;
  }

  const issuedAt =
    Number(issuedAtRaw);

  if (
    !Number.isSafeInteger(
      issuedAt
    )
  ) {
    return false;
  }

  if (
    Date.now() -
      issuedAt <
    0
  ) {
    return false;
  }

  if (
    Date.now() -
      issuedAt >
    CONFIRMATION_ACCESS_TTL_MS
  ) {
    return false;
  }

  if (
    !/^[a-f0-9]{64}$/i.test(
      receivedSignature
    )
  ) {
    return false;
  }

  const secret =
    process.env.CUSTOMER_SESSION_SECRET;

  if (!secret) {
    return false;
  }

  const payload =
    `${tokenBookingId}|${issuedAtRaw}`;

  const expectedSignature =
    crypto
      .createHmac(
        "sha256",
        secret
      )
      .update(payload)
      .digest("hex");

  const expectedBuffer =
    Buffer.from(
      expectedSignature,
      "hex"
    );

  const receivedBuffer =
    Buffer.from(
      receivedSignature,
      "hex"
    );

  if (
    expectedBuffer.length !==
    receivedBuffer.length
  ) {
    return false;
  }

  return crypto.timingSafeEqual(
    expectedBuffer,
    receivedBuffer
  );
}

export async function POST(
  request: NextRequest
) {
  try {
    const contentLength =
      request.headers.get(
        "content-length"
      );

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
      new TextEncoder().encode(
        rawBody
      ).byteLength >
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

    if (
      !BOOKING_ID_PATTERN.test(
        bookingId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid booking confirmation request.",
        },
        { status: 400 }
      );
    }

    const confirmationToken =
      request.cookies.get(
        CONFIRMATION_ACCESS_COOKIE
      )?.value;

    if (
      !isValidConfirmationAccess(
        confirmationToken,
        bookingId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Booking confirmation access is not authorized.",
        },
        { status: 403 }
      );
    }

    const ipLimit =
      await checkRateLimit({
        key:
          `guest-booking-confirmation:${getClientIp(
            request
          )}`,

        limit:
          6,

        windowMs:
          60 * 60 * 1000,
      });

    if (!ipLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please wait before requesting another confirmation email.",
        },
        {
          status: 429,
          headers: {
            "Retry-After":
              String(
                ipLimit.retryAfterSeconds
              ),
          },
        }
      );
    }

    await connectMongoose();

    const booking =
      await Booking.findOne({
        bookingId,
        paymentStatus:
          "paid",
      }).lean();

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Paid booking could not be found.",
        },
        { status: 404 }
      );
    }

    const email =
      String(
        booking.customer?.email ||
          ""
      )
        .trim()
        .toLowerCase();

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Booking email is unavailable.",
        },
        { status: 400 }
      );
    }

    await sendBookingConfirmationEmail({
      email,

      name:
        booking.customer?.fullName ||
        "Customer",

      bookingId:
        booking.bookingId,

      serviceName:
        booking.serviceName,

      consultantName:
        booking.consultantName ||
        "To be assigned",

      date:
        booking.date,

      time:
        booking.time,

      mode:
        booking.mode,

      price:
        booking.price,

      currency:
        booking.currency,
    });

    return NextResponse.json({
      success: true,
      message:
        "Booking confirmation sent.",
    });
  } catch (error) {
    console.error(
      "BOOKING CONFIRMATION EMAIL ERROR:",
      error instanceof Error
        ? error.message
        : error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to send booking confirmation email.",
      },
      { status: 500 }
    );
  }
}
