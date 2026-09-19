import crypto from "crypto";
import { cookies } from "next/headers";

import {
  connectMongoose,
} from "@/lib/mongodb";

import User from "@/models/User";
import CustomerSession from "@/models/CustomerSession";

const SESSION_COOKIE_NAME =
  "customer_session";

const SESSION_DAYS = 30;

const SESSION_MAX_AGE =
  SESSION_DAYS *
  24 *
  60 *
  60;

function getSessionSecret(): string {
  const secret =
    process.env.CUSTOMER_SESSION_SECRET;

  if (!secret) {
    throw new Error(
      "CUSTOMER_SESSION_SECRET is not configured."
    );
  }

  return secret;
}

/*
 * ============================================
 * HASH SESSION SECRET
 * ============================================
 *
 * The raw session secret is only kept in the
 * browser cookie.
 *
 * MongoDB stores only its SHA-256 hash.
 */

function hashSessionSecret(
  sessionSecret: string
): string {
  return crypto
    .createHash("sha256")
    .update(
      sessionSecret +
        getSessionSecret()
    )
    .digest("hex");
}

/*
 * ============================================
 * CREATE SESSION
 * ============================================
 */

export async function setCustomerSession(
  userId: string
) {
  await connectMongoose();

  /*
   * Generate a completely opaque random
   * session credential.
   *
   * 32 bytes = 256 bits.
   */

  const sessionSecret =
    crypto.randomBytes(32)
      .toString("hex");

  const sessionHash =
    hashSessionSecret(
      sessionSecret
    );

  const expiresAt =
    new Date(
      Date.now() +
        SESSION_MAX_AGE * 1000
    );

  await CustomerSession.create({
    sessionHash,
    userId,
    expiresAt,
    lastUsedAt: new Date(),
    revokedAt: null,
  });

  const cookieStore =
    await cookies();

  cookieStore.set(
    SESSION_COOKIE_NAME,
    sessionSecret,
    {
      httpOnly: true,

      secure:
        process.env.NODE_ENV ===
        "production",

      sameSite: "lax",

      path: "/",

      maxAge:
        SESSION_MAX_AGE,
    }
  );
}

/*
 * ============================================
 * GET CURRENT CUSTOMER
 * ============================================
 */

export async function getCustomerId(): Promise<
  string | null
> {
  try {
    const cookieStore =
      await cookies();

    const cookie =
      cookieStore.get(
        SESSION_COOKIE_NAME
      );

    if (!cookie?.value) {
      return null;
    }

    const sessionHash =
      hashSessionSecret(
        cookie.value
      );

    await connectMongoose();

    const session =
      await CustomerSession.findOne({
        sessionHash,
        revokedAt: null,
        expiresAt: {
          $gt: new Date(),
        },
      });

    if (!session) {
      return null;
    }

    const user =
      await User.findOne({
        _id: session.userId,
        role: "customer",
      })
        .select("_id")
        .lean();

    if (!user) {
      /*
       * The account no longer exists as a
       * customer. Revoke the session.
       */

      await CustomerSession.updateOne(
        {
          _id: session._id,
        },
        {
          $set: {
            revokedAt: new Date(),
          },
        }
      );

      return null;
    }

    /*
     * Update session activity.
     *
     * We don't log any user/session
     * credentials here.
     */

    await CustomerSession.updateOne(
      {
        _id: session._id,
      },
      {
        $set: {
          lastUsedAt: new Date(),
        },
      }
    );

    return session.userId.toString();
  } catch {
    /*
     * Authentication failures should not
     * expose internal implementation details.
     */

    return null;
  }
}

/*
 * ============================================
 * LOG OUT CURRENT SESSION
 * ============================================
 */

export async function clearCustomerSession() {
  try {
    const cookieStore =
      await cookies();

    const cookie =
      cookieStore.get(
        SESSION_COOKIE_NAME
      );

    if (cookie?.value) {
      const sessionHash =
        hashSessionSecret(
          cookie.value
        );

      await connectMongoose();

      await CustomerSession.updateOne(
        {
          sessionHash,
          revokedAt: null,
        },
        {
          $set: {
            revokedAt: new Date(),
          },
        }
      );
    }
  } finally {
    const cookieStore =
      await cookies();

    cookieStore.delete(
      SESSION_COOKIE_NAME
    );
  }
}

/*
 * ============================================
 * REVOKE ALL CUSTOMER SESSIONS
 * ============================================
 *
 * Used after password reset or another
 * high-security account event.
 */

export async function revokeAllCustomerSessions(
  userId: string
) {
  await connectMongoose();

  await CustomerSession.updateMany(
    {
      userId,
      revokedAt: null,
    },
    {
      $set: {
        revokedAt: new Date(),
      },
    }
  );
}