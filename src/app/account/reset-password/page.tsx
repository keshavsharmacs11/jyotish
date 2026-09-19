"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useSearchParams,
} from "next/navigation";

import Link from "next/link";

import PageHero from "@/components/shared/PageHero";

import {
  getPasswordChecks,
  isStrongPassword,
  NEW_PASSWORD_MIN_LENGTH,
  NEW_PASSWORD_MAX_LENGTH,
} from "@/lib/validation";

export default function ResetPasswordPage() {
  const searchParams =
    useSearchParams();

  const token =
    searchParams.get(
      "token"
    ) || "";

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

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

  const formCardRef =
    useRef<HTMLDivElement>(null);

  const passwordChecks =
    getPasswordChecks(
      password
    );

  const passwordIsStrong =
    isStrongPassword(
      password
    );

  /*
   * ============================================
   * SCROLL TO FORM
   * ============================================
   */

  useEffect(() => {
    const timer =
      setTimeout(() => {
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
   * RESET PASSWORD
   * ============================================
   */

  const handleSubmit =
    async (
      event: FormEvent
    ) => {
      event.preventDefault();

      setError("");

      if (!token) {
        setError(
          "This password reset link is invalid."
        );

        return;
      }

      if (!password) {
        setError(
          "Password is required."
        );

        return;
      }

      if (
        password.length <
        NEW_PASSWORD_MIN_LENGTH
      ) {
        setError(
          "Password must be at least 10 characters."
        );

        return;
      }

      if (
        password.length >
        NEW_PASSWORD_MAX_LENGTH
      ) {
        setError(
          "Password must not exceed 128 characters."
        );

        return;
      }

      if (
        !passwordIsStrong
      ) {
        setError(
          "Please meet all password requirements before updating your password."
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
            "/api/account/reset-password",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                token,
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
              "Unable to reset your password."
          );
        }

        setSuccess(
          true
        );

        setPassword("");
        setConfirmPassword("");
      } catch (error) {
        console.error(
          "RESET PASSWORD ERROR"
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
      <>
        <PageHero
          eyebrow="PASSWORD RESET"
          title="Password Updated"
          description="Your password has been changed successfully."
        />

        <section className="section">
          <div className="site-container">

            <div
              className="booking-summary-card"
              style={{
                maxWidth:
                  "600px",
                margin:
                  "0 auto",
                textAlign:
                  "center",
              }}
            >

              <div className="booking-header">

                <p className="eyebrow">
                  SUCCESS
                </p>

                <h2 className="section-heading">
                  Your password has been
                  updated
                </h2>

                <p className="section-description">
                  You can now sign in to
                  your customer account
                  using your new password.
                </p>

              </div>

              <div
                className="booking-next"
                style={{
                  marginTop:
                    "30px",
                }}
              >

                <Link
                  href="/account/login"
                  className="btn btn-primary"
                >
                  Go to Login →
                </Link>

              </div>

            </div>

          </div>
        </section>
      </>
    );
  }

  /*
   * ============================================
   * RESET FORM
   * ============================================
   */

  return (
    <>
      <PageHero
        eyebrow="ACCOUNT RECOVERY"
        title="Create a New Password"
        description="Choose a strong new password for your customer account."
      />

      <section className="section">
        <div className="site-container">

          <div
            ref={formCardRef}
            className="booking-summary-card"
            style={{
              maxWidth:
                "600px",
              margin:
                "0 auto",
            }}
          >

            <div className="booking-header">

              <p className="eyebrow">
                RESET PASSWORD
              </p>

              <h2 className="section-heading">
                Set your new password
              </h2>

              <p className="section-description">
                Your new password must be
                10–128 characters and include
                uppercase, lowercase, a number,
                and a special character.
              </p>

            </div>

            <div className="booking-summary-divider" />

            <form
              onSubmit={
                handleSubmit
              }
            >

              <div
                style={{
                  display:
                    "flex",
                  flexDirection:
                    "column",
                  gap: "20px",
                }}
              >

                {/* NEW PASSWORD */}

                <div>

                  <label
                    htmlFor="password"
                    style={{
                      display:
                        "block",
                      marginBottom:
                        "8px",
                    }}
                  >
                    New Password
                  </label>

                  <div
                    style={{
                      position:
                        "relative",
                    }}
                  >

                    <input
                      id="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={password}
                      onChange={(event) => {
                        setPassword(
                          event.target.value
                        );
                        setError("");
                      }}
                      placeholder="Create a strong password"
                      autoComplete="new-password"
                      minLength={
                        NEW_PASSWORD_MIN_LENGTH
                      }
                      maxLength={
                        NEW_PASSWORD_MAX_LENGTH
                      }
                      required
                      disabled={
                        loading
                      }
                      style={{
                        width:
                          "100%",
                        padding:
                          "14px 50px 14px 16px",
                        border:
                          "1px solid #ddd",
                        borderRadius:
                          "8px",
                        fontSize:
                          "16px",
                      }}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (
                            current
                          ) =>
                            !current
                        )
                      }
                      aria-label={
                        showPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      style={{
                        position:
                          "absolute",
                        right:
                          "14px",
                        top:
                          "50%",
                        transform:
                          "translateY(-50%)",
                        background:
                          "transparent",
                        border:
                          "none",
                        cursor:
                          "pointer",
                        padding:
                          "4px",
                        fontSize:
                          "18px",
                      }}
                    >
                      {showPassword
                        ? "🙈"
                        : "👁"}
                    </button>

                  </div>

                  {/* PASSWORD REQUIREMENTS */}

                  <div
                    style={{
                      marginTop:
                        "10px",
                      fontSize:
                        "14px",
                      lineHeight:
                        "1.7",
                    }}
                  >

                    <p
                      style={{
                        margin:
                          "0 0 6px",
                        fontWeight:
                          600,
                      }}
                    >
                      Password must contain:
                    </p>

                    <p
                      style={{
                        margin: 0,
                        color:
                          passwordChecks.length
                            ? "#147a38"
                            : "#666",
                      }}
                    >
                      {passwordChecks.length
                        ? "✓"
                        : "○"}{" "}
                      10–128 characters
                    </p>

                    <p
                      style={{
                        margin: 0,
                        color:
                          passwordChecks.uppercase
                            ? "#147a38"
                            : "#666",
                      }}
                    >
                      {passwordChecks.uppercase
                        ? "✓"
                        : "○"}{" "}
                      One uppercase letter
                    </p>

                    <p
                      style={{
                        margin: 0,
                        color:
                          passwordChecks.lowercase
                            ? "#147a38"
                            : "#666",
                      }}
                    >
                      {passwordChecks.lowercase
                        ? "✓"
                        : "○"}{" "}
                      One lowercase letter
                    </p>

                    <p
                      style={{
                        margin: 0,
                        color:
                          passwordChecks.number
                            ? "#147a38"
                            : "#666",
                      }}
                    >
                      {passwordChecks.number
                        ? "✓"
                        : "○"}{" "}
                      One number
                    </p>

                    <p
                      style={{
                        margin: 0,
                        color:
                          passwordChecks.special
                            ? "#147a38"
                            : "#666",
                      }}
                    >
                      {passwordChecks.special
                        ? "✓"
                        : "○"}{" "}
                      One special character
                    </p>

                  </div>

                </div>

                {/* CONFIRM PASSWORD */}

                <div>

                  <label
                    htmlFor="confirmPassword"
                    style={{
                      display:
                        "block",
                      marginBottom:
                        "8px",
                    }}
                  >
                    Confirm New Password
                  </label>

                  <div
                    style={{
                      position:
                        "relative",
                    }}
                  >

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
                      onChange={(event) => {
                        setConfirmPassword(
                          event.target.value
                        );
                        setError("");
                      }}
                      placeholder="Re-enter your new password"
                      autoComplete="new-password"
                      minLength={
                        NEW_PASSWORD_MIN_LENGTH
                      }
                      maxLength={
                        NEW_PASSWORD_MAX_LENGTH
                      }
                      required
                      disabled={
                        loading
                      }
                      style={{
                        width:
                          "100%",
                        padding:
                          "14px 50px 14px 16px",
                        border:
                          "1px solid #ddd",
                        borderRadius:
                          "8px",
                        fontSize:
                          "16px",
                      }}
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          (
                            current
                          ) =>
                            !current
                        )
                      }
                      aria-label={
                        showConfirmPassword
                          ? "Hide password"
                          : "Show password"
                      }
                      style={{
                        position:
                          "absolute",
                        right:
                          "14px",
                        top:
                          "50%",
                        transform:
                          "translateY(-50%)",
                        background:
                          "transparent",
                        border:
                          "none",
                        cursor:
                          "pointer",
                        padding:
                          "4px",
                        fontSize:
                          "18px",
                      }}
                    >
                      {showConfirmPassword
                        ? "🙈"
                        : "👁"}
                    </button>

                  </div>

                  {confirmPassword &&
                    password !==
                      confirmPassword && (
                      <p
                        style={{
                          margin:
                            "8px 0 0",
                          fontSize:
                            "14px",
                          color:
                            "#b42318",
                        }}
                      >
                        Passwords do not match.
                      </p>
                    )}

                </div>

                {/* ERROR */}

                {error && (
                  <div
                    style={{
                      padding:
                        "12px 16px",
                      borderRadius:
                        "8px",
                      background:
                        "#fff1f1",
                      color:
                        "#b42318",
                    }}
                    role="alert"
                  >
                    {error}
                  </div>
                )}

                {/* SUBMIT */}

                <div
                  className="booking-next"
                  style={{
                    marginTop:
                      "5px",
                  }}
                >

                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={
                      loading
                    }
                  >
                    {loading
                      ? "Updating Password..."
                      : "Update Password →"}
                  </button>

                </div>

              </div>

            </form>

            <div
              className="booking-summary-divider"
              style={{
                marginTop:
                  "30px",
              }}
            />

            <div
              style={{
                textAlign:
                  "center",
              }}
            >

              <Link
                href="/account/login"
                style={{
                  textDecoration:
                    "underline",
                }}
              >
                Back to Login
              </Link>

            </div>

          </div>

        </div>
      </section>
    </>
  );
}