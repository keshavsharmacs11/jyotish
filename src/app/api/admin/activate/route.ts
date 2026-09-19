import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";

import { connectMongoose } from "@/lib/mongodb";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/requestSecurity";
import { isStrongPassword } from "@/lib/validation";

import User from "@/models/User";
import AdminInvitationToken from "@/models/AdminInvitationToken";

const MAX_REQUEST_BODY_BYTES = 32 * 1024;
const INVITATION_TOKEN_LENGTH = 64;

function hashInvitationToken(token: string): string {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const ipLimit = await checkRateLimit({
      key: `admin-activate-ip:${getClientIp(request)}`,
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });

    if (!ipLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many activation attempts. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(ipLimit.retryAfterSeconds),
          },
        }
      );
    }

    const contentLength = request.headers.get("content-length");
    if (
      contentLength &&
      Number.isFinite(Number(contentLength)) &&
      Number(contentLength) > MAX_REQUEST_BODY_BYTES
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

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request payload.",
        },
        { status: 400 }
      );
    }

    const requestBody =
      body as Record<string, unknown>;

    const token =
      typeof requestBody.token === "string"
        ? requestBody.token.trim()
        : "";

    const password =
      typeof requestBody.password === "string"
        ? requestBody.password
        : "";

    const confirmPassword =
      typeof requestBody.confirmPassword === "string"
        ? requestBody.confirmPassword
        : "";

    if (
      token.length !== INVITATION_TOKEN_LENGTH ||
      !/^[a-f0-9]+$/i.test(token)
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "This invitation is invalid or has expired.",
        },
        { status: 400 }
      );
    }

    if (
      password.length < 12 ||
      password.length > 128 ||
      !isStrongPassword(password)
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Password must be 12–128 characters and include uppercase, lowercase, number, and special character.",
        },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          error: "Passwords do not match.",
        },
        { status: 400 }
      );
    }

    const tokenHash = hashInvitationToken(token);

    const tokenLimit = await checkRateLimit({
      key: `admin-activate-token:${tokenHash}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });

    if (!tokenLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many activation attempts for this invitation. Please request a new invitation.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(tokenLimit.retryAfterSeconds),
          },
        }
      );
    }

    await connectMongoose();

    /*
     * Atomically consume the invitation before creating the account.
     * A concurrent request using the same token can never claim it twice.
     */
    const invitation =
      await AdminInvitationToken.findOneAndUpdate(
        {
          tokenHash,
          used: false,
          expiresAt: { $gt: new Date() },
        },
        {
          $set: { used: true },
        },
        {
          returnDocument: "after",
        }
      );

    if (!invitation) {
      return NextResponse.json(
        {
          success: false,
          error: "This invitation is invalid, expired, or has already been used.",
        },
        { status: 400 }
      );
    }

    try {
      const existingUser = await User.findOne({
        email: invitation.email,
      }).select("_id");

      if (existingUser) {
        return NextResponse.json(
          {
            success: false,
            error: "An account with this email already exists.",
          },
          { status: 409 }
        );
      }

      const passwordHash = await bcrypt.hash(
        password,
        12
      );

      await User.create({
        name: invitation.name,
        email: invitation.email,
        phone: "",
        passwordHash,
        role: "admin",
        consultantProfileEligible: true,
        isSuperAdmin: false,
        authVersion: 1,
      });

      return NextResponse.json({
        success: true,
        message:
          "Administrator account created successfully. You can now sign in.",
      });
    } catch (error) {
      /*
       * If account creation fails, return the invitation to an unused state
       * so the legitimate recipient can retry instead of losing the invite.
       */
      await AdminInvitationToken.updateOne(
        { _id: invitation._id },
        { $set: { used: false } }
      );
      throw error;
    }
  } catch (error) {
    console.error(
      "ADMIN ACCOUNT ACTIVATION ERROR:",
      error instanceof Error ? error.message : error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to activate the administrator account.",
      },
      { status: 500 }
    );
  }
}
