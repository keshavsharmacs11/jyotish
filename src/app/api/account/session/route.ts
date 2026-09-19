import {
  NextResponse,
} from "next/server";

import {
  getCustomerId,
} from "@/lib/customerAuth";

export async function GET() {
  try {
    const userId =
      await getCustomerId();

    return NextResponse.json({
      success: true,
      authenticated: !!userId,
    });
  } catch (error) {
    console.error(
      "CUSTOMER SESSION CHECK ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        authenticated: false,
      },
      {
        status: 500,
      }
    );
  }
}