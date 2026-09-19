import { NextRequest, NextResponse } from "next/server";

import { connectMongoose } from "@/lib/mongodb";
import Feedback from "@/models/Feedback";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const serviceName =
      searchParams.get("service")?.trim().slice(0, 200) || "";

    const limitValue = Number(
      searchParams.get("limit") || "6"
    );

    const limit = Number.isFinite(limitValue)
      ? Math.min(20, Math.max(1, Math.floor(limitValue)))
      : 6;

    await connectMongoose();

    const filter: Record<string, unknown> = {
      status: "approved",
      publishedAt: {
        $ne: null,
      },
    };

    if (serviceName) {
      filter.serviceName = serviceName;
    }

    const feedback = await Feedback.find(filter)
      .select(
        "feedbackId name rating message serviceName verifiedCustomer publishedAt createdAt"
      )
      .sort({
        publishedAt: -1,
        createdAt: -1,
      })
      .limit(limit)
      .lean();

    return NextResponse.json({
      success: true,
      feedback,
    });
  } catch (error) {
    console.error(
      "PUBLIC FEEDBACK API ERROR:",
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