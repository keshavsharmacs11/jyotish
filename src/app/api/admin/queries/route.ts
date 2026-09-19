import { NextRequest, NextResponse } from "next/server";

import ContactQuery, {
  ContactQueryPriority,
  ContactQueryStatus,
} from "@/models/ContactQuery";
import { connectMongoose } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/adminAuth";
import { cleanMessage, cleanText } from "@/lib/contactValidation";

const ALLOWED_STATUSES: ContactQueryStatus[] = [
  "new",
  "in_progress",
  "resolved",
  "closed",
];

const ALLOWED_PRIORITIES: ContactQueryPriority[] = [
  "normal",
  "high",
  "urgent",
];

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getPositiveInteger(
  value: string | null,
  fallback: number,
  maximum: number
) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return fallback;
  }

  return Math.min(parsed, maximum);
}

export async function GET(request: NextRequest) {
  try {
        const auth = await requireAdmin(request);

        if (!auth.authorized) {
        return auth.response;
        }

    await connectMongoose();

    const { searchParams } = new URL(request.url);

    const search = cleanText(searchParams.get("search") || "", 160);
    const statusParam = cleanText(
      searchParams.get("status") || "",
      30
    ) as ContactQueryStatus;

    const priorityParam = cleanText(
      searchParams.get("priority") || "",
      30
    ) as ContactQueryPriority;

    const page = getPositiveInteger(
      searchParams.get("page"),
      1,
      100000
    );

    const limit = getPositiveInteger(
      searchParams.get("limit"),
      20,
      100
    );

    const filter: Record<string, unknown> = {};

    if (ALLOWED_STATUSES.includes(statusParam)) {
      filter.status = statusParam;
    }

    if (ALLOWED_PRIORITIES.includes(priorityParam)) {
      filter.priority = priorityParam;
    }

    if (search) {
      const safeSearch = escapeRegex(search);

      filter.$or = [
        { queryId: { $regex: safeSearch, $options: "i" } },
        { name: { $regex: safeSearch, $options: "i" } },
        { email: { $regex: safeSearch, $options: "i" } },
        { subject: { $regex: safeSearch, $options: "i" } },
        { message: { $regex: safeSearch, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [queries, total] = await Promise.all([
      ContactQuery.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ContactQuery.countDocuments(filter),
    ]);

    const totalPages = Math.max(Math.ceil(total / limit), 1);

    return NextResponse.json({
      success: true,
      queries,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Admin contact queries GET error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to load contact queries.",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
        const auth = await requireAdmin(request);

        if (!auth.authorized) {
        return auth.response;
        }

    await connectMongoose();

    const contentType = request.headers.get("content-type") || "";

    if (!contentType.toLowerCase().includes("application/json")) {
      return NextResponse.json(
        {
          success: false,
          message: "Request must use application/json.",
        },
        { status: 415 }
      );
    }

    const body = await request.json();

    const queryId = cleanText(body?.queryId, 100);
    const status = cleanText(
      body?.status,
      30
    ) as ContactQueryStatus;
    const priority = cleanText(
      body?.priority,
      30
    ) as ContactQueryPriority;

    if (!queryId) {
      return NextResponse.json(
        {
          success: false,
          message: "Query ID is required.",
        },
        { status: 400 }
      );
    }

    if (
      body?.status !== undefined &&
      !ALLOWED_STATUSES.includes(status)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid query status.",
        },
        { status: 400 }
      );
    }

    if (
      body?.priority !== undefined &&
      !ALLOWED_PRIORITIES.includes(priority)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid query priority.",
        },
        { status: 400 }
      );
    }

    const query = await ContactQuery.findOne({ queryId });

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          message: "Contact query not found.",
        },
        { status: 404 }
      );
    }

    if (body?.status !== undefined) {
      query.status = status;
    }

    if (body?.priority !== undefined) {
      query.priority = priority;
    }

    await query.save();

    return NextResponse.json({
      success: true,
      message: "Contact query updated successfully.",
      query,
    });
  } catch (error) {
    console.error("Admin contact queries PATCH error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to update contact query.",
      },
      { status: 500 }
    );
  }
}
