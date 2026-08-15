import {
  NextRequest,
  NextResponse,
} from "next/server";

import { connectMongoose } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/adminAuth";

import Consultant from "@/models/Consultant";

/*
 * =========================================================
 * GET ALL CONSULTANTS
 * =========================================================
 */

export async function GET(
  request: NextRequest
) {
  const auth =
    await requireAdmin(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    await connectMongoose();

    const consultants =
      await Consultant.find({})
        .sort({
          active: -1,
          name: 1,
        })
        .lean();

    return NextResponse.json({
      success: true,

      count:
        consultants.length,

      consultants,
    });
  } catch (error) {
    console.error(
      "ADMIN GET CONSULTANTS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unable to fetch consultants.",
      },
      {
        status: 500,
      }
    );
  }
}


/*
 * =========================================================
 * CREATE CONSULTANT
 * =========================================================
 */

export async function POST(
  request: NextRequest
) {
  const auth =
    await requireAdmin(request);

  if (!auth.authorized) {
    return auth.response;
  }

  try {
    await connectMongoose();

    const body =
      await request.json();

    const {
      name,
      email,
      phone,
      specialization,
      photo,
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
     *
     * Photo is optional.
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

    /*
     * =========================================
     * PHOTO SIZE VALIDATION
     * =========================================
     *
     * The frontend already compresses the
     * image, but the API also protects the
     * database from very large payloads.
     */

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
     * BUILD CONSULTANT DATA
     * =========================================
     */

    const consultantData: Record<
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

      /*
       * Save photo.
       *
       * If no photo was selected, save an
       * empty string.
       */

      photo:
        typeof photo ===
        "string"
          ? photo
          : "",
    };

    /*
     * =========================================
     * CREATE
     * =========================================
     */

    const consultant =
      await Consultant.create(
        consultantData
      );

    /*
     * =========================================
     * SUCCESS
     * =========================================
     */

    return NextResponse.json(
      {
        success: true,

        message:
          "Consultant created successfully.",

        consultant,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "ADMIN CREATE CONSULTANT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unable to create consultant.",
      },
      {
        status: 500,
      }
    );
  }
}