import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { connectMongoose } from "@/lib/mongodb";

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

const MAX_REQUEST_BODY_BYTES = 32 * 1024;

function genericResponse() {
  return NextResponse.json({
    success: true,
    message:
      "If an administrator account exists with this email, a password reset link will be sent.",
  });
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);

    const ipLimit = await checkRateLimit({
      key: `admin-forgot-password-ip:${clientIp}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });

    if (!ipLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Too many password reset requests. Please try again later.",
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

    const contentLength = request.headers.get("content-length");
    if (
      contentLength &&
      (!Number.isFinite(Number(contentLength)) ||
        Number(contentLength) > MAX_REQUEST_BODY_BYTES)
    ) {
      return NextResponse.json(
        { success: false, error: "Request is too large." },
        { status: 413 }
      );
    }

    let body: unknown;
    try {
      const rawBody = await request.text();

      if (
        Buffer.byteLength(rawBody, "utf8") >
        MAX_REQUEST_BODY_BYTES
      ) {
        return NextResponse.json(
          { success: false, error: "Request is too large." },
          { status: 413 }
        );
      }

      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { success: false, error: "Invalid request." },
        { status: 400 }
      );
    }

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid request." },
        { status: 400 }
      );
    }

    const email = String(
      (body as Record<string, unknown>).email || ""
    )
      .trim()
      .toLowerCase();

    if (!email || email.length > 320) {
      return NextResponse.json(
        {
          success: false,
          error: "Email address is required.",
        },
        { status: 400 }
      );
    }

    const emailLimit = await checkRateLimit({
      key: `admin-forgot-password-email:${email}`,
      limit: 3,
      windowMs: 15 * 60 * 1000,
    });

    if (!emailLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Too many password reset requests. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              emailLimit.retryAfterSeconds
            ),
          },
        }
      );
    }

    await connectMongoose();

    const user = await User.findOne({
      email,
      role: "admin",
    });

    /*
     * Do not distinguish between an unknown admin email and
     * an email-delivery failure. This keeps the endpoint
     * resistant to account-enumeration timing/status checks.
     */
    if (!user) {
      return genericResponse();
    }

    await PasswordResetToken.updateMany(
      {
        userId: user._id,
        used: false,
      },
      {
        $set: { used: true },
      }
    );

    const token = crypto.randomBytes(32).toString("hex");

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const expiresAt = new Date(
      Date.now() + 30 * 60 * 1000
    );

    const resetToken =
      await PasswordResetToken.create({
        userId: user._id,
        tokenHash,
        expiresAt,
        used: false,
      });

    const baseUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      ""
    ).replace(/\/+$/, "");

    if (!baseUrl) {
      console.error(
        "NEXT_PUBLIC_APP_URL is not configured."
      );

      await PasswordResetToken.updateOne(
        { _id: resetToken._id },
        { $set: { used: true } }
      );

      return genericResponse();
    }

    const resetUrl =
      `${baseUrl}/admin/reset-password?token=${encodeURIComponent(token)}`;

    try {
      await sendPasswordResetEmail({
        email,
        name: user.name || "Administrator",
        resetUrl,
      });
    } catch (error) {
      await PasswordResetToken.updateOne(
        { _id: resetToken._id },
        { $set: { used: true } }
      );

      console.error(
        "ADMIN PASSWORD RESET EMAIL DELIVERY FAILED:",
        error
      );

      return genericResponse();
    }

    return genericResponse();
  } catch (error) {
    console.error("ADMIN FORGOT PASSWORD ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to process the password reset request.",
      },
      { status: 500 }
    );
  }
}
