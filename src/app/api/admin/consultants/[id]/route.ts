import {
  NextRequest,
  NextResponse,
} from "next/server";

import { connectMongoose } from "@/lib/mongodb";
import {
  requireAdmin,
  requireSuperAdmin,
} from "@/lib/adminAuth";

import Consultant from "@/models/Consultant";
import Booking from "@/models/Booking";
import ConsultantInvitationToken from "@/models/ConsultantInvitationToken";
import Service from "@/models/Service";

/*
 * =========================================================
 * GET ONE CONSULTANT
 * =========================================================
 */

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const auth =
    await requireAdmin(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    await connectMongoose();

    const { id } =
      await context.params;

    const consultant =
      await Consultant.findById(id)
        .lean();

    if (!consultant) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Consultant not found.",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json({
      success: true,

      consultant,
    });
  } catch (error) {
    console.error(
      "ADMIN GET CONSULTANT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unable to fetch consultant.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * =========================================================
 * UPDATE CONSULTANT
 * =========================================================
 */

export async function PUT(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const auth =
    await requireAdmin(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    await connectMongoose();

    const { id } =
      await context.params;

    const body =
      await request.json();

    const {
      name,
      email,
      phone,
      photo,
      specialization,
      availableModes,
      availability,
      active,
    } = body;

    /*
     * =========================================
     * BASIC VALIDATION
     * =========================================
     */

    if (
      !name ||
      !email ||
      !phone ||
      !specialization
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Name, email, phone and specialization are required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =========================================
     * PHOTO VALIDATION
     * =========================================
     */

    if (
      photo !== undefined &&
      photo !== null &&
      typeof photo !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Invalid consultant photo.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      typeof photo === "string" &&
      photo.length >
        5 * 1024 * 1024
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Consultant photo is too large. Please use an image smaller than 5 MB.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =========================================
     * VALIDATE MODES
     * =========================================
     */

    const modes =
      Array.isArray(
        availableModes
      )
        ? availableModes
        : [
            "video",
            "voice",
          ];

    const validModes =
      modes.length > 0 &&
      modes.every(
        (mode: unknown) =>
          mode === "video" ||
          mode === "voice"
      );

    if (!validModes) {
      return NextResponse.json(
        {
          success: false,

          error:
            "At least one valid consultation mode is required.",
        },
        {
          status: 400,
        }
      );
    }

    /*
     * =========================================
     * NORMALIZE AVAILABILITY
     * =========================================
     */

    const normalizedAvailability =
      Array.isArray(
        availability
      )
        ? availability
            .filter(
              (item: any) =>
                item &&
                item.date
            )
            .map(
              (item: any) => ({
                date: String(
                  item.date
                ),

                times:
                  Array.isArray(
                    item.times
                  )
                    ? [
                        ...new Set(
                          item.times.map(
                            (
                              time: unknown
                            ) =>
                              String(
                                time
                              )
                          )
                        ),
                      ].sort()
                    : [],
              })
            )
        : [];

    /*
     * =========================================
     * PROTECT CONSULTANT ACTIVATION STATE
     * =========================================
     *
     * Regular administrators can edit consultant
     * details, modes and availability.
     *
     * Only the Super Administrator may change
     * whether a consultant is active/visible.
     */

    if (active !== undefined) {
      if (
        typeof active !==
        "boolean"
      ) {
        return NextResponse.json(
          {
            success: false,

            error:
              "Invalid consultant active status.",
          },
          {
            status: 400,
          }
        );
      }

      const superAdminAuth =
        await requireSuperAdmin(
          request
        );

      if (
        !superAdminAuth.authorized
      ) {
        return superAdminAuth.response;
      }
    }

    /*
     * =========================================
     * BUILD UPDATE
     * =========================================
     */

    const updateData: Record<
      string,
      any
    > = {
      name:
        String(name).trim(),

      email:
        String(email)
          .trim()
          .toLowerCase(),

      phone:
        String(phone).trim(),

      specialization:
        String(
          specialization
        ).trim(),

      availableModes:
        modes,

      availability:
        normalizedAvailability,

      ...(active !== undefined
        ? {
            active:
              Boolean(active),
          }
        : {}),
    };

    /*
     * =========================================
     * PHOTO
     * =========================================
     *
     * undefined = don't change existing photo
     *
     * string = save new photo
     *
     * "" = intentionally remove photo
     */

    if (
      typeof photo ===
      "string"
    ) {
      updateData.photo =
        photo;
    }

    /*
     * =========================================
     * UPDATE
     * =========================================
     */

    const consultant =
      await Consultant.findByIdAndUpdate(
        id,
        updateData,
        {
          returnDocument:
            "after",
          runValidators: true,
        }
      ).lean();

    if (!consultant) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Consultant not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * =========================================
     * SUCCESS
     * =========================================
     */

    return NextResponse.json({
      success: true,

      message:
        "Consultant updated successfully.",

      consultant,
    });
  } catch (error) {
    console.error(
      "ADMIN UPDATE CONSULTANT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unable to update consultant.",
      },
      {
        status: 500,
      }
    );
  }
}

/*
 * =========================================================
 * PATCH / CONSULTANT ACCESS
 * =========================================================
 *
 * Small access-only operation used by Settings.
 * This does not change profile fields or availability.
 * Only the Super Administrator can revoke/restore access.
 * =========================================================
 */

export async function PATCH(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const auth = await requireSuperAdmin(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    await connectMongoose();

    const { id } = await context.params;
    const body = await request.json();

    if (typeof body?.active !== "boolean") {
      return NextResponse.json(
        {
          success: false,
          error: "A boolean active status is required.",
        },
        { status: 400 },
      );
    }

    const consultant = await Consultant.findByIdAndUpdate(
      id,
      { $set: { active: body.active } },
      { new: true, runValidators: true },
    ).lean();

    if (!consultant) {
      return NextResponse.json(
        {
          success: false,
          error: "Consultant not found.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: body.active
        ? "Consultant access restored successfully."
        : "Consultant access revoked successfully.",
      consultant,
    });
  } catch (error) {
    console.error(
      "ADMIN CONSULTANT ACCESS PATCH ERROR:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to update consultant access.",
      },
      { status: 500 },
    );
  }
}

/*
 * =========================================================
 * DELETE / REMOVE CONSULTANT PROFILE
 * =========================================================
 *
 * Default DELETE = soft removal (active=false).
 *
 * DELETE with { permanent: true } = permanent removal.
 * Permanent removal is allowed for revoked consultants when
 * no future active booking remains assigned to the profile.
 *
 * This means:
 *
 * - The consultant disappears from the active consultant UI.
 * - The consultant is no longer customer-facing.
 * - Historical bookings remain intact.
 * - Historical consultant references remain intact.
 *
 * Any authenticated Administrator may use this action.
 *
 * The main consultant account is protected and cannot
 * be removed. The protected email is taken from the same
 * server-side SUPER_ADMIN_EMAIL configuration.
 * =========================================================
 */

export async function DELETE(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const auth =
    await requireAdmin(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    await connectMongoose();

    const { id } =
      await context.params;

    /*
     * =========================================
     * FIND CONSULTANT
     * =========================================
     */

    const consultant =
      await Consultant.findById(id);

    if (!consultant) {
      return NextResponse.json(
        {
          success: false,

          error:
            "Consultant not found.",
        },
        {
          status: 404,
        }
      );
    }

    const body = await request.json().catch(() => ({}));
    const permanent = body?.permanent === true;

    if (permanent) {
      const superAdminAuth =
        await requireSuperAdmin(request);

      if (!superAdminAuth.authorized) {
        return superAdminAuth.response;
      }
    }

    /*
     * =========================================
     * PROTECT MAIN CONSULTANT ACCOUNT
     * =========================================
     *
     * The main consultant uses the same protected
     * email configured for the Super Administrator.
     *
     * This protection is enforced server-side.
     */

    const configuredProtectedEmail = (
      process.env.SUPER_ADMIN_EMAIL ||
      ""
    )
      .trim()
      .toLowerCase();

    const consultantEmail =
      String(
        consultant.email || ""
      )
        .trim()
        .toLowerCase();

    if (
      configuredProtectedEmail &&
      consultantEmail ===
        configuredProtectedEmail
    ) {
      return NextResponse.json(
        {
          success: false,

          error:
            "The main consultant account is protected and cannot be removed.",
        },
        {
          status: 403,
        }
      );
    }

    if (permanent) {
      if (consultant.active) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Revoke consultant access before permanently deleting the profile.",
          },
          { status: 409 },
        );
      }

      /*
       * Historical bookings are allowed. They keep their stored
       * consultantName snapshot, so past booking history remains
       * readable even after the consultant profile is removed.
       *
       * Only a booking that is still upcoming must block permanent
       * removal. Completed and cancelled bookings are historical.
       */
      const now = new Date();
      const dateParts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(now);

      const timeParts = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      }).formatToParts(now);

      const datePart = (type: string) =>
        dateParts.find((part) => part.type === type)?.value || "";
      const timePart = (type: string) =>
        timeParts.find((part) => part.type === type)?.value || "";

      const today = `${datePart("year")}-${datePart("month")}-${datePart("day")}`;
      const currentTime = `${timePart("hour")}:${timePart("minute")}`;

      const futureBookingCount =
        await Booking.countDocuments({
          consultantId: consultant._id,
          status: {
            $nin: ["completed", "cancelled"],
          },
          $or: [
            { date: { $gt: today } },
            {
              date: today,
              time: { $gte: currentTime },
            },
          ],
        });

      if (futureBookingCount > 0) {
        return NextResponse.json(
          {
            success: false,
            error:
              `This consultant cannot be permanently deleted because ${futureBookingCount === 1 ? "a future booking is" : `${futureBookingCount} future bookings are`} still assigned to this profile. Reassign or complete those bookings first, or keep the profile revoked.`,
          },
          { status: 409 },
        );
      }

      /*
       * Remove the consultant from future service assignment lists.
       * This does not delete or modify any booking history.
       */
      await Service.updateMany(
        { consultantIds: consultant._id.toString() },
        { $pull: { consultantIds: consultant._id.toString() } },
      );

      /*
       * Invitation tokens are safe to clean up because the consultant
       * profile itself is being permanently removed.
       */
      await ConsultantInvitationToken.deleteMany({
        completedConsultantId: consultant._id,
      });

      await Consultant.deleteOne({
        _id: consultant._id,
      });

      return NextResponse.json({
        success: true,
        message:
          "Consultant profile permanently deleted.",
      });
    }

    /*
     * =========================================
     * SOFT REMOVE (DEFAULT / LEGACY BEHAVIOUR)
     * =========================================
     *
     * Keep the record for historical bookings.
     */

    consultant.active = false;

    await consultant.save();

    /*
     * =========================================
     * SUCCESS
     * =========================================
     */

    return NextResponse.json({
      success: true,

      message:
        "Consultant profile removed successfully.",

      consultant:
        consultant.toObject(),
    });
  } catch (error) {
    console.error(
      "ADMIN REMOVE CONSULTANT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unable to remove consultant profile.",
      },
      {
        status: 500,
      }
    );
  }
}
