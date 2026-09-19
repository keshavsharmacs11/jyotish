import { NextRequest, NextResponse } from "next/server";

import { requireAdmin } from "@/lib/adminAuth";
import { connectMongoose } from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  try {
    await connectMongoose();

    const user = await User.findOne({
      _id: auth.admin.userId,
      role: "admin",
    }).select(
      "name email phone role isSuperAdmin active consultantProfileEligible createdAt updatedAt"
    );

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "Administrator account could not be found.",
        },
        { status: 404 }
      );
    }

    /*
     * Super Administrator is identified server-side by either:
     *
     * 1. The explicit database flag, or
     * 2. The server-only SUPER_ADMIN_EMAIL environment variable.
     *
     * This keeps the browser from being able to grant itself
     * Super Administrator privileges.
     */
    const configuredSuperAdminEmail = (
      process.env.SUPER_ADMIN_EMAIL || ""
    )
      .trim()
      .toLowerCase();

    const userEmail = String(user.email || "")
      .trim()
      .toLowerCase();

    const isSuperAdmin =
      Boolean(user.isSuperAdmin) ||
      (
        Boolean(configuredSuperAdminEmail) &&
        userEmail === configuredSuperAdminEmail
      );

    return NextResponse.json({
      success: true,
      admin: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        role: user.role,
        isSuperAdmin,
        active: user.active !== false,
        consultantProfileEligible:
          user.consultantProfileEligible === true,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error("ADMIN ME ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to load administrator account.",
      },
      { status: 500 }
    );
  }
}
