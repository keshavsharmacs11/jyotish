import {
  NextRequest,
  NextResponse,
} from "next/server";

import crypto from "crypto";

import {
  connectMongoose,
} from "@/lib/mongodb";

import User from "@/models/User";

import {
  setCustomerSession,
} from "@/lib/customerAuth";

import {
  checkRateLimit,
} from "@/lib/rateLimit";

import {
  getClientIp,
} from "@/lib/requestSecurity";

import {
  isValidEmail,
  normalizeEmail,
  LOGIN_PASSWORD_MAX_LENGTH,
} from "@/lib/validation";

/*
 * ============================================
 * PASSWORD VERIFICATION
 * ============================================
 */

function verifyPassword(
  password: string,
  storedHash: string
): boolean {
  try {
    const [
      saltHex,
      keyHex,
    ] = String(
      storedHash || ""
    ).split(":");

    if (
      !saltHex ||
      !keyHex
    ) {
      return false;
    }

    const salt =
      Buffer.from(
        saltHex,
        "hex"
      );

    const storedKey =
      Buffer.from(
        keyHex,
        "hex"
      );

    if (
      salt.length === 0 ||
      storedKey.length === 0
    ) {
      return false;
    }

    const derivedKey =
      crypto.scryptSync(
        password,
        salt,
        storedKey.length
      );

    if (
      derivedKey.length !==
      storedKey.length
    ) {
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
          `customer-login-ip:${clientIp}`,
        limit: 10,
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
            "Too many login attempts. Please try again later.",
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
     * READ REQUEST
     * ========================================
     */

    let body: unknown;

    try {
      body =
        await request.json();
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

    const password =
      typeof requestBody.password ===
      "string"
        ? requestBody.password
        : "";

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

    if (!password) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Password is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * IMPORTANT:
     * Do not apply the new strong-password
     * creation policy here.
     *
     * Existing customers must remain able
     * to sign in with their existing password.
     */

    if (
      password.length >
      LOGIN_PASSWORD_MAX_LENGTH
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Password is too long.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ========================================
     * ACCOUNT RATE LIMIT
     * ========================================
     */

    const accountRateLimit =
      await checkRateLimit({
        key:
          `customer-login-account:${normalizedEmail}`,
        limit: 5,
        windowMs:
          15 * 60 * 1000,
      });

    if (
      !accountRateLimit.allowed
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Too many login attempts. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After":
              String(
                accountRateLimit.retryAfterSeconds
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

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid email or password.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * ========================================
     * VERIFY PASSWORD
     * ========================================
     */

    const passwordValid =
      verifyPassword(
        password,
        user.passwordHash
      );

    if (!passwordValid) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid email or password.",
        },
        {
          status: 401,
        }
      );
    }

    /*
     * ========================================
     * CREATE CUSTOMER SESSION
     * ========================================
     */

    await setCustomerSession(
      user._id.toString()
    );

    /*
     * ========================================
     * SUCCESS
     * ========================================
     */

    return NextResponse.json({
      success: true,

      message:
        "Login successful.",

      user: {
        id:
          user._id.toString(),

        name:
          user.name,

        email:
          user.email,
      },
    });
  } catch {
    console.error(
      "CUSTOMER LOGIN ERROR"
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to log in.",
      },
      {
        status: 500,
      }
    );
  }
}