import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { connectMongoose } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/adminAuth";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/requestSecurity";
import { sendConsultantInvitationEmail } from "@/lib/email";

import Consultant from "@/models/Consultant";
import ConsultantInvitationToken from "@/models/ConsultantInvitationToken";

const INVITATION_TTL_MS = 72 * 60 * 60 * 1000;

type InvitationRecord = {
  _id: unknown;
  name: string;
  email: string;
  createdAt: Date;
  expiresAt: Date;
};

function invitationView(invitation: InvitationRecord) {
  return {
    id: String(invitation._id),
    name: invitation.name,
    email: invitation.email,
    createdAt: invitation.createdAt,
    expiresAt: invitation.expiresAt,
    status:
      new Date(invitation.expiresAt).getTime() > Date.now()
        ? "pending"
        : "expired",
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    await connectMongoose();

    const invitations = await ConsultantInvitationToken.find({
      used: false,
      expiresAt: { $gt: new Date() },
    })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      success: true,
      count: invitations.length,
      invitations: invitations.map(invitationView),
    });
  } catch (error) {
    console.error("ADMIN CONSULTANT INVITATIONS GET ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load consultant invitations.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const rateLimit = await checkRateLimit({
      key: `consultant-invite:${auth.admin.userId}:${getClientIp(request)}`,
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Too many consultant invitation attempts. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }

    const body = await request.json();
    const name = String(body?.name ?? "").trim();
    const email = String(body?.email ?? "").trim().toLowerCase();

    if (!name || !email) {
      return NextResponse.json(
        {
          success: false,
          error: "Consultant name and email are required.",
        },
        { status: 400 },
      );
    }

    if (name.length > 100 || email.length > 254) {
      return NextResponse.json(
        {
          success: false,
          error: "The supplied details are too long.",
        },
        { status: 400 },
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter a valid email address.",
        },
        { status: 400 },
      );
    }

    await connectMongoose();

    const existingConsultant = await Consultant.findOne({ email }).select("_id name").lean();

    if (existingConsultant) {
      return NextResponse.json(
        {
          success: false,
          error: `${existingConsultant.name || "This consultant"} already has a consultant profile with this email. Open the existing profile instead of sending a new invitation.`,
        },
        { status: 409 },
      );
    }

    await ConsultantInvitationToken.updateMany(
      { email, used: false },
      { $set: { used: true } },
    );

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

    const invitation = await ConsultantInvitationToken.create({
      email,
      name,
      tokenHash,
      expiresAt,
      used: false,
      invitedBy: auth.admin.userId,
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const inviteUrl =
      `${baseUrl}/consultant/onboarding?token=` + encodeURIComponent(rawToken);

    try {
      await sendConsultantInvitationEmail({
        email,
        name,
        inviteUrl,
        invitedByName: auth.admin.email,
        expiresInHours: 72,
      });
    } catch (error) {
      console.error("CONSULTANT INVITATION EMAIL ERROR:", error);

      await ConsultantInvitationToken.updateOne(
        { _id: invitation._id },
        { $set: { used: true } },
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Unable to send the consultant invitation email. No consultant profile was created.",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Consultant invitation sent successfully.",
      invitation: invitationView(invitation),
    });
  } catch (error) {
    console.error("ADMIN CONSULTANT INVITATION POST ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to create the consultant invitation.",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdmin(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    await connectMongoose();

    const body = await request.json();
    const invitationId = String(body?.invitationId ?? "").trim();

    if (!invitationId) {
      return NextResponse.json(
        {
          success: false,
          error: "Invitation ID is required.",
        },
        { status: 400 },
      );
    }

    const invitation = await ConsultantInvitationToken.findOneAndUpdate(
      { _id: invitationId, used: false },
      { $set: { used: true } },
      { new: true },
    ).lean();

    if (!invitation) {
      return NextResponse.json(
        {
          success: false,
          error: "Invitation not found or already completed.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Consultant invitation cancelled.",
    });
  } catch (error) {
    console.error("ADMIN CONSULTANT INVITATION DELETE ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to cancel the consultant invitation.",
      },
      { status: 500 },
    );
  }
}
