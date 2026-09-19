import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";

import { connectMongoose } from "@/lib/mongodb";
import User from "@/models/User";

export interface AdminTokenPayload {
  userId: string;
  email: string;
  role: string;
  authVersion: number;
  iat?: number;
  exp?: number;
}

function unauthorizedResponse(status: number, error: string) {
  return NextResponse.json(
    { success: false, error },
    { status }
  );
}

export async function requireAdmin(
  request: NextRequest
): Promise<
  | { authorized: true; admin: AdminTokenPayload }
  | { authorized: false; response: NextResponse }
> {
  try {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error("JWT_SECRET is not configured.");
      return {
        authorized: false,
        response: NextResponse.json(
          { success: false, error: "Authentication is not configured." },
          { status: 500 }
        ),
      };
    }

    const token = request.cookies.get("admin_token")?.value;

    if (!token) {
      return {
        authorized: false,
        response: unauthorizedResponse(401, "Authentication required."),
      };
    }

    const decoded = jwt.verify(token, jwtSecret) as jwt.JwtPayload;

    if (
      typeof decoded !== "object" ||
      !decoded ||
      typeof decoded.userId !== "string" ||
      typeof decoded.email !== "string" ||
      decoded.role !== "admin" ||
      !Number.isInteger(decoded.authVersion) ||
      decoded.authVersion < 1
    ) {
      return {
        authorized: false,
        response: unauthorizedResponse(
          403,
          "Administrator access required."
        ),
      };
    }

    await connectMongoose();

    const user = await User.findOne({
      _id: decoded.userId,
      role: "admin",
    }).select("_id email role active isSuperAdmin authVersion");

    if (!user) {
      return {
        authorized: false,
        response: unauthorizedResponse(
          401,
          "Administrator authentication is invalid."
        ),
      };
    }

    if (user.active === false) {
      return {
        authorized: false,
        response: unauthorizedResponse(
          403,
          "Your administrator access has been revoked."
        ),
      };
    }

    /*
     * Password-reset invalidation.
     *
     * Every admin JWT must carry the same authentication version
     * currently stored on the administrator account. When the
     * password is reset, the version is incremented and all older
     * JWTs immediately stop authorizing protected requests.
     */
    if (
      decoded.authVersion !== user.authVersion
    ) {
      return {
        authorized: false,
        response: unauthorizedResponse(
          401,
          "Administrator authentication is no longer valid. Please log in again."
        ),
      };
    }

    /*
     * Return live database identity rather than stale
     * email/role values from the JWT.
     */
    const admin: AdminTokenPayload = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      authVersion: user.authVersion,
      ...(typeof decoded.iat === "number" ? { iat: decoded.iat } : {}),
      ...(typeof decoded.exp === "number" ? { exp: decoded.exp } : {}),
    };

    return { authorized: true, admin };
  } catch (error) {
    console.error("ADMIN AUTH ERROR:", error);
    return {
      authorized: false,
      response: unauthorizedResponse(
        401,
        "Invalid or expired authentication."
      ),
    };
  }
}

export async function requireSuperAdmin(
  request: NextRequest
): Promise<
  | { authorized: true; admin: AdminTokenPayload }
  | { authorized: false; response: NextResponse }
> {
  const auth = await requireAdmin(request);

  if (!auth.authorized) {
    return auth;
  }

  try {
    const configuredSuperAdminEmail = (
      process.env.SUPER_ADMIN_EMAIL || ""
    )
      .trim()
      .toLowerCase();

    const adminEmail = auth.admin.email.trim().toLowerCase();

    if (
      configuredSuperAdminEmail &&
      adminEmail === configuredSuperAdminEmail
    ) {
      return {
        authorized: true,
        admin: auth.admin,
      };
    }

    await connectMongoose();

    const user = await User.findOne({
      _id: auth.admin.userId,
      role: "admin",
    }).select("_id email role active isSuperAdmin authVersion");

    if (!user || user.active === false) {
      return {
        authorized: false,
        response: unauthorizedResponse(
          403,
          "Administrator access is inactive."
        ),
      };
    }

    if (user.isSuperAdmin === true) {
      return {
        authorized: true,
        admin: auth.admin,
      };
    }

    return {
      authorized: false,
      response: unauthorizedResponse(
        403,
        "Super Administrator access required."
      ),
    };
  } catch (error) {
    console.error("SUPER ADMIN AUTH ERROR:", error);
    return {
      authorized: false,
      response: NextResponse.json(
        {
          success: false,
          error: "Unable to verify Super Administrator access.",
        },
        { status: 500 }
      ),
    };
  }
}
