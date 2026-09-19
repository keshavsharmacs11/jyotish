/*
 * ============================================
 * SHARED VALIDATION HELPERS
 * ============================================
 *
 * Keep user-input validation in one place so
 * customer account creation and password reset
 * use exactly the same rules.
 */

export const MAX_EMAIL_LENGTH = 254;

export const NEW_PASSWORD_MIN_LENGTH = 10;
export const NEW_PASSWORD_MAX_LENGTH = 128;

export const LOGIN_PASSWORD_MAX_LENGTH = 256;

export function normalizeEmail(
  value: unknown
): string {
  return String(
    value ?? ""
  )
    .trim()
    .toLowerCase();
}

export function isValidEmail(
  email: string
): boolean {
  if (
    !email ||
    email.length >
      MAX_EMAIL_LENGTH
  ) {
    return false;
  }

  /*
   * Reject control characters.
   */
  if (
    /[\u0000-\u001F\u007F]/.test(
      email
    )
  ) {
    return false;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email
  );
}

export function getPasswordChecks(
  password: string
) {
  return {
    length:
      password.length >=
        NEW_PASSWORD_MIN_LENGTH &&
      password.length <=
        NEW_PASSWORD_MAX_LENGTH,

    lowercase:
      /[a-z]/.test(
        password
      ),

    uppercase:
      /[A-Z]/.test(
        password
      ),

    number:
      /[0-9]/.test(
        password
      ),

    special:
      /[^A-Za-z0-9]/.test(
        password
      ),
  };
}

export function isStrongPassword(
  password: string
): boolean {
  const checks =
    getPasswordChecks(
      password
    );

  return Object.values(
    checks
  ).every(Boolean);
}