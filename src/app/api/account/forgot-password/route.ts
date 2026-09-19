import {
  NextRequest,
  NextResponse,
} from "next/server";

import crypto from "crypto";

import {
  connectMongoose,
} from "@/lib/mongodb";

import User from "@/models/User";

import PasswordResetToken from "@/models/PasswordResetToken";

import {
  sendPasswordResetEmail,
} from "@/lib/email";

import {
  checkRateLimit,
} from "@/lib/rateLimit";

import {
  getClientIp,
} from "@/lib/requestSecurity";

import {
  isValidEmail,
  normalizeEmail,
} from "@/lib/validation";

/*
 * ============================================
 * REQUEST LIMIT
 * ============================================
 */

const MAX_REQUEST_BODY_BYTES =
  32 * 1024;

/*
 * ============================================
 * RESET URL
 * ============================================
 */

function getAppUrl(): string {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) {
    throw new Error(
      "NEXT_PUBLIC_APP_URL is not configured."
    );
  }

  return appUrl.replace(
    /\/+$/,
    ""
  );
}

/*
 * ============================================
 * POST
 * ============================================
 */

export async function POST(
  request: NextRequest
) {
  try {
    /*
     * ========================================
     * IP RATE LIMIT
     * ========================================
     */

    const clientIp =
      getClientIp(request);

    const ipRateLimit =
      await checkRateLimit({
        key:
          `customer-forgot-password-ip:${clientIp}`,
        limit: 5,
        windowMs:
          15 * 60 * 1000,
      });

    if (
      !ipRateLimit.allowed
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Too many password reset requests. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After":
              String(
                ipRateLimit.retryAfterSeconds
              ),
          },
        }
      );
    }

    /*
     * ========================================
     * REQUEST BODY SIZE LIMIT
     * ========================================
     */

    const contentLength =
      request.headers.get(
        "content-length"
      );

    if (
      contentLength
    ) {
      const parsedLength =
        Number(
          contentLength
        );

      if (
        !Number.isFinite(
          parsedLength
        ) ||
        parsedLength >
          MAX_REQUEST_BODY_BYTES
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Request is too large.",
          },
          {
            status: 413,
          }
        );
      }
    }

    /*
     * ========================================
     * READ REQUEST
     * ========================================
     */

    let body: unknown;

    try {
      const rawBody =
        await request.text();

      const bodyBytes =
        Buffer.byteLength(
          rawBody,
          "utf8"
        );

      if (
        bodyBytes >
        MAX_REQUEST_BODY_BYTES
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Request is too large.",
          },
          {
            status: 413,
          }
        );
      }

      if (!rawBody) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid request.",
          },
          {
            status: 400,
          }
        );
      }

      body =
        JSON.parse(
          rawBody
        );
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid request.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !body ||
      typeof body !==
        "object" ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid request.",
        },
        {
          status: 400,
        }
      );
    }

    const requestBody =
      body as Record<
        string,
        unknown
      >;

    const normalizedEmail =
      normalizeEmail(
        requestBody.email
      );

    /*
     * ========================================
     * BASIC VALIDATION
     * ========================================
     */

    if (
      !normalizedEmail
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Email address is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !isValidEmail(
        normalizedEmail
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please enter a valid email address.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ========================================
     * EMAIL RATE LIMIT
     * ========================================
     */

    const emailRateLimit =
      await checkRateLimit({
        key:
          `customer-forgot-password-email:${normalizedEmail}`,
        limit: 3,
        windowMs:
          15 * 60 * 1000,
      });

    if (
      !emailRateLimit.allowed
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Too many password reset requests. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After":
              String(
                emailRateLimit.retryAfterSeconds
              ),
          },
        }
      );
    }

    /*
     * ========================================
     * DATABASE
     * ========================================
     */

    await connectMongoose();

    /*
     * ========================================
     * FIND CUSTOMER
     * ========================================
     */

    const user =
      await User.findOne({
        email:
          normalizedEmail,
        role: "customer",
      });

    /*
     * ========================================
     * GENERIC RESPONSE
     * ========================================
     */

    if (!user) {
      return NextResponse.json({
        success: true,
        message:
          "If an account exists with this email, a password reset link will be sent.",
      });
    }

    /*
     * ========================================
     * INVALIDATE PREVIOUS TOKENS
     * ========================================
     */

    await PasswordResetToken.updateMany(
      {
        userId:
          user._id,
        used: false,
      },
      {
        $set: {
          used: true,
        },
      }
    );

    /*
     * ========================================
     * SECURE RESET TOKEN
     * ========================================
     */

    const rawToken =
      crypto.randomBytes(32);

    const token =
      rawToken.toString("hex");

    const tokenHash =
      crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    /*
     * ========================================
     * TOKEN EXPIRATION
     * ========================================
     */

    const expiresAt =
      new Date(
        Date.now() +
          30 * 60 * 1000
      );

    const resetToken =
      await PasswordResetToken.create({
        userId:
          user._id,

        tokenHash,

        expiresAt,

        used: false,
      });

    /*
     * ========================================
     * CREATE RESET URL
     * ========================================
     */

    const baseUrl =
      getAppUrl();

    const resetUrl =
      `${baseUrl}/account/reset-password?token=${encodeURIComponent(
        token
      )}`;

    /*
     * ========================================
     * SEND EMAIL
     * ========================================
     */

    try {
      await sendPasswordResetEmail({
        email:
          normalizedEmail,

        name:
          user.name ||
          "Customer",

        resetUrl,
      });
    } catch {
      await PasswordResetToken.updateOne(
        {
          _id:
            resetToken._id,
        },
        {
          $set: {
            used: true,
          },
        }
      );

      console.error(
        "PASSWORD RESET EMAIL DELIVERY FAILED"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to send the password reset email.",
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "If an account exists with this email, a password reset link will be sent.",
    });
  } catch {
    console.error(
      "FORGOT PASSWORD REQUEST FAILED"
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to process password reset request.",
      },
      {
        status: 500,
      }
    );
  }
}