"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import PageHero from "@/components/shared/PageHero";

import {
  isValidEmail,
} from "@/lib/validation";

const MAX_EMAIL_LENGTH = 254;

export default function ForgotPasswordPage() {
  const [email, setEmail] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

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
   * SUBMIT
   * ============================================
   */

  const handleSubmit =
    async (
      event: FormEvent
    ) => {
      event.preventDefault();

      setMessage("");
      setError("");

      const normalizedEmail =
        email
          .trim()
          .toLowerCase();

      if (!normalizedEmail) {
        setError(
          "Email address is required."
        );

        return;
      }

      if (
        !isValidEmail(
          normalizedEmail
        )
      ) {
        setError(
          "Please enter a valid email address."
        );

        return;
      }

      try {
        setLoading(true);

        const response =
          await fetch(
            "/api/account/forgot-password",
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

        setMessage(
          data.message
        );
      } catch (error) {
        console.error(
          "FORGOT PASSWORD ERROR"
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

  return (
    <>
      <PageHero
        eyebrow="ACCOUNT RECOVERY"
        title="Forgot Your Password?"
        description="Enter your email address and we'll help you regain access to your customer account."
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
                PASSWORD RESET
              </p>

              <h2 className="section-heading">
                Reset your password
              </h2>

              <p className="section-description">
                Enter the email address
                associated with your
                account.
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

                {/* EMAIL */}

                <div>

                  <label
                    htmlFor="email"
                    style={{
                      display:
                        "block",
                      marginBottom:
                        "8px",
                    }}
                  >
                    Email Address
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(
                        event.target.value
                      );
                      setError("");
                      setMessage("");
                    }}
                    placeholder="Enter your email"
                    autoComplete="email"
                    inputMode="email"
                    maxLength={
                      MAX_EMAIL_LENGTH
                    }
                    required
                    disabled={
                      loading
                    }
                    aria-invalid={
                      email.length > 0 &&
                      !isValidEmail(
                        email
                      )
                    }
                    style={{
                      width:
                        "100%",
                      padding:
                        "14px 16px",
                      border:
                        "1px solid #ddd",
                      borderRadius:
                        "8px",
                      fontSize:
                        "16px",
                    }}
                  />

                  {email.length >
                    0 &&
                    !isValidEmail(
                      email
                    ) && (
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
                        Please enter a valid
                        email address.
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

                {/* SUCCESS */}

                {message && (
                  <div
                    style={{
                      padding:
                        "12px 16px",
                      borderRadius:
                        "8px",
                      background:
                        "#f1faf4",
                      color:
                        "#18794e",
                    }}
                    role="status"
                  >
                    {message}
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
                      ? "Sending..."
                      : "Send Reset Link →"}
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