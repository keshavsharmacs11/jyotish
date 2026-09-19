import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/adminAuth";
import { connectMongoose } from "@/lib/mongodb";
import Feedback from "@/models/Feedback";

const ALLOWED_ACTIONS = [
  "approve",
  "reject",
  "unpublish",
] as const;

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const { searchParams } = new URL(request.url);

    const status =
      searchParams.get("status")?.trim() || "";

    const search =
      searchParams.get("search")?.trim().slice(0, 200) || "";

    const pageValue = Number(
      searchParams.get("page") || "1"
    );

    const limitValue = Number(
      searchParams.get("limit") || "20"
    );

    const page = Number.isFinite(pageValue)
      ? Math.max(1, Math.floor(pageValue))
      : 1;

    const limit = Number.isFinite(limitValue)
      ? Math.min(
          50,
          Math.max(1, Math.floor(limitValue))
        )
      : 20;

    await connectMongoose();

    const filter: Record<string, unknown> = {};

    if (
      status &&
      ["pending", "approved", "rejected"].includes(status)
    ) {
      filter.status = status;
    }

    if (search) {
      const escapedSearch = search.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );

      const regex = new RegExp(
        escapedSearch,
        "i"
      );

      filter.$or = [
        { feedbackId: regex },
        { name: regex },
        { email: regex },
        { serviceName: regex },
        { bookingId: regex },
        { message: regex },
      ];
    }

    const skip = (page - 1) * limit;

    const [feedback, total] = await Promise.all([
      Feedback.find(filter)
        .sort({
          updatedAt: -1,
          createdAt: -1,
        })
        .skip(skip)
        .limit(limit)
        .lean(),

      Feedback.countDocuments(filter),
    ]);

    const totalPages = Math.max(
      1,
      Math.ceil(total / limit)
    );

    return NextResponse.json({
      success: true,
      feedback,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    });
  } catch (error) {
    console.error(
      "ADMIN FEEDBACK LIST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load feedback.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body = await request.json();

    const feedbackId =
      typeof body.feedbackId === "string"
        ? body.feedbackId.trim()
        : "";

    const action =
      typeof body.action === "string"
        ? body.action.trim()
        : "";

    const adminNote =
      typeof body.adminNote === "string"
        ? body.adminNote.trim().slice(0, 2000)
        : "";

    if (!feedbackId) {
      return NextResponse.json(
        {
          success: false,
          error: "Feedback ID is required.",
        },
        { status: 400 }
      );
    }

    if (
      !(ALLOWED_ACTIONS as readonly string[]).includes(
        action
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid moderation action.",
        },
        { status: 400 }
      );
    }

    await connectMongoose();

    const feedback = await Feedback.findOne({
      feedbackId,
    });

    if (!feedback) {
      return NextResponse.json(
        {
          success: false,
          error: "Feedback not found.",
        },
        { status: 404 }
      );
    }

    const now = new Date();

    if (action === "approve") {
      feedback.status = "approved";
      feedback.publishedAt = now;

      if (adminNote) {
        feedback.adminNote = adminNote;
      }
    }

    if (action === "reject") {
      feedback.status = "rejected";
      feedback.publishedAt = undefined;

      if (adminNote) {
        feedback.adminNote = adminNote;
      }
    }

    if (action === "unpublish") {
      feedback.status = "approved";
      feedback.publishedAt = undefined;

      if (adminNote) {
        feedback.adminNote = adminNote;
      }
    }

    await feedback.save();

    return NextResponse.json({
      success: true,
      message:
        action === "approve"
          ? "Feedback approved and published."
          : action === "reject"
            ? "Feedback rejected."
            : "Feedback unpublished.",
      feedback,
    });
  } catch (error) {
    console.error(
      "ADMIN FEEDBACK MODERATION ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to update feedback.",
      },
      { status: 500 }
    );
  }
}