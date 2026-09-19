import { NextResponse } from "next/server";

export async function POST() {
  try {
    const response = NextResponse.json({
      success: true,
      message: "Admin logged out successfully.",
    });

    /*
     * Clear the admin authentication cookie.
     */
    response.cookies.set("admin_token", "", {
      httpOnly: true,

      secure:
        process.env.NODE_ENV ===
        "production",

      sameSite: "lax",

      path: "/",

      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error(
      "ADMIN LOGOUT ERROR:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error: "Unable to log out.",
      },
      {
        status: 500,
      }
    );
  }
}