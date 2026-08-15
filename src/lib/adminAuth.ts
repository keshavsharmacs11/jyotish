import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

export interface AdminTokenPayload {
  userId: string;
  email: string;
  role: string;
}

export async function requireAdmin(
  request: NextRequest
): Promise<
  | {
      authorized: true;
      admin: AdminTokenPayload;
    }
  | {
      authorized: false;
      response: NextResponse;
    }
> {
  try {
    /*
     * ============================================
     * JWT SECRET
     * ============================================
     */

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error(
        "JWT_SECRET is not configured."
      );

      return {
        authorized: false,
        response: NextResponse.json(
          {
            success: false,
            error:
              "Authentication is not configured.",
          },
          { status: 500 }
        ),
      };
    }

    /*
     * ============================================
     * GET ADMIN COOKIE
     * ============================================
     */

    const token =
      request.cookies.get("admin_token")?.value;

    if (!token) {
      return {
        authorized: false,
        response: NextResponse.json(
          {
            success: false,
            error: "Authentication required.",
          },
          { status: 401 }
        ),
      };
    }

    /*
     * ============================================
     * VERIFY JWT
     * ============================================
     */

    const decoded = jwt.verify(
      token,
      jwtSecret
    ) as AdminTokenPayload;

    /*
     * ============================================
     * VERIFY ADMIN ROLE
     * ============================================
     */

    if (
      !decoded ||
      decoded.role !== "admin"
    ) {
      return {
        authorized: false,
        response: NextResponse.json(
          {
            success: false,
            error:
              "Administrator access required.",
          },
          { status: 403 }
        ),
      };
    }

    /*
     * ============================================
     * SUCCESS
     * ============================================
     */

    return {
      authorized: true,
      admin: decoded,
    };
  } catch (error) {
    console.error(
      "ADMIN AUTH ERROR:",
      error
    );

    return {
      authorized: false,
      response: NextResponse.json(
        {
          success: false,
          error:
            "Invalid or expired authentication.",
        },
        { status: 401 }
      ),
    };
  }
}