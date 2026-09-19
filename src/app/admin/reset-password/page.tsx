"use client";

import {
  FormEvent,
  Suspense,
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

function AdminResetPasswordPageContent() {
  const searchParams =
    useSearchParams();

  const token =
    searchParams.get("token") || "";

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [success, setSuccess] =
    useState(false);

  const [error, setError] =
    useState("");

  const cardRef =
    useRef<HTMLDivElement>(null);

  /*
   * ============================================
   * SCROLL TO FORM
   * ============================================
   */

  useEffect(() => {
    const timer = setTimeout(() => {
      cardRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  /*
   * ============================================
   * SUBMIT
   * ============================================
   */

  const handleSubmit =
    async (
      event: FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      setError("");

      if (!token) {
        setError(
          "This password reset link is invalid."
        );

        return;
      }

      if (password.length < 8) {
        setError(
          "Password must be at least 8 characters."
        );

        return;
      }

      if (
        password !==
        confirmPassword
      ) {
        setError(
          "Passwords do not match."
        );

        return;
      }

      try {
        setLoading(true);

        const response =
          await fetch(
            "/api/admin/reset-password",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                token,
                password,
                confirmPassword,
              }),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.error ||
              "Unable to reset your password."
          );
        }

        setSuccess(true);
      } catch (error) {
        console.error(
          "ADMIN PASSWORD RESET ERROR:",
          error
        );

        setError(
          error instanceof Error
            ? error.message
            : "Unable to reset your password."
        );
      } finally {
        setLoading(false);
      }
    };

  /*
   * ============================================
   * SUCCESS
   * ============================================
   */

  if (success) {
    return (
      <main className="admin-login-page">

        <div className="admin-login-orbit admin-login-orbit-one" />

        <div className="admin-login-orbit admin-login-orbit-two" />

        <div className="admin-login-shell">

          <div className="admin-login-brand">

            <div className="admin-login-symbol">
              ✦
            </div>

            <div>
              <div className="admin-login-brand-name">
                AKSHAANSHH
              </div>

              <div className="admin-login-brand-subtitle">
                JYOTISH
              </div>
            </div>

          </div>

          <div
            ref={cardRef}
            className="admin-login-card"
          >

            <div className="admin-login-card-header">

              <div className="admin-login-eyebrow">
                PASSWORD UPDATED
              </div>

              <h1>
                Password Reset
              </h1>

              <p>
                Your administrator password
                has been updated successfully.
              </p>

            </div>

            <div className="admin-login-divider" />

            <div
              style={{
                textAlign:
                  "center",
                padding:
                  "20px 10px",
              }}
            >

              <div
                style={{
                  width:
                    "70px",
                  height:
                    "70px",
                  margin:
                    "0 auto 20px",
                  borderRadius:
                    "50%",
                  background:
                    "rgba(212, 167, 71, 0.15)",
                  display:
                    "flex",
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  fontSize:
                    "32px",
                }}
              >
                ✓
              </div>

              <p
                style={{
                  lineHeight:
                    "1.7",
                  margin:
                    0,
                }}
              >
                Your password has been
                changed securely. You can
                now sign in using your new
                password.
              </p>

            </div>

            <Link
              href="/admin/login"
              className="admin-login-submit"
              style={{
                display:
                  "flex",
                justifyContent:
                  "center",
                alignItems:
                  "center",
                textDecoration:
                  "none",
                marginTop:
                  "20px",
              }}
            >
              Back to Admin Login →
            </Link>

          </div>

          <div className="admin-login-footer">

            <span>
              ©{" "}
              {new Date().getFullYear()}{" "}
              Akshaanshh Jyotish
            </span>

            <span className="admin-login-footer-dot">
              •
            </span>

            <span>
              Administration Portal
            </span>

          </div>

        </div>

      </main>
    );
  }

  /*
   * ============================================
   * RESET FORM
   * ============================================
   */

  return (
    <main className="admin-login-page">

      <div className="admin-login-orbit admin-login-orbit-one" />

      <div className="admin-login-orbit admin-login-orbit-two" />

      <div className="admin-login-shell">

        {/* BRAND */}

        <div className="admin-login-brand">

          <div className="admin-login-symbol">
            ✦
          </div>

          <div>

            <div className="admin-login-brand-name">
              AKSHAANSHH
            </div>

            <div className="admin-login-brand-subtitle">
              JYOTISH
            </div>

          </div>

        </div>

        {/* CARD */}

        <div
          ref={cardRef}
          className="admin-login-card"
        >

          <div className="admin-login-card-header">

            <div className="admin-login-eyebrow">
              PASSWORD RESET
            </div>

            <h1>
              Create New Password
            </h1>

            <p>
              Choose a new secure password
              for your administrator account.
            </p>

          </div>

          <div className="admin-login-divider" />

          <form
            onSubmit={handleSubmit}
            className="admin-login-form"
          >

            {/* PASSWORD */}

            <div className="admin-login-field">

              <label htmlFor="password">
                New Password
              </label>

              <div className="admin-password-wrapper">

                <input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={password}
                  onChange={(event) =>
                    setPassword(
                      event.target.value
                    )
                  }
                  placeholder="Enter at least 8 characters"
                  autoComplete="new-password"
                  required
                  disabled={loading}
                />

                <button
                  type="button"
                  className="admin-password-toggle"
                  onClick={() =>
                    setShowPassword(
                      (previous) =>
                        !previous
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword
                    ? "Hide"
                    : "Show"}
                </button>

              </div>

            </div>

            {/* CONFIRM PASSWORD */}

            <div className="admin-login-field">

              <label htmlFor="confirmPassword">
                Confirm New Password
              </label>

              <div className="admin-password-wrapper">

                <input
                  id="confirmPassword"
                  type={
                    showConfirmPassword
                      ? "text"
                      : "password"
                  }
                  value={
                    confirmPassword
                  }
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value
                    )
                  }
                  placeholder="Re-enter your new password"
                  autoComplete="new-password"
                  required
                  disabled={loading}
                />

                <button
                  type="button"
                  className="admin-password-toggle"
                  onClick={() =>
                    setShowConfirmPassword(
                      (previous) =>
                        !previous
                    )
                  }
                  aria-label={
                    showConfirmPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showConfirmPassword
                    ? "Hide"
                    : "Show"}
                </button>

              </div>

            </div>

            {/* PASSWORD REQUIREMENT */}

            <div
              style={{
                padding:
                  "12px 14px",
                borderRadius:
                  "8px",
                background:
                  "rgba(212, 167, 71, 0.08)",
                fontSize:
                  "14px",
                lineHeight:
                  "1.5",
              }}
            >
              Password must contain at least
              8 characters.
            </div>

            {/* ERROR */}

            {error && (
              <div className="admin-login-error">

                <span>!</span>

                <p>
                  {error}
                </p>

              </div>
            )}

            {/* SUBMIT */}

            <button
              type="submit"
              className="admin-login-submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="admin-login-spinner" />

                  Updating Password...
                </>
              ) : (
                <>
                  Reset Password

                  <span>→</span>
                </>
              )}
            </button>

          </form>

          <div
            className="admin-login-security"
            style={{
              marginTop:
                "25px",
            }}
          >

            <span>✦</span>

            <p>
              This secure link expires after
              30 minutes.
            </p>

          </div>

        </div>

        {/* FOOTER */}

        <div className="admin-login-footer">

          <span>
            ©{" "}
            {new Date().getFullYear()}{" "}
            Akshaanshh Jyotish
          </span>

          <span className="admin-login-footer-dot">
            •
          </span>

          <span>
            Administration Portal
          </span>

        </div>

      </div>

    </main>
  );
}

export default function AdminResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="admin-login-page">
          <div className="admin-login-shell">
            <div className="admin-login-card">
              Loading...
            </div>
          </div>
        </main>
      }
    >
      <AdminResetPasswordPageContent />
    </Suspense>
  );
}
