import crypto from "crypto";
import { cookies } from "next/headers";

const SESSION_COOKIE_NAME = "customer_session";

function getSessionSecret(): string {
  const secret = process.env.CUSTOMER_SESSION_SECRET;

  if (!secret) {
    throw new Error(
      "CUSTOMER_SESSION_SECRET is not configured."
    );
  }

  return secret;
}

/*
 * ============================================
 * CREATE SESSION TOKEN
 * ============================================
 */

export function createCustomerSession(
  userId: string
): string {
  const secret = getSessionSecret();

  const signature = crypto
    .createHmac("sha256", secret)
    .update(userId)
    .digest("hex");

  return `${userId}.${signature}`;
}

/*
 * ============================================
 * VERIFY SESSION TOKEN
 * ============================================
 */

export function verifyCustomerSession(
  token: string
): string | null {
  try {
    if (!token) {
      console.error(
        "CUSTOMER AUTH: No session token provided."
      );

      return null;
    }

    const secret = getSessionSecret();

    /*
     * Token format:
     *
     * userId.signature
     */

    const separatorIndex =
      token.lastIndexOf(".");

    if (separatorIndex === -1) {
      console.error(
        "CUSTOMER AUTH: Invalid token format."
      );

      return null;
    }

    const userId = token.substring(
      0,
      separatorIndex
    );

    const signature = token.substring(
      separatorIndex + 1
    );

    if (!userId || !signature) {
      console.error(
        "CUSTOMER AUTH: Missing userId or signature."
      );

      return null;
    }

    /*
     * User ID should be a MongoDB ObjectId.
     */

    if (!/^[a-fA-F0-9]{24}$/.test(userId)) {
      console.error(
        "CUSTOMER AUTH: Invalid user ID format."
      );

      return null;
    }

    /*
     * Signature should be SHA-256
     * represented as 64 hexadecimal characters.
     */

    if (
      !/^[a-fA-F0-9]{64}$/.test(
        signature
      )
    ) {
      console.error(
        "CUSTOMER AUTH: Invalid signature format."
      );

      return null;
    }

    const expectedSignature =
      crypto
        .createHmac(
          "sha256",
          secret
        )
        .update(userId)
        .digest("hex");

    /*
     * Compare signatures safely.
     */

    const providedBuffer =
      Buffer.from(
        signature,
        "hex"
      );

    const expectedBuffer =
      Buffer.from(
        expectedSignature,
        "hex"
      );

    if (
      providedBuffer.length !==
      expectedBuffer.length
    ) {
      console.error(
        "CUSTOMER AUTH: Signature length mismatch."
      );

      return null;
    }

    if (
      !crypto.timingSafeEqual(
        providedBuffer,
        expectedBuffer
      )
    ) {
      console.error(
        "CUSTOMER AUTH: Signature verification failed."
      );

      return null;
    }

    console.log(
      "CUSTOMER AUTH: Session verified for user:",
      userId
    );

    return userId;
  } catch (error) {
    console.error(
      "CUSTOMER SESSION VERIFICATION ERROR:",
      error
    );

    return null;
  }
}

/*
 * ============================================
 * SET CUSTOMER SESSION
 * ============================================
 */

export async function setCustomerSession(
  userId: string
) {
  const cookieStore = await cookies();

  const token =
    createCustomerSession(userId);

  cookieStore.set(
    SESSION_COOKIE_NAME,
    token,
    {
      httpOnly: true,

      secure:
        process.env.NODE_ENV ===
        "production",

      sameSite: "lax",

      path: "/",

      maxAge:
        60 * 60 * 24 * 30,
    }
  );

  console.log(
    "CUSTOMER AUTH: Session created for user:",
    userId
  );
}

/*
 * ============================================
 * GET CURRENT CUSTOMER ID
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

    if (!cookie) {
      console.error(
        "CUSTOMER AUTH: customer_session cookie not found."
      );

      return null;
    }

    console.log(
      "CUSTOMER AUTH: customer_session cookie found."
    );

    /*
     * Don't print the actual token.
     */

    const userId =
      verifyCustomerSession(
        cookie.value
      );

    if (!userId) {
      console.error(
        "CUSTOMER AUTH: Cookie exists but could not be verified."
      );

      return null;
    }

    return userId;
  } catch (error) {
    console.error(
      "GET CUSTOMER ID ERROR:",
      error
    );

    return null;
  }
}

/*
 * ============================================
 * CLEAR SESSION
 * ============================================
 */

export async function clearCustomerSession() {
  const cookieStore =
    await cookies();

  cookieStore.delete(
    SESSION_COOKIE_NAME
  );
}