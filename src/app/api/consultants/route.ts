import { NextResponse } from "next/server";

import { connectMongoose } from "@/lib/mongodb";
import Consultant from "@/models/Consultant";

/*
 * =========================================================
 * GET ACTIVE CONSULTANTS
 * =========================================================
 *
 * Public endpoint used by the booking page.
 *
 * We return the information required to determine:
 *
 * - whether the consultant is active
 * - which modes they support
 * - when they are available
 * - their public profile information
 *
 * Sensitive information such as:
 *
 * - email
 * - phone
 *
 * is NOT returned.
 */

export async function GET() {
  try {
    /*
     * =========================================
     * DATABASE
     * =========================================
     */

    await connectMongoose();

    /*
     * =========================================
     * FETCH ACTIVE CONSULTANTS
     * =========================================
     *
     * Only active consultants are exposed.
     *
     * IMPORTANT:
     *
     * availability is required by the booking
     * page to determine which consultant can
     * handle the selected date/time.
     */

    const consultants =
      await Consultant.find({
        active: true,
      })
        .select(
          "_id name photo specialization availableModes availability active"
        )
        .sort({
          name: 1,
        })
        .lean();

    /*
     * =========================================
     * SUCCESS
     * =========================================
     */

    return NextResponse.json({
      success: true,

      count:
        consultants.length,

      consultants,
    });
  } catch (error) {
    console.error(
      "PUBLIC CONSULTANTS ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unable to load consultants.",
      },
      {
        status: 500,
      }
    );
  }
}