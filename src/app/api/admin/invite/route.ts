import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { requireSuperAdmin } from "@/lib/adminAuth";
import { connectMongoose } from "@/lib/mongodb";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/requestSecurity";
import User from "@/models/User";
import AdminInvitationToken from "@/models/AdminInvitationToken";
import { sendAdminInvitationEmail } from "@/lib/email";

const INVITATION_TTL_MS = 30 * 60 * 1000;

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request);

  if (!auth.authorized) return auth.response;

  try {
    const rateLimit = await checkRateLimit({
      key: `admin-invite:${auth.admin.userId}:${getClientIp(request)}`,
      limit: 5,
      windowMs: 60 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Too many invitation attempts. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(
              rateLimit.retryAfterSeconds
            ),
          },
        }
      );
    }

    const body = await request.json();

    const name = String(body.name || "").trim();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();

    if (!name || !email) {
      return NextResponse.json(
        {
          success: false,
          error: "Name and email are required.",
        },
        { status: 400 }
      );
    }

    if (name.length > 100 || email.length > 254) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The supplied details are too long.",
        },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter a valid email address.",
        },
        { status: 400 }
      );
    }

    await connectMongoose();

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error:
            "An account with this email already exists.",
        },
        { status: 409 }
      );
    }

    await AdminInvitationToken.updateMany(
      { email, used: false },
      { $set: { used: true } }
    );

    const rawToken = crypto
      .randomBytes(32)
      .toString("hex");

    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    await AdminInvitationToken.create({
      email,
      name,
      tokenHash,
      expiresAt: new Date(
        Date.now() + INVITATION_TTL_MS
      ),
      used: false,
      invitedBy: auth.admin.userId,
    });

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      "http://localhost:3000";

    const inviteUrl =
      `${baseUrl}/admin/activate?token=` +
      encodeURIComponent(rawToken);

    try {
      await sendAdminInvitationEmail({
        email,
        name,
        inviteUrl,
        invitedByName: auth.admin.email,
      });
    } catch (error) {
      console.error(
        "ADMIN INVITATION EMAIL ERROR:",
        error
      );

      await AdminInvitationToken.updateOne(
        { tokenHash },
        { $set: { used: true } }
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to send the invitation email. No account was created.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Admin invitation sent successfully.",
    });
  } catch (error) {
    console.error(
      "ADMIN INVITATION ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to create the admin invitation.",
      },
      { status: 500 }
    );
  }
}