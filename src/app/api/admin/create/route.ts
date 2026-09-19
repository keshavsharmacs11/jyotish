import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import clientPromise from "@/lib/mongodb";
import User from "@/models/User";
import { requireSuperAdmin } from "@/lib/adminAuth";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/requestSecurity";
import {
  isValidEmail,
  isStrongPassword,
} from "@/lib/validation";

const MAX_REQUEST_BODY_BYTES = 32 * 1024;

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const ipRateLimit = await checkRateLimit({
      key: `admin-create-ip:${getClientIp(request)}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });

    if (!ipRateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many administrator creation requests. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(ipRateLimit.retryAfterSeconds),
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

    const name =
      typeof requestBody.name === "string"
        ? requestBody.name.trim()
        : "";

    const email =
      typeof requestBody.email === "string"
        ? requestBody.email.trim().toLowerCase()
        : "";

    const password =
      typeof requestBody.password === "string"
        ? requestBody.password
        : "";

    const phone =
      typeof requestBody.phone === "string"
        ? requestBody.phone.trim()
        : "";

    if (
      name.length < 2 ||
      name.length > 100
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter a valid administrator name.",
        },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter a valid email address.",
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
            "Administrator password must be 12–128 characters and include uppercase, lowercase, number, and special character.",
        },
        { status: 400 }
      );
    }

    if (phone.length > 40) {
      return NextResponse.json(
        {
          success: false,
          error: "Phone number is too long.",
        },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    await client.db().command({ ping: 1 });

    const existingUser = await User.findOne({
      email,
    }).select("_id email role");

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "A user with this email already exists.",
        },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(
      password,
      12
    );

    const admin = await User.create({
      name,
      email,
      phone,
      passwordHash,
      role: "admin",
      consultantProfileEligible: false,
      isSuperAdmin: false,
      authVersion: 1,
    });

    console.log("Admin user created by Super Administrator:", {
      id: admin._id.toString(),
      role: admin.role,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Admin account created successfully.",
        admin: {
          id: admin._id.toString(),
          name: admin.name,
          email: admin.email,
          phone: admin.phone,
          role: admin.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("ADMIN CREATION ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to create admin account.",
      },
      { status: 500 }
    );
  }
}
