"use client";

import {
  FormEvent,
  useState,
} from "react";

import Link from "next/link";

export default function AdminLoginPage() {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const handleSubmit =
    async (
      event: FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      setError("");
      setLoading(true);

      try {
        const response =
          await fetch(
            "/api/admin/login",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                email,
                password,
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
              "Unable to login."
          );
        }

        /*
         * Server has already created the
         * HTTP-only admin_token cookie.
         */

        window.location.href =
          "/admin";
      } catch (error) {
        console.error(
          "Admin login error:",
          error
        );

        setError(
          error instanceof Error
            ? error.message
            : "Unable to login."
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <main className="admin-login-page">

      {/* ============================================
          BACKGROUND DECORATION
          ============================================ */}

      <div
        className="
          admin-login-orbit
          admin-login-orbit-one
        "
      />

      <div
        className="
          admin-login-orbit
          admin-login-orbit-two
        "
      />

      <div className="admin-login-shell">

        {/* ============================================
            BRAND
            ============================================ */}

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

        {/* ============================================
            LOGIN CARD
            ============================================ */}

        <div className="admin-login-card">

          <div className="admin-login-card-header">

            <div className="admin-login-eyebrow">
              ADMINISTRATION
            </div>

            <h1>
              Welcome Back
            </h1>

            <p>
              Sign in to access your
              administration dashboard.
            </p>

          </div>

          <div className="admin-login-divider" />

          {/* ============================================
              LOGIN FORM
              ============================================ */}

          <form
            onSubmit={handleSubmit}
            className="admin-login-form"
          >

            {/* ========================================
                EMAIL
                ======================================== */}

            <div className="admin-login-field">

              <label htmlFor="email">
                Email Address
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                required
                autoComplete="email"
                placeholder="Enter your admin email"
                disabled={loading}
              />

            </div>

            {/* ========================================
                PASSWORD
                ======================================== */}

            <div className="admin-login-field">

              <div className="admin-login-label-row">

                <label htmlFor="password">
                  Password
                </label>

                <Link
                  href="/admin/forgot-password"
                  className="
                    admin-login-forgot-password
                  "
                >
                  Forgot password?
                </Link>

              </div>

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
                  required
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  disabled={loading}
                />

                <button
                  type="button"
                  className="
                    admin-password-toggle
                  "
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

            {/* ========================================
                ERROR
                ======================================== */}

            {error && (
              <div className="admin-login-error">

                <span>!</span>

                <p>
                  {error}
                </p>

              </div>
            )}

            {/* ========================================
                SUBMIT
                ======================================== */}

            <button
              type="submit"
              className="admin-login-submit"
              disabled={loading}
            >

              {loading ? (
                <>
                  <span
                    className="
                      admin-login-spinner
                    "
                  />

                  Signing in...
                </>
              ) : (
                <>
                  Sign In

                  <span>
                    →
                  </span>
                </>
              )}

            </button>

          </form>

          {/* ============================================
              SECURITY MESSAGE
              ============================================ */}

          <div className="admin-login-security">

            <span>
              ✦
            </span>

            <p>
              Secure administrator access
            </p>

          </div>

        </div>

        {/* ============================================
            FOOTER
            ============================================ */}

        <div className="admin-login-footer">

          <span>
            ©{" "}
            {new Date().getFullYear()}
            {" "}
            Akshaanshh Jyotish
          </span>

          <span
            className="
              admin-login-footer-dot
            "
          >
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