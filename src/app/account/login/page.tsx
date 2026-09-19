"use client";

import {
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import Link from "next/link";

import PageHero from "@/components/shared/PageHero";

import { useLanguage } from "@/context/LanguageContext";

import {
  isValidEmail,
} from "@/lib/validation";

const MAX_EMAIL_LENGTH = 254;
const MAX_PASSWORD_LENGTH = 256;

export default function CustomerLoginPage() {
  const { language, t } =
    useLanguage();
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const loginCardRef =
    useRef<HTMLDivElement>(null);

  /*
   * ============================================
   * AUTO SCROLL TO LOGIN
   * ============================================
   */

  useEffect(() => {
    const timer =
      setTimeout(() => {
        loginCardRef.current?.scrollIntoView({
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
   * LOGIN
   * ============================================
   */

  const handleLogin =
    async (
      event: FormEvent
    ) => {
      event.preventDefault();

      setError("");

      const normalizedEmail =
        email
          .trim()
          .toLowerCase();

      /*
       * Email validation
       */

      if (!normalizedEmail) {
        setError(
          language === "hi"
            ? "ईमेल पता आवश्यक है।"
            : "Email address is required."
        );

        return;
      }

      if (
        !isValidEmail(
          normalizedEmail
        )
      ) {
        setError(
          language === "hi"
            ? "कृपया एक मान्य ईमेल पता दर्ज करें।"
            : "Please enter a valid email address."
        );

        return;
      }

      /*
       * Password validation
       *
       * Do not enforce the new password
       * composition rules here.
       *
       * Existing customers may have passwords
       * created under the previous policy.
       */

      if (!password) {
        setError(
          language === "hi"
            ? "पासवर्ड आवश्यक है।"
            : "Password is required."
        );

        return;
      }

      if (
        password.length >
        MAX_PASSWORD_LENGTH
      ) {
        setError(
          language === "hi"
            ? "पासवर्ड बहुत लंबा है।"
            : "Password is too long."
        );

        return;
      }

      try {
        setLoading(true);

        const response =
          await fetch(
            "/api/account/login",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                email:
                  normalizedEmail,

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
              "Unable to log in."
          );
        }

        /*
         * The API has already created
         * the customer session.
         */

        window.location.href =
          "/my-bookings";
      } catch (error) {
        console.error(
          "CUSTOMER LOGIN ERROR"
        );

        setError(
          error instanceof Error
            ? error.message
            : language === "hi"
            ? "लॉगिन नहीं हो सका।"
            : "Unable to log in."
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <>
      <PageHero
        eyebrow={
          language === "hi"
            ? "ग्राहक अकाउंट"
            : "CUSTOMER ACCOUNT"
        }
        title={t("account.loginTitle")}
        description={t(
          "account.loginDescription"
        )}
      />

      <section className="section">
        <div className="site-container">

          <div
            ref={loginCardRef}
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
                {language === "hi"
                  ? "ग्राहक लॉगिन"
                  : "CUSTOMER LOGIN"}
              </p>

              <h2 className="section-heading">
                {language === "hi"
                  ? "अपने अकाउंट में लॉगिन करें"
                  : "Sign in to your account"}
              </h2>

              <p className="section-description">
                {language === "hi"
                  ? "अपने ग्राहक अकाउंट से जुड़े ईमेल पते और पासवर्ड का उपयोग करें।"
                  : "Use the email address and password associated with your customer account."}
              </p>

            </div>

            <div className="booking-summary-divider" />

            <form
              onSubmit={
                handleLogin
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
                    {t("account.email")}
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
                        {language === "hi"
                          ? "कृपया एक मान्य ईमेल पता दर्ज करें।"
                          : "Please enter a valid email address."}
                      </p>
                    )}

                </div>

                {/* PASSWORD */}

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
                    {t("account.password")}
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
                      placeholder={
                        language === "hi"
                          ? "अपना पासवर्ड दर्ज करें"
                          : "Enter your password"
                      }
                      autoComplete="current-password"
                      maxLength={
                        MAX_PASSWORD_LENGTH
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
                          ? language === "hi"
                            ? "पासवर्ड छिपाएँ"
                            : "Hide password"
                          : language === "hi"
                          ? "पासवर्ड दिखाएँ"
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

                </div>

                {/* FORGOT PASSWORD */}

                <div
                  style={{
                    textAlign:
                      "right",
                  }}
                >

                  <Link
                    href="/account/forgot-password"
                    style={{
                      textDecoration:
                        "underline",
                    }}
                  >
                    {t("account.forgotPassword")}
                  </Link>

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

                {/* LOGIN */}

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
                      ? "Signing In..."
                      : "Sign In →"}
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

              <p>
                {language === "hi"
                  ? "अभी तक अकाउंट नहीं है?"
                  : "Don't have an account yet?"}
              </p>

              <p
                style={{
                  marginTop:
                    "8px",
                }}
              >
                {language === "hi"
                  ? "आपका अकाउंट सामान्यतः आपकी पहली पेड बुकिंग पूरी करने के बाद बनाया जाता है।"
                  : "Your account is normally created after completing your first paid booking."}
              </p>

            </div>

          </div>

        </div>
      </section>
    </>
  );
}