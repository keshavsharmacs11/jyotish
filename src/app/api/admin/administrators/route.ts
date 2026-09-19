import { NextRequest, NextResponse } from "next/server";

import {
  requireSuperAdmin,
} from "@/lib/adminAuth";
import { connectMongoose } from "@/lib/mongodb";
import User from "@/models/User";
import Consultant from "@/models/Consultant";

/*
 * =========================================================
 * GET ALL ADMINISTRATORS
 * =========================================================
 */

export async function GET(
  request: NextRequest
) {
  const auth =
    await requireSuperAdmin(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    await connectMongoose();

    const administrators =
      await User.find({
        role: "admin",
      })
        .select(
          "name email phone role isSuperAdmin active consultantProfileEligible createdAt updatedAt"
        )
        .sort({
          isSuperAdmin: -1,
          active: -1,
          name: 1,
        })
        .lean();

    return NextResponse.json({
      success: true,
      administrators: administrators.map(
        (administrator) => ({
          id:
            administrator._id.toString(),
          name: administrator.name,
          email: administrator.email,
          phone:
            administrator.phone || "",
          role: administrator.role,
          isSuperAdmin:
            administrator.isSuperAdmin === true,
          active:
            administrator.active !== false,
          consultantProfileEligible:
            administrator.consultantProfileEligible === true,
          createdAt:
            administrator.createdAt,
          updatedAt:
            administrator.updatedAt,
        })
      ),
    });
  } catch (error) {
    console.error(
      "ADMINISTRATOR LIST ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to load administrators.",
      },
      { status: 500 }
    );
  }
}

/*
 * =========================================================
 * UPDATE ADMINISTRATOR ACCESS
 * =========================================================
 *
 * Only the Super Administrator can change
 * administrator access.
 *
 * The Super Administrator cannot deactivate
 * their own account.
 *
 * This endpoint changes access only.
 * It does not change roles or passwords.
 * =========================================================
 */

export async function PUT(
  request: NextRequest
) {
  const auth =
    await requireSuperAdmin(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    const body =
      await request.json();

    const administratorId =
      String(
        body.administratorId || ""
      ).trim();

    const requestedActive =
      body.active;

    if (!administratorId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Administrator ID is required.",
        },
        { status: 400 }
      );
    }

    if (
      typeof requestedActive !==
      "boolean"
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Administrator access status must be true or false.",
        },
        { status: 400 }
      );
    }

    if (
      administratorId ===
      auth.admin.userId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "You cannot deactivate your own Super Administrator account.",
        },
        { status: 403 }
      );
    }

    await connectMongoose();

    const targetAdministrator =
      await User.findOne({
        _id: administratorId,
        role: "admin",
      });

    if (!targetAdministrator) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Administrator account not found.",
        },
        { status: 404 }
      );
    }

    /*
     * Never allow the configured Super Administrator
     * to be deactivated through this endpoint.
     *
     * This protects the owner account even if the
     * database flag is missing.
     */

    const configuredSuperAdminEmail = (
      process.env.SUPER_ADMIN_EMAIL ||
      ""
    )
      .trim()
      .toLowerCase();

    const targetEmail = String(
      targetAdministrator.email || ""
    )
      .trim()
      .toLowerCase();

    const targetIsSuperAdmin =
      targetAdministrator.isSuperAdmin === true ||
      (
        Boolean(
          configuredSuperAdminEmail
        ) &&
        targetEmail ===
          configuredSuperAdminEmail
      );

    if (targetIsSuperAdmin) {
      return NextResponse.json(
        {
          success: false,
          error:
            "The Super Administrator account is protected and cannot be deactivated.",
        },
        { status: 403 }
      );
    }

    const linkedConsultant = await Consultant.findOne({
      administratorId: targetAdministrator._id,
    });

    /*
     * Keep the administrator and their self-owned consultant
     * profile synchronized. Revoking the administrator hides
     * the linked consultant from active consultant management;
     * restoring the administrator restores the same consultant
     * profile and ID.
     */
    if (linkedConsultant) {
      linkedConsultant.active = requestedActive;
      await linkedConsultant.save();
    }

    try {
      targetAdministrator.active = requestedActive;
      await targetAdministrator.save();
    } catch (saveError) {
      if (linkedConsultant) {
        linkedConsultant.active = !requestedActive;
        await linkedConsultant.save().catch(() => undefined);
      }
      throw saveError;
    }

    return NextResponse.json({
      success: true,
      message: requestedActive
        ? "Administrator access restored successfully."
        : "Administrator access revoked successfully.",
      administrator: {
        id:
          targetAdministrator._id.toString(),
        name:
          targetAdministrator.name,
        email:
          targetAdministrator.email,
        phone:
          targetAdministrator.phone || "",
        role:
          targetAdministrator.role,
        isSuperAdmin:
          targetAdministrator.isSuperAdmin ===
          true,
        active:
          targetAdministrator.active !==
          false,
        createdAt:
          targetAdministrator.createdAt,
        updatedAt:
          targetAdministrator.updatedAt,
      },
    });
  } catch (error) {
    console.error(
      "ADMINISTRATOR ACCESS UPDATE ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Unable to update administrator access.",
      },
      { status: 500 }
    );
  }
}