import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";

import { connectMongoose } from "@/lib/mongodb";

import User from "@/models/User";
import PasswordResetToken from "@/models/PasswordResetToken";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const token = String(
      body.token || ""
    ).trim();

    const password = String(
      body.password || ""
    );

    const confirmPassword = String(
      body.confirmPassword || ""
    );

    /*
     * ============================================
     * VALIDATION
     * ============================================
     */

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Password reset token is missing.",
        },
        {
          status: 400,
        }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Password must be at least 8 characters.",
        },
        {
          status: 400,
        }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Passwords do not match.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ============================================
     * DATABASE
     * ============================================
     */

    await connectMongoose();

    /*
     * ============================================
     * HASH TOKEN
     * ============================================
     *
     * We never search MongoDB using the raw token.
     */

    const tokenHash =
      crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    /*
     * ============================================
     * FIND RESET TOKEN
     * ============================================
     */

    const resetToken =
      await PasswordResetToken.findOne({
        tokenHash,
        used: false,
      });

    if (!resetToken) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This password reset link is invalid or has already been used.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ============================================
     * CHECK EXPIRATION
     * ============================================
     */

    if (
      !resetToken.expiresAt ||
      resetToken.expiresAt.getTime() <=
        Date.now()
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This password reset link has expired. Please request a new one.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ============================================
     * FIND ADMIN
     * ============================================
     */

    const user =
      await User.findOne({
        _id: resetToken.userId,
        role: "admin",
      });

    /*
     * IMPORTANT:
     * This endpoint is ONLY for administrators.
     */

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Administrator account could not be verified.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * ============================================
     * HASH NEW PASSWORD
     * ============================================
     *
     * Admin accounts currently use bcrypt.
     * Therefore we must continue using bcrypt here.
     */

    const passwordHash =
      await bcrypt.hash(
        password,
        12
      );

    /*
     * ============================================
     * UPDATE ADMIN PASSWORD
     * ============================================
     */

    user.passwordHash =
      passwordHash;

    await user.save();

    /*
     * ============================================
     * MARK TOKEN USED
     * ============================================
     */

    resetToken.used = true;

    await resetToken.save();

    /*
     * ============================================
     * SUCCESS
     * ============================================
     */

    return NextResponse.json({
      success: true,

      message:
        "Your administrator password has been reset successfully.",
    });
  } catch (error) {
    console.error(
      "ADMIN RESET PASSWORD ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to reset the administrator password.",
      },
      {
        status: 500,
      }
    );
  }
}