import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import clientPromise, {
  connectMongoose,
} from "@/lib/mongodb";

import User from "@/models/User";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { email, password } = body;

    /*
     * ============================================
     * VALIDATE INPUT
     * ============================================
     */

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: "Email and password are required.",
        },
        { status: 400 }
      );
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    /*
     * ============================================
     * JWT SECRET
     * ============================================
     */

    const jwtSecret =
      process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error(
        "JWT_SECRET is not configured."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Authentication is not configured.",
        },
        { status: 500 }
      );
    }

    /*
     * ============================================
     * DATABASE CONNECTION
     * ============================================
     */

const client = await clientPromise;

await client
  .db("codepunkdb")
  .command({ ping: 1 });

/*
 * Connect Mongoose before using
 * Mongoose models such as User.
 */

await connectMongoose();

    /*
     * ============================================
     * FIND USER
     * ============================================
     */

    const user = await User.findOne({
      email: normalizedEmail,
    });

    /*
     * Do not reveal whether the email exists.
     */

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Invalid email or password.",
        },
        { status: 401 }
      );
    }

    /*
     * ============================================
     * CHECK ADMIN ROLE
     * ============================================
     */

    if (user.role !== "admin") {
      return NextResponse.json(
        {
          success: false,
          error:
            "You do not have permission to access the admin panel.",
        },
        { status: 403 }
      );
    }

    /*
     * ============================================
     * VERIFY PASSWORD
     * ============================================
     */

    const passwordValid =
      await bcrypt.compare(
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
        { status: 401 }
      );
    }

    /*
     * ============================================
     * CREATE JWT
     * ============================================
     */

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      },
      jwtSecret,
      {
        expiresIn: "1d",
      }
    );

    /*
     * ============================================
     * CREATE RESPONSE
     * ============================================
     */

    const response =
      NextResponse.json({
        success: true,
        message:
          "Admin login successful.",
        admin: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });

    /*
     * ============================================
     * SECURE AUTH COOKIE
     * ============================================
     *
     * httpOnly:
     * JavaScript cannot read the token.
     *
     * sameSite:
     * Helps protect against CSRF.
     *
     * secure:
     * HTTPS in production.
     */

    response.cookies.set(
      "admin_token",
      token,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24,
      }
    );

    return response;
  } catch (error) {
    console.error(
      "ADMIN LOGIN ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to process admin login.",
      },
      { status: 500 }
    );
  }
}