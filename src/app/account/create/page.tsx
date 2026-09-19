"use client";

import {
  useState,
} from "react";

import {
  useSearchParams,
} from "next/navigation";

import PageHero from "@/components/shared/PageHero";

import { useLanguage } from "@/context/LanguageContext";

import {
  isStrongPassword,
  isValidEmail,
  NEW_PASSWORD_MAX_LENGTH,
  NEW_PASSWORD_MIN_LENGTH,
} from "@/lib/validation";

export default function CreateAccountPage() {
  const { language, t } = useLanguage();

  const searchParams =
    useSearchParams();

  const initialEmail =
    searchParams.get(
      "email"
    ) || "";

  const bookingId =
    searchParams.get(
      "bookingId"
    ) || "";

  const [email, setEmail] =
    useState(initialEmail);

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

  const [
    accountCreated,
    setAccountCreated,
  ] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  /*
   * ============================================
   * CREATE ACCOUNT
   * ============================================
   */

  const handleCreateAccount =
    async (
      event: React.FormEvent
    ) => {
      event.preventDefault();

      setError("");

      const normalizedEmail =
        email
          .trim()
          .toLowerCase();

      /*
       * ========================================
       * BASIC VALIDATION
       * ========================================
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

      if (
        password.length <
        NEW_PASSWORD_MIN_LENGTH
      ) {
        setError(
          language === "hi"
            ? `पासवर्ड कम से कम ${NEW_PASSWORD_MIN_LENGTH} अक्षरों का होना चाहिए।`
            : `Password must be at least ${NEW_PASSWORD_MIN_LENGTH} characters.`
        );

        return;
      }

      if (
        password.length >
        NEW_PASSWORD_MAX_LENGTH
      ) {
        setError(
          language === "hi"
            ? `पासवर्ड ${NEW_PASSWORD_MAX_LENGTH} अक्षरों से अधिक नहीं होना चाहिए।`
            : `Password must not exceed ${NEW_PASSWORD_MAX_LENGTH} characters.`
        );

        return;
      }

      if (
        !isStrongPassword(
          password
        )
      ) {
        setError(
          language === "hi"
            ? "पासवर्ड में कम से कम एक बड़ा अक्षर, एक छोटा अक्षर, एक संख्या और एक विशेष वर्ण होना चाहिए।"
            : "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character."
        );

        return;
      }

      if (
        password !==
        confirmPassword
      ) {
        setError(
          language === "hi"
            ? "पासवर्ड मेल नहीं खाते।"
            : "Passwords do not match."
        );

        return;
      }

      try {
        setLoading(true);

        /*
         * ========================================
         * CREATE ACCOUNT API
         * ========================================
         */

        const response =
          await fetch(
            "/api/account/create",
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

                bookingId,
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
              "Unable to create account."
          );
        }

        /*
         * The API has now:
         *
         * 1. Created the User
         * 2. Connected Booking.userId
         * 3. Created the login session
         */

        setEmail(
          normalizedEmail
        );

        setAccountCreated(
          true
        );
      } catch (error) {
        console.error(
          "ACCOUNT CREATION ERROR"
        );

        setError(
          error instanceof Error
            ? error.message
            : language === "hi"
            ? "अकाउंट नहीं बनाया जा सका।"
            : "Unable to create account."
        );
      } finally {
        setLoading(false);
      }
    };

  /*
   * ============================================
   * ACCOUNT CREATED
   * ============================================
   */

  if (accountCreated) {
    return (
      <>
        <PageHero
          eyebrow={
            language === "hi"
              ? "अकाउंट बनाया गया"
              : "ACCOUNT CREATED"
          }
          title={
            language === "hi"
              ? "आपका अकाउंट तैयार है"
              : "Your Account Is Ready"
          }
          description={
            bookingId
              ? language === "hi"
                ? "आपका अकाउंट सफलतापूर्वक बनाया गया है और आपकी बुकिंग इससे जुड़ गई है।"
                : "Your account has been created and your booking has been connected successfully."
              : language === "hi"
              ? "आपका ग्राहक अकाउंट सफलतापूर्वक बनाया गया है।"
              : "Your customer account has been created successfully."
          }
        />

        <section className="section">
          <div className="site-container">

            <div className="booking-summary-card">

              <div className="booking-header">

                <p className="eyebrow">
                  WELCOME
                </p>

                <h2 className="section-heading">
                  Account Created
                  Successfully 🎉
                </h2>

                <p className="section-description">
                  Your booking has been
                  connected to your
                  customer account.
                </p>

              </div>

              <div className="booking-summary-divider" />

              <div className="booking-summary-grid">

                <div className="booking-summary-item">
                  <span>
                    {t("account.email")}
                  </span>

                  <strong>
                    {email}
                  </strong>
                </div>

                <div className="booking-summary-item">
                  <span>
                    {t("track.bookingId")}
                  </span>

                  <strong>
                    {bookingId}
                  </strong>
                </div>

              </div>

              <div className="booking-summary-divider" />

              <div className="booking-header">

                <p className="section-description">
                  You are now signed in.
                  Your consultation will
                  appear in{" "}
                  <strong>
                    My Bookings
                  </strong>
                  .
                </p>

              </div>

              <div
                className="booking-next"
                style={{
                  marginTop:
                    "30px",
                }}
              >

                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    window.location.href =
                      "/my-bookings";
                  }}
                >
                  View My Bookings →
                </button>

              </div>

            </div>

          </div>
        </section>

      </>
    );
  }

  /*
   * ============================================
   * CREATE ACCOUNT FORM
   * ============================================
   */

  return (
    <>
      <PageHero
        eyebrow={
          language === "hi"
            ? "ग्राहक अकाउंट"
            : "CUSTOMER ACCOUNT"
        }
        title={t("account.createTitle")}
        description={language === "hi"
          ? "अपनी परामर्श बुकिंग प्रबंधित करने और अपनी बुकिंग की स्थिति देखने के लिए अकाउंट बनाएँ।"
          : "Create an account to manage your consultations and check your booking status."}
      />

      <section className="section">
        <div className="site-container">

          <div
            className="booking-summary-card"
            style={{
              maxWidth:
                "700px",
              margin:
                "0 auto",
            }}
          >

            <div className="booking-header">

              <p className="eyebrow">
                MANAGE YOUR BOOKING
              </p>

              <h2 className="section-heading">
                Create your account
              </h2>

              <p className="section-description">
                {bookingId
                  ? "Your account will be linked to this booking and created using the email address from checkout."
                  : "Create your customer account now. You can track future consultations from your Account menu."}
              </p>

            </div>

            <div className="booking-summary-divider" />

            {/* BOOKING INFORMATION */}

            <div className="booking-summary-grid">

              <div className="booking-summary-item">

                <span>
                  Booking ID
                </span>

                <strong>
                  {bookingId ||
                    "Optional — no booking selected"}
                </strong>

              </div>

              <div className="booking-summary-item">

                <span>
                  {t("account.email")}
                </span>

                <strong>
                  {email}
                </strong>

              </div>

            </div>

            <div className="booking-summary-divider" />

            {/* ACCOUNT FORM */}

            <form
              onSubmit={
                handleCreateAccount
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
                    autoComplete="email"
                    inputMode="email"
                    maxLength={254}
                    required
                    disabled={
                      loading
                    }
                    aria-invalid={
                      email.length > 0 &&
                      !isValidEmail(
                        email.trim()
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
                      background:
                        "#f7f7f7",
                    }}
                  />

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
                    Create Password
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
                      onChange={(
                        event
                      ) =>
                        setPassword(
                          event.target.value
                        )
                      }
                      placeholder={
                        language === "hi"
                          ? `कम से कम ${NEW_PASSWORD_MIN_LENGTH} अक्षर दर्ज करें`
                          : `Enter at least ${NEW_PASSWORD_MIN_LENGTH} characters`
                      }
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
                    Confirm Password
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
                      onChange={(
                        event
                      ) =>
                        setConfirmPassword(
                          event.target.value
                        )
                      }
                      placeholder={
                        language === "hi"
                          ? "पासवर्ड दोबारा दर्ज करें"
                          : "Re-enter your password"
                      }
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
                      "10px",
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
                      ? "Creating Account..."
                      : "Create Account →"}
                  </button>

                </div>

              </div>

            </form>

          </div>

        </div>
      </section>
    </>
  );
}