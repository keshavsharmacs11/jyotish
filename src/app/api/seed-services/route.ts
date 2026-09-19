import { NextResponse } from "next/server";

import { connectMongoose } from "@/lib/mongodb";

import Service from "@/models/Service";

import { services } from "@/data/services";

export async function GET() {
  /*
   * ============================================
   * PRODUCTION SAFETY
   * ============================================
   *
   * This endpoint is a development/maintenance
   * helper that writes service data to MongoDB.
   * It must never be publicly usable in production.
   */
  if (process.env.NODE_ENV === "production") {
    return new NextResponse(null, {
      status: 404,
    });
  }

  try {
    /*
     * ============================================
     * CONNECT MONGOOSE
     * ============================================
     */

    await connectMongoose();

    console.log(
      "Mongoose connected successfully."
    );

    /*
     * ============================================
     * SEED SERVICES
     * ============================================
     */

    const results = [];

    for (const service of services) {
      const result =
        await Service.updateOne(
          {
            serviceId: service.id,
          },

          {
            $set: {
              serviceId: service.id,

              name: service.name,

              category:
                service.category,

              description:
                service.description,

              duration:
                service.duration,

              price:
                service.price,

              currency: "INR",

              consultantIds:
                service.consultantIds,

              availableModes:
                service.availableModes,

              active:
                service.active,
            },
          },

          {
            upsert: true,
          }
        );

      results.push({
        serviceId: service.id,

        matched:
          result.matchedCount,

        modified:
          result.modifiedCount,

        created:
          result.upsertedCount,
      });
    }

    /*
     * ============================================
     * SUCCESS
     * ============================================
     */

    return NextResponse.json({
      success: true,

      message:
        "Services successfully seeded.",

      count:
        services.length,

      results,
    });
  } catch (error) {
    console.error(
      "SERVICE SEEDING ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unable to seed services.",
      },

      {
        status: 500,
      }
    );
  }
}