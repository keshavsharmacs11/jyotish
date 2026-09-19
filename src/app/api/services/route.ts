import { NextResponse } from "next/server";

import { connectMongoose } from "@/lib/mongodb";
import Service from "@/models/Service";

export async function GET() {
  try {
    await connectMongoose();

    const services = await Service.find(
      { active: true },
      {
        _id: 0,
        serviceId: 1,
        name: 1,
        category: 1,
        description: 1,
        duration: 1,
        price: 1,
        currency: 1,
        availableModes: 1,
        active: 1,
      },
    )
      .sort({
        category: 1,
        name: 1,
      })
      .lean();

    return NextResponse.json({
      success: true,
      count: services.length,
      services,
    });
  } catch (error) {
    console.error("GET SERVICES ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Unable to fetch services.",
      },
      { status: 500 },
    );
  }
}