import {
  NextRequest,
  NextResponse,
} from "next/server";

import { connectMongoose } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/adminAuth";

import Consultant from "@/models/Consultant";

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

      active:
        active === undefined
          ? true
          : Boolean(active),
    };

    /*
     * =========================================
     * PHOTO
     * =========================================
     *
     * Important:
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
          new: true,
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
 * DELETE / DEACTIVATE CONSULTANT
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

    const consultant =
      await Consultant.findByIdAndUpdate(
        id,
        {
          active: false,
        },
        {
          new: true,
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

    return NextResponse.json({
      success: true,

      message:
        "Consultant deactivated successfully.",

      consultant,
    });
  } catch (error) {
    console.error(
      "ADMIN DELETE CONSULTANT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unable to deactivate consultant.",
      },
      {
        status: 500,
      }
    );
  }
}