import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import clientPromise from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      name,
      email,
      password,
      phone,
    } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Name, email and password are required.",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Admin password must be at least 8 characters long.",
        },
        { status: 400 }
      );
    }

    const normalizedEmail =
      email.trim().toLowerCase();

    /*
     * Make sure MongoDB is available.
     */

    const client = await clientPromise;

    await client
      .db("codepunkdb")
      .command({ ping: 1 });

    /*
     * Check whether this email already exists.
     */

    const existingUser =
      await User.findOne({
        email: normalizedEmail,
      });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A user with this email already exists.",
        },
        { status: 409 }
      );
    }

    /*
     * NEVER store the plain-text password.
     *
     * bcrypt creates a secure password hash.
     */

    const passwordHash =
      await bcrypt.hash(
        password,
        12
      );

    /*
     * Create the Admin account.
     */

    const admin =
      await User.create({
        name: name.trim(),

        email:
          normalizedEmail,

        phone:
          phone?.trim() || "",

        passwordHash,

        role: "admin",
      });

    console.log(
      "Admin user created:",
      {
        id: admin._id,
        email: admin.email,
        role: admin.role,
      }
    );

    return NextResponse.json(
      {
        success: true,
        message:
          "Admin account created successfully.",

        admin: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          phone: admin.phone,
          role: admin.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "ADMIN CREATION ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to create admin account.",
      },
      { status: 500 }
    );
  }
}