import crypto from "crypto";
import { cookies } from "next/headers";

import { connectMongoose } from "@/lib/mongodb";

import User from "@/models/User";
import CustomerSession from "@/models/CustomerSession";

const SESSION_COOKIE_NAME = "customer_session";
const SESSION_DAYS = 30;
const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;

function getSessionSecret(): string {
  const secret = process.env.CUSTOMER_SESSION_SECRET;

  if (!secret) {
    throw new Error(
      "CUSTOMER_SESSION_SECRET is not configured."
    );
  }

  return secret;
}

function hashSessionSecret(sessionSecret: string): string {
  return crypto
    .createHash("sha256")
    .update(sessionSecret + getSessionSecret())
    .digest("hex");
}

export async function setCustomerSession(userId: string) {
  await connectMongoose();

  const sessionSecret = crypto.randomBytes(32).toString("hex");
  const sessionHash = hashSessionSecret(sessionSecret);

  const expiresAt = new Date(
    Date.now() + SESSION_MAX_AGE * 1000
  );

  await CustomerSession.create({
    sessionHash,
    userId,
    expiresAt,
    lastUsedAt: new Date(),
    revokedAt: null,
  });

  const cookieStore = await cookies();

  cookieStore.set(
    SESSION_COOKIE_NAME,
    sessionSecret,
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    }
  );
}

export async function getCustomerId(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!cookie?.value) {
      return null;
    }

    const sessionHash = hashSessionSecret(cookie.value);

    await connectMongoose();

    const session = await CustomerSession.findOne({
      sessionHash,
      revokedAt: null,
      expiresAt: {
        $gt: new Date(),
      },
    });

    if (!session) {
      return null;
    }

    /*
     * Check the live customer record on every authenticated
     * request. This makes account deactivation take effect
     * immediately, just like session revocation.
     */
    const user = await User.findOne({
      _id: session.userId,
      role: "customer",
    })
      .select("_id active")
      .lean();

    if (!user || user.active === false) {
      await CustomerSession.updateOne(
        { _id: session._id },
        { $set: { revokedAt: new Date() } }
      );

      return null;
    }

    await CustomerSession.updateOne(
      { _id: session._id },
      { $set: { lastUsedAt: new Date() } }
    );

    return session.userId.toString();
  } catch {
    return null;
  }
}

export async function clearCustomerSession() {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (cookie?.value) {
      const sessionHash = hashSessionSecret(cookie.value);

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
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
  }
}

export async function revokeAllCustomerSessions(userId: string) {
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
