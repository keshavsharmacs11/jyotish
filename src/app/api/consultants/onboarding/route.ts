import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

import { connectMongoose } from "@/lib/mongodb";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/requestSecurity";

import Consultant from "@/models/Consultant";
import ConsultantInvitationToken from "@/models/ConsultantInvitationToken";

const MAX_PHOTO_LENGTH = 5 * 1024 * 1024;

function getToken(request: NextRequest): string {
  return request.nextUrl.searchParams.get("token")?.trim() || "";
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function invalidTokenResponse() {
  return NextResponse.json(
    {
      success: false,
      error:
        "This consultant invitation is invalid, expired, or has already been completed.",
    },
    { status: 410 },
  );
}

export async function GET(request: NextRequest) {
  try {
    const rateLimit = await checkRateLimit({
      key: `consultant-onboarding-read:${getClientIp(request)}`,
      limit: 30,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many requests. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        },
      );
    }

    const token = getToken(request);

    if (!token) {
      return invalidTokenResponse();
    }

    await connectMongoose();

    const invitation = await ConsultantInvitationToken.findOne({
      tokenHash: hashToken(token),
      used: false,
    }).lean();

    if (!invitation || invitation.expiresAt.getTime() <= Date.now()) {
      return invalidTokenResponse();
    }

    return NextResponse.json({
      success: true,
      invitation: {
        name: invitation.name,
        email: invitation.email,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error("CONSULTANT ONBOARDING GET ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to validate the consultant invitation.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit({
      key: `consultant-onboarding-write:${clientIp}`,
      limit: 10,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many attempts. Please try again later.",
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
    const token = String(body?.token ?? "").trim();
    const name = String(body?.name ?? "").trim();
    const phone = String(body?.phone ?? "").trim();
    const specialization = String(body?.specialization ?? "").trim();
    const photo = typeof body?.photo === "string" ? body.photo : "";
    const availableModes = Array.isArray(body?.availableModes)
      ? [...new Set(body.availableModes)]
      : [];

    if (!token) {
      return invalidTokenResponse();
    }

    if (!name || name.length > 100) {
      return NextResponse.json(
        {
          success: false,
          error: "Please provide a valid consultant name.",
        },
        { status: 400 },
      );
    }

    if (!phone || phone.length > 40) {
      return NextResponse.json(
        {
          success: false,
          error: "Please provide a valid phone number.",
        },
        { status: 400 },
      );
    }

    if (!specialization || specialization.length > 200) {
      return NextResponse.json(
        {
          success: false,
          error: "Please provide your area of specialization.",
        },
        { status: 400 },
      );
    }

    if (!photo || photo.length > MAX_PHOTO_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Please upload a consultant photo smaller than 5 MB.",
        },
        { status: 400 },
      );
    }

    const validModes =
      availableModes.length > 0 &&
      availableModes.every(
        (mode) => mode === "video" || mode === "voice",
      );

    if (!validModes) {
      return NextResponse.json(
        {
          success: false,
          error: "Select at least one consultation mode.",
        },
        { status: 400 },
      );
    }

    await connectMongoose();

    const tokenHash = hashToken(token);
    const invitation = await ConsultantInvitationToken.findOne({
      tokenHash,
      used: false,
    });

    if (!invitation || invitation.expiresAt.getTime() <= Date.now()) {
      if (invitation) {
        invitation.used = true;
        await invitation.save();
      }
      return invalidTokenResponse();
    }

    const existingConsultant = await Consultant.findOne({
      email: invitation.email,
    }).select("_id").lean();

    if (existingConsultant) {
      return NextResponse.json(
        {
          success: false,
          error:
            "A consultant profile with this email already exists. Please contact the administrator.",
        },
        { status: 409 },
      );
    }

    /*
     * Claim the one-time invitation before creating the profile.
     * A second concurrent request with the same token cannot claim it.
     */
    const claimedInvitation =
      await ConsultantInvitationToken.findOneAndUpdate(
        {
          tokenHash,
          used: false,
          expiresAt: { $gt: new Date() },
        },
        {
          $set: { used: true },
        },
        { new: true },
      );

    if (!claimedInvitation) {
      return invalidTokenResponse();
    }

    try {
      const consultant = await Consultant.create({
        name,
        email: claimedInvitation.email,
        phone,
        specialization,
        photo,
        availableModes,
        availability: [],
        active: true,
      });

      claimedInvitation.completedConsultantId = consultant._id;
      await claimedInvitation.save();

      return NextResponse.json({
        success: true,
        message: "Your consultant profile has been created successfully.",
        consultantId: consultant._id.toString(),
      });
    } catch (error) {
      await ConsultantInvitationToken.updateOne(
        { _id: claimedInvitation._id },
        {
          $set: {
            used: false,
            completedConsultantId: null,
          },
        },
      );

      throw error;
    }
  } catch (error) {
    console.error("CONSULTANT ONBOARDING POST ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to create your consultant profile right now.",
      },
      { status: 500 },
    );
  }
}
