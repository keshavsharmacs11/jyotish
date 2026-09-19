import {
  connectMongoose,
} from "@/lib/mongodb";

import RateLimit from "@/models/RateLimit";

interface RateLimitOptions {
  key: string;
  limit: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

export async function checkRateLimit({
  key,
  limit,
  windowMs,
}: RateLimitOptions): Promise<RateLimitResult> {
  await connectMongoose();

  const now = new Date();

  const windowEnd = new Date(
    now.getTime() + windowMs
  );

  /*
   * Atomically increment an existing
   * active rate-limit window.
   *
   * This prevents concurrent requests
   * from bypassing the limit.
   */

  const existing =
    await RateLimit.findOneAndUpdate(
      {
        key,

        expiresAt: {
          $gt: now,
        },
      },
      {
        $inc: {
          count: 1,
        },
      },
      {
        returnDocument: "after",
      }
    );

  if (existing) {
    const allowed =
      existing.count <= limit;

    const retryAfterMs =
      existing.expiresAt.getTime() -
      now.getTime();

    return {
      allowed,

      remaining: allowed
        ? Math.max(
            limit - existing.count,
            0
          )
        : 0,

      retryAfterSeconds:
        Math.max(
          1,
          Math.ceil(
            retryAfterMs / 1000
          )
        ),
    };
  }

  /*
   * No active window exists.
   *
   * Create the first request in
   * the new window.
   */

  try {
    const created =
      await RateLimit.create({
        key,

        count: 1,

        windowStart: now,

        expiresAt:
          windowEnd,
      });

    return {
      allowed: true,

      remaining:
        Math.max(
          limit - created.count,
          0
        ),

      retryAfterSeconds:
        Math.max(
          1,
          Math.ceil(
            windowMs / 1000
          )
        ),
    };
  } catch (error) {
    /*
     * Another concurrent request may
     * have created the record first.
     *
     * Retry the atomic increment once.
     */

    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === 11000
    ) {
      const retried =
        await RateLimit.findOneAndUpdate(
          {
            key,

            expiresAt: {
              $gt: now,
            },
          },
          {
            $inc: {
              count: 1,
            },
          },
          {
            returnDocument: "after",
          }
        );

      if (retried) {
        const allowed =
          retried.count <= limit;

        const retryAfterMs =
          retried.expiresAt.getTime() -
          now.getTime();

        return {
          allowed,

          remaining: allowed
            ? Math.max(
                limit -
                  retried.count,
                0
              )
            : 0,

          retryAfterSeconds:
            Math.max(
              1,
              Math.ceil(
                retryAfterMs /
                  1000
              )
            ),
        };
      }
    }

    /*
     * Fail closed if the limiter
     * cannot determine the request count.
     */

    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 60,
    };
  }
}