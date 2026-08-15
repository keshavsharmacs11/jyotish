import { NextResponse } from "next/server";

import { connectMongoose } from "@/lib/mongodb";

import Service from "@/models/Service";

export async function GET() {
  try {
    /*
     * ============================================
     * CONNECT TO MONGODB
     * ============================================
     */

    await connectMongoose();

    /*
     * ============================================
     * GET ACTIVE SERVICES
     * ============================================
     *
     * Only active services should be shown
     * to customers.
     */

    const services = await Service.find({
      active: true,
    })
      .sort({
        category: 1,
        name: 1,
      })
      .lean();

    /*
     * ============================================
     * SUCCESS
     * ============================================
     */

    return NextResponse.json({
      success: true,

      count: services.length,

      services,
    });
  } catch (error) {
    console.error(
      "GET SERVICES ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unable to fetch services.",
      },
      {
        status: 500,
      }
    );
  }
}