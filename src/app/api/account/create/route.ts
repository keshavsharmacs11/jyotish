import {
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

/*
 * ============================================
 * PASSWORD HASHING
 * ============================================
 *
 * We use Node's built-in scrypt.
 *
 * The actual password is NEVER stored.
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
 * POST
 * ============================================
 */

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const {
      email,
      password,
      bookingId,
    } = body;

    /*
     * ========================================
     * BASIC VALIDATION
     * ========================================
     */

    const normalizedEmail =
      String(email || "")
        .trim()
        .toLowerCase();

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
      !password ||
      typeof password !==
        "string"
    ) {
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

    if (!bookingId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Booking ID is required.",
        },
        {
          status: 400,
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
     * FIND BOOKING
     * ========================================
     */

    const booking =
      await Booking.findOne({
        bookingId:
          String(
            bookingId
          ).trim(),
      });

    if (!booking) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Booking could not be found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * ========================================
     * SECURITY CHECK
     * ========================================
     *
     * The account email MUST match the
     * email used for the booking.
     */

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
            "The account email does not match the booking email.",
        },
        {
          status: 403,
        }
      );
    }

    /*
     * ========================================
     * PAYMENT CHECK
     * ========================================
     *
     * Only paid bookings can be connected
     * through this post-payment account flow.
     */

    if (
      booking.paymentStatus !==
      "paid"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This booking has not been successfully paid.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * ========================================
     * CHECK EXISTING USER
     * ========================================
     */

    const existingUser =
      await User.findOne({
        email:
          normalizedEmail,
      });

    /*
     * ========================================
     * EXISTING ACCOUNT
     * ========================================
     */

    if (existingUser) {
      /*
       * If this booking already belongs
       * to this user, we can simply log
       * them in.
       */

      if (
        booking.userId &&
        booking.userId.toString() ===
          existingUser._id.toString()
      ) {
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

      /*
       * An account exists with this email
       * but the booking isn't connected.
       *
       * We can safely connect it because
       * the booking email matches the
       * existing user's email.
       */

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

    /*
     * ========================================
     * CREATE NEW USER
     * ========================================
     */

    const passwordHash =
      hashPassword(
        password
      );

    const user =
      await User.create({
        name:
          booking.customer
            ?.fullName ||
          "Customer",

        email:
          normalizedEmail,

        phone:
          booking.customer
            ?.mobile ||
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

    booking.userId =
      user._id;

    await booking.save();

    /*
     * ========================================
     * CREATE LOGIN SESSION
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
          "Account created and booking connected successfully.",

        user: {
          id:
            user._id.toString(),

          name:
            user.name,

          email:
            user.email,
        },

        bookingId:
          booking.bookingId,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "ACCOUNT CREATION ERROR:",
      error
    );

    /*
     * Duplicate email race-condition
     */

    if (
      error &&
      typeof error === "object" &&
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

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to create account.",
      },
      {
        status: 500,
      }
    );
  }
}