import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  calculateCurrentSky,
  type AstrologyLocation,
} from "@/lib/astrology/calculations";

import {
  buildDailyRashifal,
} from "@/lib/astrology/interpretation";

import {
  checkRateLimit,
} from "@/lib/rateLimit";

import {
  getClientIp,
} from "@/lib/requestSecurity";

const INDIA_REFERENCE: AstrologyLocation = {
  name: "India",
  latitude: 28.6139,
  longitude: 77.209,
  timezone: "Asia/Kolkata",
};

export async function GET(
  request: NextRequest,
) {
  try {
    const clientIp =
      getClientIp(request);

    const rateLimit =
      await checkRateLimit({
        key:
          `astrology-rashifal:${clientIp}`,
        limit: 30,
        windowMs:
          15 * 60 * 1000,
      });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Too many requests. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After":
              String(
                rateLimit.retryAfterSeconds,
              ),
          },
        },
      );
    }

    const value =
      request.nextUrl.searchParams.get(
        "rashi",
      );

    const rashiIndex =
      value === null
        ? 0
        : Number(value);

    if (
      !Number.isInteger(
        rashiIndex,
      ) ||
      rashiIndex < 0 ||
      rashiIndex > 11
    ) {
      return NextResponse.json(
        {
          ok: false,
          error: "Invalid Rashi.",
        },
        {
          status: 400,
        },
      );
    }

    const sky =
      await calculateCurrentSky(
        INDIA_REFERENCE,
      );

    const result =
      buildDailyRashifal(
        rashiIndex,
        sky,
      );

    return NextResponse.json(
      {
        ok: true,
        data: {
          ...result,
          date:
            new Intl.DateTimeFormat(
              "en-CA",
              {
                timeZone:
                  "Asia/Kolkata",
              },
            ).format(
              new Date(),
            ),
        },
      },
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      },
    );
  } catch (error) {
    console.error(
      "DAILY RASHIFAL ERROR:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to prepare today's Rashifal.",
      },
      {
        status: 500,
      },
    );
  }
}
