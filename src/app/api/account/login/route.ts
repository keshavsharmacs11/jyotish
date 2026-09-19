import {
  NextRequest,
  NextResponse,
} from "next/server";

import crypto from "crypto";

import { connectMongoose } from "@/lib/mongodb";
import User from "@/models/User";

import { setCustomerSession } from "@/lib/customerAuth";

import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/requestSecurity";

import {
  isValidEmail,
  normalizeEmail,
  LOGIN_PASSWORD_MAX_LENGTH,
} from "@/lib/validation";

function verifyPassword(
  password: string,
  storedHash: string
): boolean {
  try {
    const [saltHex, keyHex] = String(storedHash || "").split(":");

    if (!saltHex || !keyHex) {
      return false;
    }

    const salt = Buffer.from(saltHex, "hex");
    const storedKey = Buffer.from(keyHex, "hex");

    if (salt.length === 0 || storedKey.length === 0) {
      return false;
    }

    const derivedKey = crypto.scryptSync(
      password,
      salt,
      storedKey.length
    );

    if (derivedKey.length !== storedKey.length) {
      return false;
    }

    return crypto.timingSafeEqual(
      derivedKey,
      storedKey
    );
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);

    const ipRateLimit = await checkRateLimit({
      key: `customer-login-ip:${clientIp}`,
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });

    if (!ipRateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Too many login attempts. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              ipRateLimit.retryAfterSeconds
            ),
          },
        }
      );
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request.",
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
          error: "Invalid request.",
        },
        { status: 400 }
      );
    }

    const requestBody = body as Record<string, unknown>;

    const normalizedEmail = normalizeEmail(
      requestBody.email
    );

    const password =
      typeof requestBody.password === "string"
        ? requestBody.password
        : "";

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return NextResponse.json(
        {
          success: false,
          error: !normalizedEmail
            ? "Email address is required."
            : "Please enter a valid email address.",
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

    if (password.length > LOGIN_PASSWORD_MAX_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error: "Password is too long.",
        },
        { status: 400 }
      );
    }

    const accountRateLimit = await checkRateLimit({
      key: `customer-login-account:${normalizedEmail}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });

    if (!accountRateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Too many login attempts. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              accountRateLimit.retryAfterSeconds
            ),
          },
        }
      );
    }

    await connectMongoose();

    const user = await User.findOne({
      email: normalizedEmail,
      role: "customer",
    });

    /*
     * Treat a deactivated customer exactly like a failed
     * credential check, so the login endpoint does not expose
     * whether the account exists.
     */
    if (
      !user ||
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

    const passwordValid = verifyPassword(
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

    await setCustomerSession(
      user._id.toString()
    );

    return NextResponse.json({
      success: true,
      message: "Login successful.",
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
    });
  } catch {
    console.error("CUSTOMER LOGIN ERROR");
    return NextResponse.json(
      {
        success: false,
        error: "Unable to log in.",
      },
      { status: 500 }
    );
  }
}
