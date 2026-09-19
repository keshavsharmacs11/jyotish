import { NextRequest } from "next/server";

export function getClientIp(
  request: NextRequest
): string {
  /*
   * Prefer the first forwarded IP when
   * running behind a trusted reverse proxy.
   *
   * The value is used only for rate limiting.
   * It is never logged or returned to the client.
   */

  const forwardedFor =
    request.headers.get(
      "x-forwarded-for"
    );

  if (forwardedFor) {
    const firstIp =
      forwardedFor
        .split(",")[0]
        ?.trim();

    if (firstIp) {
      return firstIp;
    }
  }

  const realIp =
    request.headers.get(
      "x-real-ip"
    )?.trim();

  if (realIp) {
    return realIp;
  }

  return "unknown";
}
