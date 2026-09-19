import { NextResponse } from "next/server";
import crypto from "crypto";
import bcrypt from "bcryptjs";

import { connectMongoose } from "@/lib/mongodb";
import User from "@/models/User";
import AdminInvitationToken from "@/models/AdminInvitationToken";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = String(body.token || "").trim();
    const password = String(body.password || "");
    const confirmPassword = String(body.confirmPassword || "");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Invitation token is missing." },
        { status: 400 }
      );
    }

    if (password.length < 12) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 12 characters long." },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: "Passwords do not match." },
        { status: 400 }
      );
    }

    await connectMongoose();

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const invitation = await AdminInvitationToken.findOne({ tokenHash, used: false });

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: "This invitation is invalid or has already been used." },
        { status: 400 }
      );
    }

    if (invitation.expiresAt.getTime() <= Date.now()) {
      invitation.used = true;
      await invitation.save();
      return NextResponse.json(
        { success: false, error: "This invitation has expired. Please ask an administrator to send a new invitation." },
        { status: 400 }
      );
    }

    const existingUser = await User.findOne({ email: invitation.email });
    if (existingUser) {
      invitation.used = true;
      await invitation.save();
      return NextResponse.json(
        { success: false, error: "An account with this email already exists." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await User.create({
      name: invitation.name,
      email: invitation.email,
      phone: "",
      passwordHash,
      role: "admin",
      consultantProfileEligible: true,
    });

    invitation.used = true;
    await invitation.save();

    return NextResponse.json({
      success: true,
      message: "Administrator account created successfully. You can now sign in.",
    });
  } catch (error) {
    console.error("ADMIN ACCOUNT ACTIVATION ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Unable to activate the administrator account." },
      { status: 500 }
    );
  }
}
