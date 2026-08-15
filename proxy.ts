import {
  NextRequest,
  NextResponse,
} from "next/server";

import jwt from "jsonwebtoken";

export function proxy(
  request: NextRequest
) {
  const { pathname } =
    request.nextUrl;

  /*
   * ============================================
   * ONLY PROTECT ADMIN PAGES
   * ============================================
   *
   * /admin/login remains public.
   */

  if (
    pathname.startsWith("/admin") &&
    pathname !== "/admin/login"
  ) {
    /*
     * Get admin authentication cookie.
     */

    const token =
      request.cookies.get(
        "admin_token"
      )?.value;

    /*
     * No token means the user
     * is not authenticated.
     */

    if (!token) {
      return NextResponse.redirect(
        new URL(
          "/admin/login",
          request.url
        )
      );
    }

    /*
     * Get JWT secret.
     */

    const jwtSecret =
      process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error(
        "JWT_SECRET is not configured."
      );

      return NextResponse.redirect(
        new URL(
          "/admin/login",
          request.url
        )
      );
    }

    try {
      /*
       * Verify JWT.
       */

      const decoded =
        jwt.verify(
          token,
          jwtSecret
        ) as {
          userId?: string;
          email?: string;
          role?: string;
        };

      /*
       * Make sure this token belongs
       * to an administrator.
       */

      if (
        decoded.role !== "admin"
      ) {
        return NextResponse.redirect(
          new URL(
            "/admin/login",
            request.url
          )
        );
      }

      /*
       * Authentication successful.
       */

      return NextResponse.next();
    } catch (error) {
      console.error(
        "Admin authentication failed:",
        error
      );

      return NextResponse.redirect(
        new URL(
          "/admin/login",
          request.url
        )
      );
    }
  }

  /*
   * Everything else is allowed.
   */

  return NextResponse.next();
}

/*
 * ============================================
 * ROUTES PROTECTED BY PROXY
 * ============================================
 */

export const config = {
  matcher: [
    "/admin/:path*",
  ],
};