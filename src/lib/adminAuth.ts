import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import { connectMongoose } from "@/lib/mongodb";
import User from "@/models/User";

export interface AdminTokenPayload {
  userId: string;
  email: string;
  role: string;
}

function unauthorizedResponse(
  status: number,
  error: string
) {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status }
  );
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

    const jwtSecret =
      process.env.JWT_SECRET;

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
     * READ AUTH COOKIE
     * ============================================
     */

    const token =
      request.cookies.get(
        "admin_token"
      )?.value;

    if (!token) {
      return {
        authorized: false,
        response:
          unauthorizedResponse(
            401,
            "Authentication required."
          ),
      };
    }

    /*
     * ============================================
     * VERIFY JWT
     * ============================================
     */

    const decoded =
      jwt.verify(
        token,
        jwtSecret
      ) as AdminTokenPayload;

    if (
      !decoded ||
      typeof decoded !== "object" ||
      !decoded.userId ||
      !decoded.email ||
      decoded.role !== "admin"
    ) {
      return {
        authorized: false,
        response:
          unauthorizedResponse(
            403,
            "Administrator access required."
          ),
      };
    }

    /*
     * ============================================
     * LIVE DATABASE ADMIN CHECK
     * ============================================
     *
     * IMPORTANT SECURITY CONTROL:
     *
     * A JWT can remain valid until its expiry.
     * However, administrator access can be revoked
     * before that JWT expires.
     *
     * Therefore we NEVER trust the JWT alone.
     * We re-check the administrator account in
     * MongoDB on every protected admin request.
     */

    await connectMongoose();

    const user =
      await User.findOne({
        _id: decoded.userId,
        role: "admin",
      }).select(
        "_id email role active isSuperAdmin"
      );

    /*
     * No matching admin account.
     */

    if (!user) {
      return {
        authorized: false,
        response:
          unauthorizedResponse(
            401,
            "Administrator authentication is invalid."
          ),
      };
    }

    /*
     * Account was explicitly deactivated.
     *
     * Existing JWTs must stop working immediately.
     */

    if (user.active === false) {
      return {
        authorized: false,
        response:
          unauthorizedResponse(
            403,
            "Your administrator access has been revoked."
          ),
      };
    }

    /*
     * ============================================
     * RETURN SERVER-VERIFIED ADMIN IDENTITY
     * ============================================
     *
     * Keep the JWT payload as the returned identity
     * so existing callers remain compatible.
     *
     * The important authorization decision above
     * has already been verified against MongoDB.
     */

    return {
      authorized: true,
      admin: decoded,
    };
  } catch (error) {
    /*
     * Do not expose JWT/database internals to clients.
     */

    console.error(
      "ADMIN AUTH ERROR:",
      error
    );

    return {
      authorized: false,
      response:
        unauthorizedResponse(
          401,
          "Invalid or expired authentication."
        ),
    };
  }
}

export async function requireSuperAdmin(
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
  /*
   * First verify the admin account itself.
   *
   * This also checks the live MongoDB account and
   * therefore prevents inactive administrators from
   * reaching Super Administrator authorization.
   */

  const auth =
    await requireAdmin(request);

  if (!auth.authorized) {
    return auth;
  }

  try {
    /*
     * ============================================
     * CONFIGURED SUPER ADMIN
     * ============================================
     *
     * The configured Super Administrator email is
     * server-side only and cannot be promoted from
     * the browser.
     */

    const configuredSuperAdminEmail = (
      process.env.SUPER_ADMIN_EMAIL ||
      ""
    )
      .trim()
      .toLowerCase();

    const adminEmail =
      String(
        auth.admin.email || ""
      )
        .trim()
        .toLowerCase();

    /*
     * ============================================
     * ENVIRONMENT-BASED SUPER ADMIN
     * ============================================
     */

    if (
      configuredSuperAdminEmail &&
      adminEmail ===
        configuredSuperAdminEmail
    ) {
      return {
        authorized: true,
        admin: auth.admin,
      };
    }

    /*
     * ============================================
     * DATABASE-BASED SUPER ADMIN
     * ============================================
     */

    await connectMongoose();

    const user =
      await User.findOne({
        _id: auth.admin.userId,
        role: "admin",
      }).select(
        "_id email role active isSuperAdmin"
      );

    /*
     * Defensive active check.
     *
     * requireAdmin() already performed this check,
     * but keeping it here makes the privilege boundary
     * explicit and safe if this function is changed
     * independently in the future.
     */

    if (
      !user ||
      user.active === false
    ) {
      return {
        authorized: false,
        response:
          unauthorizedResponse(
            403,
            "Administrator access is inactive."
          ),
      };
    }

    /*
     * ============================================
     * DATABASE SUPER ADMIN
     * ============================================
     */

    if (
      user.isSuperAdmin === true
    ) {
      return {
        authorized: true,
        admin: auth.admin,
      };
    }

    /*
     * ============================================
     * NOT SUPER ADMIN
     * ============================================
     */

    return {
      authorized: false,
      response:
        unauthorizedResponse(
          403,
          "Super Administrator access required."
        ),
    };
  } catch (error) {
    console.error(
      "SUPER ADMIN AUTH ERROR:",
      error
    );

    return {
      authorized: false,
      response: NextResponse.json(
        {
          success: false,
          error:
            "Unable to verify Super Administrator access.",
        },
        {
          status: 500,
        }
      ),
    };
  }
}