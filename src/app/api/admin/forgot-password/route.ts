import { NextResponse } from "next/server";
import crypto from "crypto";

import { connectMongoose } from "@/lib/mongodb";

import User from "@/models/User";
import PasswordResetToken from "@/models/PasswordResetToken";

import {
  sendPasswordResetEmail,
} from "@/lib/email";

export async function POST(
  request: Request
) {
  try {
    const body = await request.json();

    const normalizedEmail =
      String(body.email || "")
        .trim()
        .toLowerCase();

    /*
     * ============================================
     * BASIC VALIDATION
     * ============================================
     */

    if (!normalizedEmail) {
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

    /*
     * ============================================
     * DATABASE
     * ============================================
     */

    await connectMongoose();

    /*
     * ============================================
     * FIND ADMIN
     * ============================================
     *
     * IMPORTANT:
     * Only users with role === "admin"
     * can use this reset flow.
     */

    const user =
      await User.findOne({
        email: normalizedEmail,
        role: "admin",
      });

    /*
     * ============================================
     * SECURITY
     * ============================================
     *
     * Do not reveal whether an admin account
     * exists.
     */

    if (!user) {
      return NextResponse.json({
        success: true,

        message:
          "If an administrator account exists with this email, a password reset link will be sent.",
      });
    }

    /*
     * ============================================
     * INVALIDATE OLD TOKENS
     * ============================================
     */

    await PasswordResetToken.updateMany(
      {
        userId: user._id,
        used: false,
      },
      {
        $set: {
          used: true,
        },
      }
    );

    /*
     * ============================================
     * GENERATE SECURE TOKEN
     * ============================================
     */

    const rawToken =
      crypto.randomBytes(32);

    const token =
      rawToken.toString("hex");

    /*
     * Store only the SHA-256 hash.
     *
     * The raw token is sent through the
     * reset URL but never stored in MongoDB.
     */

    const tokenHash =
      crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

    /*
     * ============================================
     * TOKEN EXPIRATION
     * ============================================
     *
     * 30 minutes.
     */

    const expiresAt =
      new Date(
        Date.now() +
          30 * 60 * 1000
      );

    await PasswordResetToken.create({
      userId: user._id,
      tokenHash,
      expiresAt,
      used: false,
    });

    /*
     * ============================================
     * RESET URL
     * ============================================
     */

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const resetUrl =
      `${baseUrl}/admin/reset-password?token=${token}`;

    /*
     * ============================================
     * SEND EMAIL
     * ============================================
     */

    try {
      await sendPasswordResetEmail({
        email: normalizedEmail,

        name:
          user.name ||
          "Administrator",

        resetUrl,
      });
    } catch (error) {
      console.error(
        "ADMIN PASSWORD RESET EMAIL ERROR:",
        error
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

    /*
     * ============================================
     * SUCCESS
     * ============================================
     */

    return NextResponse.json({
      success: true,

      message:
        "If an administrator account exists with this email, a password reset link will be sent.",
    });
  } catch (error) {
    console.error(
      "ADMIN FORGOT PASSWORD ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          "Unable to process the password reset request.",
      },
      {
        status: 500,
      }
    );
  }
}