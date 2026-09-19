import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import {
  connectMongoose,
} from "@/lib/mongodb";

import User from "@/models/User";

import {
  checkRateLimit,
} from "@/lib/rateLimit";

import {
  getClientIp,
} from "@/lib/requestSecurity";

const MAX_REQUEST_BODY_BYTES = 32 * 1024;

function normalizeEmail(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);

    const ipLimit = await checkRateLimit({
      key: `admin-login-ip:${clientIp}`,
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });

    if (!ipLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many login attempts. Please try again later.",
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
    const normalizedEmail = normalizeEmail(requestBody.email);
    const password =
      typeof requestBody.password === "string"
        ? requestBody.password
        : "";

    if (!normalizedEmail || !password) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password." },
        { status: 401 }
      );
    }

    if (normalizedEmail.length > 320 || password.length > 128) {
      return NextResponse.json(
        { success: false, error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const accountLimit = await checkRateLimit({
      key: `admin-login-account:${normalizedEmail}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });

    if (!accountLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many login attempts. Please try again later.",
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

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("JWT_SECRET is not configured.");
      return NextResponse.json(
        {
          success: false,
          error: "Authentication is not configured.",
        },
        { status: 500 }
      );
    }

    await connectMongoose();

    const user = await User.findOne({
      email: normalizedEmail,
    });

    /*
     * Return the same credential error for nonexistent users,
     * non-admin users, and wrong passwords.
     */
    if (
      !user ||
      user.role !== "admin" ||
      user.active === false
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email or password.",
        },
        { status: 401 }
      );
    }

    const passwordValid = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordValid) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid email or password.",
        },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
        authVersion: user.authVersion,
      },
      jwtSecret,
      {
        expiresIn: "1d",
      }
    );

    const response = NextResponse.json({
      success: true,
      message: "Admin login successful.",
      admin: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    response.cookies.set("admin_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (error) {
    console.error("ADMIN LOGIN ERROR:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Unable to process admin login.",
      },
      { status: 500 }
    );
  }
}
