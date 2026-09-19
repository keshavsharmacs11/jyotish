"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";

export default function AdminForgotPasswordPage() {
  const [email, setEmail] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [submitted, setSubmitted] =
    useState(false);

  const [error, setError] =
    useState("");

  const formCardRef =
    useRef<HTMLDivElement>(null);

  /*
   * ============================================
   * SCROLL TO FORM
   * ============================================
   */

  useEffect(() => {
    const timer = setTimeout(() => {
      formCardRef.current?.scrollIntoView({
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

      const normalizedEmail =
        email.trim().toLowerCase();

      if (!normalizedEmail) {
        setError(
          "Email address is required."
        );

        return;
      }

      try {
        setLoading(true);

        const response =
          await fetch(
            "/api/admin/forgot-password",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                email:
                  normalizedEmail,
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
              "Unable to process your request."
          );
        }

        setSubmitted(true);
      } catch (error) {
        console.error(
          "ADMIN FORGOT PASSWORD ERROR:",
          error
        );

        setError(
          error instanceof Error
            ? error.message
            : "Unable to process your request."
        );
      } finally {
        setLoading(false);
      }
    };

  /*
   * ============================================
   * SUCCESS STATE
   * ============================================
   */

  if (submitted) {
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
            ref={formCardRef}
            className="admin-login-card"
          >

            <div className="admin-login-card-header">

              <div className="admin-login-eyebrow">
                PASSWORD RESET
              </div>

              <h1>
                Check Your Email
              </h1>

              <p>
                If an administrator account
                exists with this email address,
                you will receive a password
                reset link shortly.
              </p>

            </div>

            <div className="admin-login-divider" />

            <div
              style={{
                padding:
                  "18px 20px",
                borderRadius:
                  "10px",
                background:
                  "#f7f7f7",
                lineHeight:
                  "1.6",
              }}
            >
              <strong>
                Reset link sent
              </strong>

              <p
                style={{
                  marginTop:
                    "8px",
                }}
              >
                Please check your inbox
                and follow the link to
                create a new password.
              </p>

              <p
                style={{
                  marginTop:
                    "12px",
                  fontSize:
                    "14px",
                  opacity:
                    0.75,
                }}
              >
                The reset link expires
                after 30 minutes.
              </p>
            </div>

            <div
              style={{
                marginTop:
                  "25px",
                textAlign:
                  "center",
              }}
            >

              <Link
                href="/admin/login"
                className="admin-login-submit"
                style={{
                  display:
                    "inline-flex",
                  width:
                    "100%",
                  justifyContent:
                    "center",
                  alignItems:
                    "center",
                  textDecoration:
                    "none",
                }}
              >
                Back to Admin Login →
              </Link>

            </div>

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
   * FORM
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
          ref={formCardRef}
          className="admin-login-card"
        >

          <div className="admin-login-card-header">

            <div className="admin-login-eyebrow">
              PASSWORD RESET
            </div>

            <h1>
              Forgot Password?
            </h1>

            <p>
              Enter your administrator
              email address and we'll
              send you a secure link to
              reset your password.
            </p>

          </div>

          <div className="admin-login-divider" />

          <form
            onSubmit={handleSubmit}
            className="admin-login-form"
          >

            {/* EMAIL */}

            <div className="admin-login-field">

              <label htmlFor="email">
                Administrator Email
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

                  Sending...
                </>
              ) : (
                <>
                  Send Reset Link

                  <span>→</span>
                </>
              )}
            </button>

          </form>

          <div
            style={{
              marginTop:
                "25px",
              textAlign:
                "center",
            }}
          >

            <Link
              href="/admin/login"
              style={{
                textDecoration:
                  "underline",
              }}
            >
              ← Back to Admin Login
            </Link>

          </div>

          <div className="admin-login-security">

            <span>✦</span>

            <p>
              Secure administrator password
              recovery
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