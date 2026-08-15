import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

import User from "@/models/User";
import Service from "@/models/Service";
import Booking from "@/models/Booking";
import Payment from "@/models/Payment";
import Consultant from "@/models/Consultant";

export async function GET() {
  try {
    const client = await clientPromise;

    await client
      .db("codepunkdb")
      .command({ ping: 1 });

    const modelStatus = {
      User: User.modelName,
      Service: Service.modelName,
      Booking: Booking.modelName,
      Payment: Payment.modelName,
      Consultant: Consultant.modelName,
    };

    return NextResponse.json({
      success: true,
      message:
        "MongoDB and all models are working.",
      models: modelStatus,
    });
  } catch (error) {
    console.error(
      "Database model test error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Database model test failed.",
      },
      { status: 500 }
    );
  }
}