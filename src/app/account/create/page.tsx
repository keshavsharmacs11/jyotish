"use client";

import {
  useState,
} from "react";

import {
  useSearchParams,
} from "next/navigation";

import PageHero from "@/components/shared/PageHero";
import Footer from "@/components/layout/Footer";

export default function CreateAccountPage() {
  const searchParams =
    useSearchParams();

  const email =
    searchParams.get(
      "email"
    ) || "";

  const bookingId =
    searchParams.get(
      "bookingId"
    ) || "";

  const [password, setPassword] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

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

      /*
       * Basic validation
       */

      if (!email) {
        setError(
          "Booking email could not be found."
        );

        return;
      }

      if (!bookingId) {
        setError(
          "Booking ID could not be found."
        );

        return;
      }

      if (
        password.length < 8
      ) {
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
                email,
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

        console.log(
          "Customer account created:",
          data
        );

        setAccountCreated(
          true
        );
      } catch (error) {
        console.error(
          "ACCOUNT CREATION ERROR:",
          error
        );

        setError(
          error instanceof Error
            ? error.message
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
          eyebrow="ACCOUNT CREATED"
          title="Your Account Is Ready"
          description="Your account has been created and your booking has been connected successfully."
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
                    Email
                  </span>

                  <strong>
                    {email}
                  </strong>
                </div>

                <div className="booking-summary-item">
                  <span>
                    Booking ID
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

        <Footer />
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
        eyebrow="CUSTOMER ACCOUNT"
        title="Create Your Account"
        description="Create an account to manage your consultation booking and check its status."
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
                Your account will be
                created using the
                email address you used
                when making your
                booking.
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
                    "Not available"}
                </strong>

              </div>

              <div className="booking-summary-item">

                <span>
                  Email
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
                    Email Address
                  </label>

                  <input
                    id="email"
                    type="email"
                    value={email}
                    readOnly
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

                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(
                      event
                    ) =>
                      setPassword(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Enter at least 8 characters"
                    required
                    disabled={
                      loading
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

                  <input
                    id="confirmPassword"
                    type="password"
                    value={
                      confirmPassword
                    }
                    onChange={(
                      event
                    ) =>
                      setConfirmPassword(
                        event
                          .target
                          .value
                      )
                    }
                    placeholder="Re-enter your password"
                    required
                    disabled={
                      loading
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

      <Footer />
    </>
  );
}