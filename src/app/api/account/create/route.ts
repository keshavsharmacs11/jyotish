import {
  NextRequest,
  NextResponse,
} from "next/server";

import crypto from "crypto";

import {
  connectMongoose,
} from "@/lib/mongodb";

import User from "@/models/User";
import Booking from "@/models/Booking";

import {
  setCustomerSession,
} from "@/lib/customerAuth";

import {
  checkRateLimit,
} from "@/lib/rateLimit";

import {
  getClientIp,
} from "@/lib/requestSecurity";

/*
 * ============================================
 * REQUEST / VALIDATION LIMITS
 * ============================================
 */

const MAX_REQUEST_BODY_BYTES =
  32 * 1024;

const MIN_PASSWORD_LENGTH = 10;
const MAX_PASSWORD_LENGTH = 128;
const MAX_EMAIL_LENGTH = 254;

const BOOKING_ID_PATTERN =
  /^AKJ-\d{4}-\d{6}$/i;

/*
 * ============================================
 * VALIDATION
 * ============================================
 */

function isValidEmail(
  email: string
): boolean {
  if (
    !email ||
    email.length >
      MAX_EMAIL_LENGTH
  ) {
    return false;
  }

  /*
   * Reject control characters and
   * obviously malformed addresses.
   */
  if (
    /[\u0000-\u001F\u007F]/.test(
      email
    )
  ) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

function isStrongPassword(
  password: string
): boolean {
  if (
    password.length <
      MIN_PASSWORD_LENGTH ||
    password.length >
      MAX_PASSWORD_LENGTH
  ) {
    return false;
  }

  /*
   * Strong password policy:
   *
   * - lowercase
   * - uppercase
   * - number
   * - special character
   *
   * Spaces are allowed, provided the
   * password still satisfies the policy.
   */
  const hasLowercase =
    /[a-z]/.test(
      password
    );

  const hasUppercase =
    /[A-Z]/.test(
      password
    );

  const hasNumber =
    /[0-9]/.test(
      password
    );

  const hasSpecial =
    /[^A-Za-z0-9]/.test(
      password
    );

  return (
    hasLowercase &&
    hasUppercase &&
    hasNumber &&
    hasSpecial
  );
}

/*
 * ============================================
 * PASSWORD HASHING
 * ============================================
 */

function hashPassword(
  password: string
): string {
  const salt =
    crypto.randomBytes(16);

  const derivedKey =
    crypto.scryptSync(
      password,
      salt,
      64
    );

  return `${salt.toString(
    "hex"
  )}:${derivedKey.toString(
    "hex"
  )}`;
}

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
 * GENERIC ERROR
 * ============================================
 */

function accountCreationError(
  status = 500
) {
  return NextResponse.json(
    {
      success: false,
      error:
        "Unable to create the account.",
    },
    {
      status,
    }
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
     *
     * 10 account-creation attempts per IP
     * within 15 minutes.
     */

    const clientIp =
      getClientIp(request);

    const ipRateLimit =
      await checkRateLimit({
        key:
          `customer-create-ip:${clientIp}`,
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
            "Too many account creation attempts. Please try again later.",
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
      String(
        requestBody.email || ""
      )
        .trim()
        .toLowerCase();

    const password =
      typeof requestBody.password ===
      "string"
        ? requestBody.password
        : "";

    const normalizedBookingId =
      String(
        requestBody.bookingId || ""
      ).trim();

    /*
     * ========================================
     * BASIC VALIDATION
     * ========================================
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

    if (
      password.length <
      MIN_PASSWORD_LENGTH
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Password must be at least 10 characters.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      password.length >
      MAX_PASSWORD_LENGTH
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Password must not exceed 128 characters.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !isStrongPassword(
        password
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      normalizedBookingId &&
      !BOOKING_ID_PATTERN.test(
        normalizedBookingId
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid booking reference.",
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
     *
     * 5 attempts per email within 15 minutes.
     */

    const accountRateLimit =
      await checkRateLimit({
        key:
          `customer-create-account:${normalizedEmail}`,
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
            "Too many account creation attempts. Please try again later.",
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
     * OPTIONAL BOOKING CONNECTION
     * ========================================
     *
     * A customer may create an account directly
     * from the Account menu, or from a successful
     * guest booking where bookingId is present.
     */

    let booking: any = null;

    if (normalizedBookingId) {
      booking =
        await Booking.findOne({
          bookingId:
            normalizedBookingId,
        });

      /*
       * Do not expose whether a booking reference
       * exists, whether it is unpaid, or whether
       * its email differs from the submitted email.
       *
       * All invalid booking-link attempts use the
       * same generic response.
       */

      if (
        !booking ||
        booking.paymentStatus !==
          "paid"
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Unable to connect this booking to the account.",
          },
          {
            status: 400,
          }
        );
      }

      const bookingEmail =
        String(
          booking.customer?.email ||
            ""
        )
          .trim()
          .toLowerCase();

      if (
        !bookingEmail ||
        bookingEmail !==
          normalizedEmail
      ) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Unable to connect this booking to the account.",
          },
          {
            status: 400,
          }
        );
      }

      const existingBookingUserId =
        booking.userId
          ? booking.userId.toString()
          : null;

      const existingUser =
        await User.findOne({
          email:
            normalizedEmail,
          role: "customer",
        });

      if (
        existingBookingUserId
      ) {
        if (
          existingUser &&
          existingBookingUserId ===
            existingUser._id.toString()
        ) {
          const passwordValid =
            verifyPassword(
              password,
              existingUser.passwordHash
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

          await setCustomerSession(
            existingUser._id.toString()
          );

          return NextResponse.json({
            success: true,
            message:
              "Account already exists. You have been signed in.",
            user: {
              id:
                existingUser._id.toString(),
              name:
                existingUser.name,
              email:
                existingUser.email,
            },
            bookingId:
              booking.bookingId,
          });
        }

        return NextResponse.json(
          {
            success: false,
            error:
              "This booking is already connected to another customer account.",
          },
          {
            status: 409,
          }
        );
      }

      if (existingUser) {
        const passwordValid =
          verifyPassword(
            password,
            existingUser.passwordHash
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

        booking.userId =
          existingUser._id;

        await booking.save();

        await setCustomerSession(
          existingUser._id.toString()
        );

        return NextResponse.json({
          success: true,
          message:
            "Your booking has been connected to your existing account.",
          user: {
            id:
              existingUser._id.toString(),
            name:
              existingUser.name,
            email:
              existingUser.email,
          },
          bookingId:
            booking.bookingId,
        });
      }
    }

    /*
     * ========================================
     * CREATE NEW CUSTOMER ACCOUNT
     * ========================================
     */

    const passwordHash =
      hashPassword(
        password
      );

    const user =
      await User.create({
        name:
          booking?.customer?.fullName ||
          "Customer",

        email:
          normalizedEmail,

        phone:
          booking?.customer?.mobile ||
          "",

        passwordHash,

        role:
          "customer",
      });

    /*
     * ========================================
     * CONNECT BOOKING → USER
     * ========================================
     */

    if (booking) {
      booking.userId =
        user._id;

      await booking.save();
    }

    /*
     * ========================================
     * CREATE SESSION
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

    return NextResponse.json(
      {
        success: true,

        message:
          booking
            ? "Account created and booking connected successfully."
            : "Account created successfully.",

        user: {
          id:
            user._id.toString(),

          name:
            user.name,

          email:
            user.email,
        },

        bookingId:
          booking?.bookingId || null,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    /*
     * Never log:
     *
     * - password
     * - password hash
     * - token
     * - session secret
     * - cookie
     * - request body
     * - email
     * - booking ID
     */

    console.error(
      "ACCOUNT CREATION ERROR"
    );

    /*
     * Duplicate-email race condition.
     */

    if (
      error &&
      typeof error ===
        "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "An account with this email already exists.",
        },
        {
          status: 409,
        }
      );
    }

    return accountCreationError();
  }
}