"use client";

import {
  useEffect,
  useState,
} from "react";

import PageHero from "@/components/shared/PageHero";

type Booking = {
  _id: string;

  bookingId: string;

  serviceId: string;

  serviceName: string;

  category: string;

  mode: "video" | "voice";

  date: string;

  time: string;

  consultantName?: string;

  price: number;

  currency: string;

  status: string;

  paymentStatus: string;

  customer: {
    fullName: string;
    mobile: string;
    email: string;
  };

  createdAt: string;
};

export default function MyBookingsPage() {
  const [
    bookings,
    setBookings,
  ] = useState<Booking[]>(
    []
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");

  /*
   * ============================================
   * LOAD BOOKINGS
   * ============================================
   */

  const loadBookings =
    async () => {
      try {
        setLoading(true);
        setError("");

        const response =
          await fetch(
            "/api/my-bookings",
            {
              method: "GET",
              cache: "no-store",
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
              "Unable to load bookings."
          );
        }

        setBookings(
          data.bookings ||
            []
        );
      } catch (error) {
        console.error(
          "MY BOOKINGS LOADING ERROR:",
          error
        );

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load your bookings."
        );
      } finally {
        setLoading(false);
      }
    };

  /*
   * ============================================
   * LOAD ON PAGE OPEN
   * ============================================
   */

  useEffect(() => {
    loadBookings();
  }, []);

  /*
   * ============================================
   * FORMAT DATE
   * ============================================
   */

  const formatDate = (
    date: string
  ) => {
    return new Date(
      `${date}T00:00:00`
    ).toLocaleDateString(
      "en-IN",
      {
        weekday:
          "long",
        day: "numeric",
        month:
          "long",
        year:
          "numeric",
      }
    );
  };

  /*
   * ============================================
   * FORMAT MODE
   * ============================================
   */

  const formatMode = (
    mode: Booking["mode"]
  ) => {
    return mode ===
      "video"
      ? "Video Call"
      : "Voice Call";
  };

  /*
   * ============================================
   * FORMAT STATUS
   * ============================================
   */

  const formatStatus = (
    status: string
  ) => {
    return status
      .replaceAll(
        "_",
        " "
      )
      .replace(
        /\b\w/g,
        (character) =>
          character.toUpperCase()
      );
  };

  return (
    <>
      <PageHero
        eyebrow="MY BOOKINGS"
        title="Your Bookings"
        description="View and manage your consultation bookings from one place."
      />

      <section className="section">
        <div className="site-container">

          <div className="booking-summary-card">

            <div className="booking-header">

              <p className="eyebrow">
                BOOKING HISTORY
              </p>

              <h2 className="section-heading">
                My Bookings
              </h2>

              <p className="section-description">
                View your consultation
                bookings, payment
                status and appointment
                details.
              </p>

            </div>

            <div className="booking-summary-divider" />

            {/* =================================
                LOADING
            ================================= */}

            {loading && (
              <div
                style={{
                  textAlign:
                    "center",
                  padding:
                    "50px 20px",
                }}
              >
                <p>
                  Loading your
                  bookings...
                </p>
              </div>
            )}

            {/* =================================
                ERROR
            ================================= */}

            {!loading &&
              error && (
                <div
                  style={{
                    textAlign:
                      "center",
                    padding:
                      "40px 20px",
                  }}
                >
                  <h3
                    style={{
                      marginBottom:
                        "12px",
                    }}
                  >
                    Unable to load
                    bookings
                  </h3>

                  <p
                    style={{
                      marginBottom:
                        "24px",
                    }}
                  >
                    {error}
                  </p>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={
                      loadBookings
                    }
                  >
                    Try Again →
                  </button>
                </div>
              )}

            {/* =================================
                NO BOOKINGS
            ================================= */}

            {!loading &&
              !error &&
              bookings.length ===
                0 && (
                <div
                  style={{
                    textAlign:
                      "center",
                    padding:
                      "50px 20px",
                  }}
                >
                  <h3
                    style={{
                      marginBottom:
                        "12px",
                    }}
                  >
                    No bookings yet
                  </h3>

                  <p
                    style={{
                      marginBottom:
                        "28px",
                    }}
                  >
                    You don't have any
                    consultation bookings
                    connected to this
                    account yet.
                  </p>

                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      window.location.href =
                        "/book";
                    }}
                  >
                    Book a Consultation →
                  </button>
                </div>
              )}

            {/* =================================
                BOOKINGS
            ================================= */}

            {!loading &&
              !error &&
              bookings.length >
                0 && (
                <div
                  style={{
                    display:
                      "flex",
                    flexDirection:
                      "column",
                    gap: "24px",
                  }}
                >

                  {bookings.map(
                    (
                      booking
                    ) => (
                      <div
                        key={
                          booking._id
                        }
                        style={{
                          border:
                            "1px solid #e5e5e5",
                          borderRadius:
                            "12px",
                          padding:
                            "24px",
                        }}
                      >

                        {/* HEADER */}

                        <div
                          style={{
                            display:
                              "flex",
                            justifyContent:
                              "space-between",
                            alignItems:
                              "flex-start",
                            gap:
                              "20px",
                            flexWrap:
                              "wrap",
                          }}
                        >

                          <div>

                            <p className="eyebrow">
                              {
                                booking.bookingId
                              }
                            </p>

                            <h3
                              style={{
                                marginTop:
                                  "6px",
                                marginBottom:
                                  "6px",
                              }}
                            >
                              {
                                booking.serviceName
                              }
                            </h3>

                            <p>
                              {
                                booking.category
                              }
                            </p>

                          </div>

                          <div
                            style={{
                              textAlign:
                                "right",
                            }}
                          >

                            <strong>
                              ₹
                              {booking.price.toLocaleString(
                                "en-IN"
                              )}
                            </strong>

                            <p
                              style={{
                                marginTop:
                                  "6px",
                              }}
                            >
                              {
                                booking.currency
                              }
                            </p>

                          </div>

                        </div>

                        <div className="booking-summary-divider" />

                        {/* DETAILS */}

                        <div className="booking-summary-grid">

                          <div className="booking-summary-item">

                            <span>
                              Date
                            </span>

                            <strong>
                              {formatDate(
                                booking.date
                              )}
                            </strong>

                          </div>

                          <div className="booking-summary-item">

                            <span>
                              Time
                            </span>

                            <strong>
                              {
                                booking.time
                              }
                            </strong>

                          </div>

                          <div className="booking-summary-item">

                            <span>
                              Consultation
                            </span>

                            <strong>
                              {formatMode(
                                booking.mode
                              )}
                            </strong>

                          </div>

                          <div className="booking-summary-item">

                            <span>
                              Consultant
                            </span>

                            <strong>
                              {
                                booking.consultantName ||
                                "To be assigned"
                              }
                            </strong>

                          </div>

                        </div>

                        <div className="booking-summary-divider" />

                        {/* STATUS */}

                        <div className="booking-summary-grid">

                          <div className="booking-summary-item">

                            <span>
                              Booking
                              Status
                            </span>

                            <strong>
                              {formatStatus(
                                booking.status
                              )}
                            </strong>

                          </div>

                          <div className="booking-summary-item">

                            <span>
                              Payment
                              Status
                            </span>

                            <strong>
                              {formatStatus(
                                booking.paymentStatus
                              )}
                            </strong>

                          </div>

                        </div>

                      </div>
                    )
                  )}

                </div>
              )}

          </div>

        </div>
      </section>

    </>
  );
}