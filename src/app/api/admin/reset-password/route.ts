import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

import { connectMongoose } from "@/lib/mongodb";

import User from "@/models/User";
import PasswordResetToken from "@/models/PasswordResetToken";

import {
  checkRateLimit,
} from "@/lib/rateLimit";

import {
  getClientIp,
} from "@/lib/requestSecurity";

const MAX_REQUEST_BODY_BYTES = 32 * 1024;
const RESET_TOKEN_LENGTH = 64;
const NEW_PASSWORD_MIN_LENGTH = 10;
const NEW_PASSWORD_MAX_LENGTH = 128;

function isStrongPassword(password: string): boolean {
  return (
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);

    const rateLimit = await checkRateLimit({
      key: `admin-reset-password-ip:${clientIp}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Too many password reset attempts. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              rateLimit.retryAfterSeconds
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

    const requestBody = body as Record<string, unknown>;

    const token =
      typeof requestBody.token === "string"
        ? requestBody.token.trim()
        : "";

    const password =
      typeof requestBody.password === "string"
        ? requestBody.password
        : "";

    if (
      token.length !== RESET_TOKEN_LENGTH ||
      !/^[a-f0-9]+$/i.test(token)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Password reset token is invalid.",
        },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        {
          success: false,
          error: "Password is required.",
        },
        { status: 400 }
      );
    }

    if (password.length < NEW_PASSWORD_MIN_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: `Password must be at least ${NEW_PASSWORD_MIN_LENGTH} characters.`,
        },
        { status: 400 }
      );
    }

    if (password.length > NEW_PASSWORD_MAX_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: `Password must not exceed ${NEW_PASSWORD_MAX_LENGTH} characters.`,
        },
        { status: 400 }
      );
    }

    if (!isStrongPassword(password)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
        },
        { status: 400 }
      );
    }

    await connectMongoose();

    const tokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const session = await mongoose.startSession();

    try {
      let resetCompleted = false;

      await session.withTransaction(async () => {
        /*
         * Atomic one-time consumption prevents two concurrent
         * reset requests from using the same token.
         */
        const resetToken =
          await PasswordResetToken.findOneAndUpdate(
            {
              tokenHash,
              used: false,
              expiresAt: {
                $gt: new Date(),
              },
            },
            {
              $set: {
                used: true,
              },
            },
            {
              returnDocument: "after",
              session,
            }
          );

        if (!resetToken) {
          throw new Error("INVALID_RESET_TOKEN");
        }

        const user = await User.findOne({
          _id: resetToken.userId,
          role: "admin",
        }).session(session);

        if (!user) {
          throw new Error("RESET_ACCOUNT_NOT_FOUND");
        }

        user.passwordHash = await bcrypt.hash(
          password,
          12
        );

        /*
         * Invalidate every previously issued admin JWT.
         * requireAdmin() compares this version with the version
         * embedded in the JWT on every protected request.
         */
        user.authVersion =
          (user.authVersion || 1) + 1;

        await user.save({ session });

        resetCompleted = true;
      });

      if (!resetCompleted) {
        return NextResponse.json(
          {
            success: false,
            error: "Unable to reset the administrator password.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message:
          "Your administrator password has been reset successfully. Please log in again.",
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "INVALID_RESET_TOKEN"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "This password reset link is invalid or has expired.",
          },
          { status: 400 }
        );
      }

      if (
        error instanceof Error &&
        error.message === "RESET_ACCOUNT_NOT_FOUND"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Unable to reset this administrator account.",
          },
          { status: 400 }
        );
      }

      console.error(
        "ADMIN RESET PASSWORD REQUEST FAILED"
      );

      return NextResponse.json(
        {
          success: false,
          error: "Unable to reset the administrator password.",
        },
        { status: 500 }
      );
    } finally {
      await session.endSession();
    }
  } catch {
    console.error("ADMIN RESET PASSWORD ENDPOINT FAILED");

    return NextResponse.json(
      {
        success: false,
        error: "Unable to reset the administrator password.",
      },
      { status: 500 }
    );
  }
}
