"use client";

import { useEffect, useMemo, useState } from "react";

type Consultant = {
  _id: string;
  name: string;
  specialization: string;
  availableModes: ("video" | "voice")[];
  availability: {
    date: string;
    times: string[];
  }[];
  active: boolean;
};

type Booking = {
  _id: string;
  bookingId: string;
  serviceName: string;
  category: string;
  mode: "video" | "voice";
  date: string;
  time: string;

  consultantId?: string | null;
  consultantName?: string;

  price: number;
  currency: string;

  status: string;
  paymentStatus: string;

  razorpayOrderId?: string;
  razorpayPaymentId?: string;

  customer: {
    fullName: string;
    mobile: string;
    email: string;

    dob?: string;
    birthTime?: string;
    birthPlace?: string;
    gender?: string;

    concern?: string;
    language?: string;
    currentName?: string;

    person2Name?: string;
    person2Dob?: string;
    person2BirthTime?: string;
    person2BirthPlace?: string;

    tarotQuestion?: string;
  };

  createdAt: string;
  updatedAt: string;
};

type Filter =
  | "all"
  | "paid"
  | "pending"
  | "failed"
  | "refunded";

export default function AdminBookingsPage() {
  /*
   * ============================================
   * BOOKINGS
   * ============================================
   */

  const [bookings, setBookings] =
    useState<Booking[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /*
   * ============================================
   * CONSULTANTS
   * ============================================
   */

  const [consultants, setConsultants] =
    useState<Consultant[]>([]);

  const [consultantsLoading, setConsultantsLoading] =
    useState(false);

  const [consultantsError, setConsultantsError] =
    useState("");

  /*
   * ============================================
   * SEARCH / FILTER
   * ============================================
   */

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState<Filter>("all");

  /*
   * ============================================
   * SELECTED BOOKING
   * ============================================
   */

  const [selectedBooking, setSelectedBooking] =
    useState<Booking | null>(null);

  const [showDetails, setShowDetails] =
    useState(false);

  /*
   * ============================================
   * CONSULTANT ASSIGNMENT
   * ============================================
   */

  const [
    selectedConsultantId,
    setSelectedConsultantId,
  ] = useState<string>("");

  const [
    assigningConsultant,
    setAssigningConsultant,
  ] = useState(false);

  const [
    assignmentMessage,
    setAssignmentMessage,
  ] = useState("");

  /*
   * ============================================
   * BOOKING STATUS
   * ============================================
   */

  const [
    selectedStatus,
    setSelectedStatus,
  ] = useState<string>("");

  const [
    updatingStatus,
    setUpdatingStatus,
  ] = useState(false);

  const [
    statusMessage,
    setStatusMessage,
  ] = useState("");

  /*
   * ============================================
   * REFUND
   * ============================================
   */

  const [
    refunding,
    setRefunding,
  ] = useState(false);

  const [
    refundMessage,
    setRefundMessage,
  ] = useState("");

  /*
   * ============================================
   * INITIAL LOAD
   * ============================================
   */

  useEffect(() => {
    loadBookings();
    loadConsultants();
  }, []);

  /*
   * ============================================
   * LOAD BOOKINGS
   * ============================================
   */

  async function loadBookings() {
    try {
      setLoading(true);
      setError("");

      const response =
        await fetch(
          "/api/admin/bookings",
          {
            method: "GET",
            credentials: "include",
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
        data.bookings || []
      );

      /*
       * Keep detail panel synchronized
       * if it is currently open.
       */

      if (selectedBooking) {
        const updatedBooking =
          (data.bookings || []).find(
            (booking: Booking) =>
              booking._id ===
              selectedBooking._id
          );

        if (updatedBooking) {
          setSelectedBooking(
            updatedBooking
          );

          setSelectedConsultantId(
            updatedBooking.consultantId ||
              ""
          );

          setSelectedStatus(
            updatedBooking.status
          );
        }
      }
    } catch (error) {
      console.error(
        "Admin bookings error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Unable to load bookings."
      );
    } finally {
      setLoading(false);
    }
  }

  /*
   * ============================================
   * LOAD CONSULTANTS
   * ============================================
   */

  async function loadConsultants() {
    try {
      setConsultantsLoading(true);
      setConsultantsError("");

      const response =
        await fetch(
          "/api/admin/consultants",
          {
            method: "GET",
            credentials: "include",
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
            "Unable to load consultants."
        );
      }

      setConsultants(
        data.consultants || []
      );
    } catch (error) {
      console.error(
        "Admin consultants error:",
        error
      );

      setConsultantsError(
        error instanceof Error
          ? error.message
          : "Unable to load consultants."
      );
    } finally {
      setConsultantsLoading(false);
    }
  }

  /*
   * ============================================
   * FILTER BOOKINGS
   * ============================================
   */

  const filteredBookings =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLowerCase();

      return bookings.filter(
        (booking) => {
          const matchesSearch =
            !normalizedSearch ||
            booking.bookingId
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            booking.customer.fullName
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            booking.customer.email
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            booking.customer.mobile
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            booking.serviceName
              .toLowerCase()
              .includes(
                normalizedSearch
              ) ||
            (
              booking.consultantName ||
              ""
            )
              .toLowerCase()
              .includes(
                normalizedSearch
              );

          const matchesFilter =
            filter === "all" ||
            booking.paymentStatus ===
              filter;

          return (
            matchesSearch &&
            matchesFilter
          );
        }
      );
    }, [
      bookings,
      search,
      filter,
    ]);

  /*
   * ============================================
   * STATISTICS
   * ============================================
   */

  const totalBookings =
    bookings.length;

  const paidBookings =
    bookings.filter(
      (booking) =>
        booking.paymentStatus ===
        "paid"
    ).length;

  const pendingBookings =
    bookings.filter(
      (booking) =>
        booking.paymentStatus ===
        "pending"
    ).length;

  const completedBookings =
    bookings.filter(
      (booking) =>
        booking.status ===
        "completed"
    ).length;

  /*
   * ============================================
   * OPEN BOOKING
   * ============================================
   */

  function openBooking(
    booking: Booking
  ) {
    setSelectedBooking(
      booking
    );

    setSelectedConsultantId(
      booking.consultantId || ""
    );

    setSelectedStatus(
      booking.status
    );

    setAssignmentMessage("");

    setStatusMessage("");

    setRefundMessage("");

    setShowDetails(true);
  }

  /*
   * ============================================
   * CLOSE BOOKING
   * ============================================
   */

  function closeBooking() {
    setShowDetails(false);

    setSelectedBooking(null);

    setSelectedConsultantId("");

    setSelectedStatus("");

    setAssignmentMessage("");

    setStatusMessage("");

    setRefundMessage("");

    setConsultantsError("");
  }

  /*
   * ============================================
   * ASSIGN CONSULTANT
   * ============================================
   */

  async function assignConsultant() {
    if (!selectedBooking) {
      return;
    }

    if (!selectedConsultantId) {
      setAssignmentMessage(
        "Please select a consultant."
      );

      return;
    }

    try {
      setAssigningConsultant(true);
      setAssignmentMessage("");

      const response =
        await fetch(
          "/api/admin/bookings",
          {
            method: "PATCH",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              bookingId:
                selectedBooking.bookingId,

              consultantId:
                selectedConsultantId,
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
            "Unable to assign consultant."
        );
      }

      /*
       * Update selected booking
       * immediately.
       */

      const updatedBooking =
        data.booking;

      if (updatedBooking) {
        setSelectedBooking(
          updatedBooking
        );

        setSelectedConsultantId(
          updatedBooking.consultantId ||
            ""
        );

        setSelectedStatus(
          updatedBooking.status
        );
      }

      /*
       * Refresh complete booking list.
       */

      await loadBookings();

      setAssignmentMessage(
        "Consultant assigned successfully."
      );
    } catch (error) {
      console.error(
        "ASSIGN CONSULTANT ERROR:",
        error
      );

      setAssignmentMessage(
        error instanceof Error
          ? error.message
          : "Unable to assign consultant."
      );
    } finally {
      setAssigningConsultant(false);
    }
  }

  /*
   * ============================================
   * UPDATE BOOKING STATUS
   * ============================================
   */

  async function updateBookingStatus() {
    if (!selectedBooking) {
      return;
    }

    if (!selectedStatus) {
      setStatusMessage(
        "Please select a booking status."
      );

      return;
    }

    if (
      selectedStatus ===
      selectedBooking.status
    ) {
      setStatusMessage(
        "The booking is already using this status."
      );

      return;
    }

    try {
      setUpdatingStatus(true);
      setStatusMessage("");

      const response =
        await fetch(
          "/api/admin/bookings",
          {
            method: "PATCH",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              bookingId:
                selectedBooking.bookingId,

              status:
                selectedStatus,
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
            "Unable to update booking status."
        );
      }

      /*
       * Update selected booking
       * immediately.
       */

      if (data.booking) {
        setSelectedBooking(
          data.booking
        );

        setSelectedStatus(
          data.booking.status
        );
      }

      /*
       * Refresh booking list.
       */

      await loadBookings();

      setStatusMessage(
        "Booking status updated successfully."
      );
    } catch (error) {
      console.error(
        "UPDATE BOOKING STATUS ERROR:",
        error
      );

      setStatusMessage(
        error instanceof Error
          ? error.message
          : "Unable to update booking status."
      );
    } finally {
      setUpdatingStatus(false);
    }
  }

  /*
   * ============================================
   * REFUND & CANCEL BOOKING
   * ============================================
   */

  async function refundBooking() {
    if (!selectedBooking) {
      return;
    }

    /*
     * Only paid bookings can be refunded.
     */

    if (
      selectedBooking.paymentStatus !==
      "paid"
    ) {
      setRefundMessage(
        "Only paid bookings can be refunded."
      );

      return;
    }

    /*
     * Completed consultations cannot
     * use the normal refund flow.
     */

    if (
      selectedBooking.status ===
      "completed"
    ) {
      setRefundMessage(
        "A completed consultation cannot be refunded through this flow."
      );

      return;
    }

    /*
     * Already cancelled bookings should
     * not be refunded again.
     */

    if (
      selectedBooking.status ===
      "cancelled"
    ) {
      setRefundMessage(
        "This booking has already been cancelled."
      );

      return;
    }

    /*
     * Confirmation before real money movement.
     */

    const confirmed =
      window.confirm(
        `Are you sure you want to cancel booking ${selectedBooking.bookingId} and issue a full refund of ${formatAmount(
          selectedBooking.price,
          selectedBooking.currency
        )}?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setRefunding(true);
      setRefundMessage("");

      const response =
        await fetch(
          "/api/admin/bookings/refund",
          {
            method: "POST",

            credentials:
              "include",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              bookingId:
                selectedBooking.bookingId,

              reason:
                "Cancelled by administrator",
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
            "Unable to process refund."
        );
      }

      /*
       * Update selected booking
       * immediately.
       */

      if (data.booking) {
        setSelectedBooking(
          data.booking
        );

        setSelectedStatus(
          data.booking.status
        );

        setSelectedConsultantId(
          data.booking.consultantId ||
            ""
        );
      } else {
        /*
         * Fallback in case the API returns
         * success without the complete booking.
         */

        setSelectedBooking(
          (current) =>
            current
              ? {
                  ...current,
                  status:
                    "cancelled",
                  paymentStatus:
                    "refunded",
                }
              : current
        );

        setSelectedStatus(
          "cancelled"
        );
      }

      /*
       * Refresh complete booking list.
       */

      await loadBookings();

      setRefundMessage(
        "Booking cancelled and full refund processed successfully."
      );
    } catch (error) {
      console.error(
        "REFUND BOOKING ERROR:",
        error
      );

      setRefundMessage(
        error instanceof Error
          ? error.message
          : "Unable to process refund."
      );
    } finally {
      setRefunding(false);
    }
  }

  /*
   * ============================================
   * FORMAT DATE
   * ============================================
   */

  function formatDate(
    date: string
  ) {
    if (!date) {
      return "—";
    }

    const parsed =
      new Date(
        `${date}T00:00:00`
      );

    if (
      Number.isNaN(
        parsed.getTime()
      )
    ) {
      return date;
    }

    return parsed.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }
    );
  }

  /*
   * ============================================
   * FORMAT AMOUNT
   * ============================================
   */

  function formatAmount(
    amount: number,
    currency: string
  ) {
    return new Intl.NumberFormat(
      "en-IN",
      {
        style: "currency",
        currency:
          currency || "INR",
        maximumFractionDigits: 0,
      }
    ).format(amount);
  }

  /*
   * ============================================
   * STATUS LABEL
   * ============================================
   */

  function statusLabel(
    status: string
  ) {
    return status
      .replaceAll("_", " ")
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase()
      );
  }

  /*
   * ============================================
   * RENDER
   * ============================================
   */

  return (
    <main className="admin-bookings-page">

      {/* ==========================================
          PAGE HEADER
      ========================================== */}

      <section className="admin-bookings-header">

        <div>
          <p className="admin-bookings-eyebrow">
            ADMINISTRATION
          </p>

          <h1>
            Bookings
          </h1>

          <p className="admin-bookings-description">
            Manage consultations,
            clients, payments and
            appointments from one
            place.
          </p>
        </div>

        <button
          type="button"
          className="admin-bookings-refresh"
          onClick={() => {
            loadBookings();
            loadConsultants();
          }}
          disabled={
            loading ||
            consultantsLoading
          }
        >
          ↻

          <span>
            {loading
              ? "Refreshing..."
              : "Refresh"}
          </span>
        </button>

      </section>

      {/* ==========================================
          STATISTICS
      ========================================== */}

      <section className="admin-bookings-stats">

        <div className="admin-bookings-stat">
          <span>
            Total Bookings
          </span>

          <strong>
            {totalBookings}
          </strong>

          <small>
            All consultations
          </small>
        </div>

        <div className="admin-bookings-stat">
          <span>
            Paid
          </span>

          <strong>
            {paidBookings}
          </strong>

          <small>
            Payments received
          </small>
        </div>

        <div className="admin-bookings-stat">
          <span>
            Pending
          </span>

          <strong>
            {pendingBookings}
          </strong>

          <small>
            Awaiting payment
          </small>
        </div>

        <div className="admin-bookings-stat">
          <span>
            Completed
          </span>

          <strong>
            {completedBookings}
          </strong>

          <small>
            Consultations completed
          </small>
        </div>

      </section>

      {/* ==========================================
          CONTROLS
      ========================================== */}

      <section className="admin-bookings-controls">

        <div className="admin-bookings-search">

          <span>
            ⌕
          </span>

          <input
            type="search"
            placeholder="Search booking, client, email or service..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
          />

          {search && (
            <button
              type="button"
              onClick={() =>
                setSearch("")
              }
              aria-label="Clear search"
            >
              ×
            </button>
          )}

        </div>

        <div className="admin-bookings-filters">

          {(
            [
              ["all", "All"],
              ["paid", "Paid"],
              [
                "pending",
                "Pending",
              ],
              [
                "failed",
                "Failed",
              ],
              [
                "refunded",
                "Refunded",
              ],
            ] as const
          ).map(
            ([value, label]) => (
              <button
                key={value}
                type="button"
                className={
                  filter === value
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setFilter(value)
                }
              >
                {label}
              </button>
            )
          )}

        </div>

      </section>

      {/* ==========================================
          ERROR
      ========================================== */}

      {error && (
        <div className="admin-bookings-error">

          <strong>
            Unable to load bookings
          </strong>

          <p>
            {error}
          </p>

          <button
            type="button"
            onClick={loadBookings}
          >
            Try Again
          </button>

        </div>
      )}

      {/* ==========================================
          LOADING
      ========================================== */}

      {loading && (
        <div className="admin-bookings-loading">

          <div className="admin-bookings-spinner" />

          <p>
            Loading bookings...
          </p>

        </div>
      )}

      {/* ==========================================
          BOOKINGS
      ========================================== */}

      {!loading &&
        !error && (
          <section className="admin-bookings-table-wrapper">

            <div className="admin-bookings-table-header">

              <div>

                <span>
                  CONSULTATIONS
                </span>

                <strong>
                  {
                    filteredBookings.length
                  }{" "}
                  booking
                  {filteredBookings.length ===
                  1
                    ? ""
                    : "s"}
                </strong>

              </div>

              <span className="admin-bookings-live">

                <i />

                Live data

              </span>

            </div>

            {filteredBookings.length ===
            0 ? (
              <div className="admin-bookings-empty">

                <div className="admin-bookings-empty-icon">
                  ✦
                </div>

                <h3>
                  No bookings found
                </h3>

                <p>
                  Try changing your
                  search or filter.
                </p>

              </div>
            ) : (
              <div className="admin-bookings-table">

                <div className="admin-bookings-row admin-bookings-row-heading">

                  <div>
                    Booking
                  </div>

                  <div>
                    Client
                  </div>

                  <div>
                    Consultation
                  </div>

                  <div>
                    Payment
                  </div>

                  <div>
                    Status
                  </div>

                  <div>
                    Action
                  </div>

                </div>

                {filteredBookings.map(
                  (booking) => (
                    <div
                      className="admin-bookings-row"
                      key={
                        booking._id
                      }
                    >

                      {/* BOOKING */}

                      <div className="admin-booking-id">

                        <strong>
                          {
                            booking.bookingId
                          }
                        </strong>

                        <span>
                          {formatDate(
                            booking.date
                          )}
                        </span>

                      </div>

                      {/* CLIENT */}

                      <div className="admin-booking-client">

                        <div className="admin-booking-avatar">

                          {booking.customer.fullName
                            .charAt(0)
                            .toUpperCase()}

                        </div>

                        <div>

                          <strong>
                            {
                              booking
                                .customer
                                .fullName
                            }
                          </strong>

                          <span>
                            {
                              booking
                                .customer
                                .email
                            }
                          </span>

                        </div>

                      </div>

                      {/* CONSULTATION */}

                      <div className="admin-booking-consultation">

                        <strong>
                          {
                            booking.serviceName
                          }
                        </strong>

                        <span>
                          {booking.mode ===
                          "video"
                            ? "Video"
                            : "Voice"}

                          {" • "}

                          {
                            booking.time
                          }
                        </span>

                        <span>
                          Consultant:{" "}
                          {
                            booking.consultantName ||
                            "To be assigned"
                          }
                        </span>

                      </div>

                      {/* PAYMENT */}

                      <div className="admin-booking-payment">

                        <strong>
                          {formatAmount(
                            booking.price,
                            booking.currency
                          )}
                        </strong>

                        <span
                          className={`admin-payment-badge admin-payment-${booking.paymentStatus}`}
                        >
                          {statusLabel(
                            booking.paymentStatus
                          )}
                        </span>

                      </div>

                      {/* STATUS */}

                      <div>

                        <span
                          className={`admin-booking-status admin-status-${booking.status}`}
                        >
                          {statusLabel(
                            booking.status
                          )}
                        </span>

                      </div>

                      {/* ACTION */}

                      <div>

                        <button
                          type="button"
                          className="admin-booking-view"
                          onClick={() =>
                            openBooking(
                              booking
                            )
                          }
                        >
                          View

                          <span>
                            →
                          </span>

                        </button>

                      </div>

                    </div>
                  )
                )}

              </div>
            )}

          </section>
        )}

      {/* ==========================================
          BOOKING DETAIL PANEL
      ========================================== */}

      {showDetails &&
        selectedBooking && (
          <div
            className="admin-booking-overlay"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeBooking();
              }
            }}
          >

            <aside className="admin-booking-detail">

              {/* ==================================
                  DETAIL HEADER
              ================================== */}

              <div className="admin-booking-detail-header">

                <div>

                  <span>
                    BOOKING
                  </span>

                  <h2>
                    {
                      selectedBooking.bookingId
                    }
                  </h2>

                </div>

                <button
                  type="button"
                  onClick={
                    closeBooking
                  }
                  aria-label="Close"
                >
                  ×
                </button>

              </div>

              <div className="admin-booking-detail-body">

                {/* ==================================
                    SUMMARY
                ================================== */}

                <div className="admin-detail-summary">

                  <span>
                    {
                      selectedBooking.category
                    }
                  </span>

                  <h3>
                    {
                      selectedBooking
                        .serviceName
                    }
                  </h3>

                  <strong>
                    {formatAmount(
                      selectedBooking.price,
                      selectedBooking.currency
                    )}
                  </strong>

                </div>

                {/* ==================================
                    CONSULTATION
                ================================== */}

                <div className="admin-detail-section">

                  <div className="admin-detail-section-title">
                    Consultation
                  </div>

                  <div className="admin-detail-grid">

                    <DetailItem
                      label="Date"
                      value={formatDate(
                        selectedBooking.date
                      )}
                    />

                    <DetailItem
                      label="Time"
                      value={
                        selectedBooking.time
                      }
                    />

                    <DetailItem
                      label="Mode"
                      value={
                        selectedBooking.mode ===
                        "video"
                          ? "Video Consultation"
                          : "Voice Consultation"
                      }
                    />

                    <DetailItem
                      label="Consultant"
                      value={
                        selectedBooking
                          .consultantName ||
                        "To be assigned"
                      }
                    />

                  </div>

                </div>

                {/* ==================================
                    ASSIGN CONSULTANT
                ================================== */}

                <div className="admin-detail-section">

                  <div className="admin-detail-section-title">
                    Assign Consultant
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection:
                        "column",
                      gap: "12px",
                    }}
                  >

                    {consultantsLoading ? (
                      <p>
                        Loading consultants...
                      </p>
                    ) : consultantsError ? (
                      <>
                        <p
                          style={{
                            color:
                              "#b42318",
                          }}
                        >
                          {
                            consultantsError
                          }
                        </p>

                        <button
                          type="button"
                          className="admin-booking-view"
                          onClick={
                            loadConsultants
                          }
                        >
                          Try Again →
                        </button>
                      </>
                    ) : consultants.length ===
                      0 ? (
                      <p>
                        No consultants
                        have been added
                        yet.
                      </p>
                    ) : (
                      <>
                        <select
                          value={
                            selectedConsultantId
                          }
                          onChange={(
                            event
                          ) =>
                            setSelectedConsultantId(
                              event.target
                                .value
                            )
                          }
                          style={{
                            width:
                              "100%",
                            padding:
                              "12px 14px",
                            border:
                              "1px solid #ddd",
                            borderRadius:
                              "8px",
                            fontSize:
                              "15px",
                            background:
                              "#fff",
                          }}
                        >

                          <option value="">
                            Select a consultant
                          </option>

                          {consultants
                            .filter(
                              (
                                consultant
                              ) =>
                                consultant.active
                            )
                            .map(
                              (
                                consultant
                              ) => (
                                <option
                                  key={
                                    consultant._id
                                  }
                                  value={
                                    consultant._id
                                  }
                                >
                                  {
                                    consultant.name
                                  }{" "}
                                  —{" "}
                                  {
                                    consultant.specialization
                                  }
                                </option>
                              )
                            )}

                        </select>

                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={
                            assignConsultant
                          }
                          disabled={
                            assigningConsultant ||
                            !selectedConsultantId ||
                            selectedBooking.status ===
                              "cancelled"
                          }
                        >
                          {assigningConsultant
                            ? "Assigning..."
                            : selectedBooking.consultantId
                            ? "Update Consultant →"
                            : "Assign Consultant →"}
                        </button>

                      </>
                    )}

                    {assignmentMessage && (
                      <div
                        style={{
                          padding:
                            "12px 14px",
                          borderRadius:
                            "8px",
                          background:
                            assignmentMessage.includes(
                              "successfully"
                            )
                              ? "#eefbf3"
                              : "#fff1f1",
                          color:
                            assignmentMessage.includes(
                              "successfully"
                            )
                              ? "#137333"
                              : "#b42318",
                        }}
                      >
                        {
                          assignmentMessage
                        }
                      </div>
                    )}

                  </div>

                </div>

                {/* ==================================
                    BOOKING STATUS
                ================================== */}

                <div className="admin-detail-section">

                  <div className="admin-detail-section-title">
                    Booking Status
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection:
                        "column",
                      gap: "12px",
                    }}
                  >

                    <select
                      value={
                        selectedStatus
                      }
                      onChange={(
                        event
                      ) =>
                        setSelectedStatus(
                          event.target
                            .value
                        )
                      }
                      disabled={
                        selectedBooking.status ===
                        "cancelled"
                      }
                      style={{
                        width:
                          "100%",
                        padding:
                          "12px 14px",
                        border:
                          "1px solid #ddd",
                        borderRadius:
                          "8px",
                        fontSize:
                          "15px",
                        background:
                          "#fff",
                      }}
                    >

                      <option value="payment_pending">
                        Payment Pending
                      </option>

                      <option value="paid">
                        Paid
                      </option>

                      <option value="confirmed">
                        Confirmed
                      </option>

                      <option value="consultant_assigned">
                        Consultant Assigned
                      </option>

                      <option value="completed">
                        Completed
                      </option>

                      <option value="cancelled">
                        Cancelled
                      </option>

                    </select>

                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={
                        updateBookingStatus
                      }
                      disabled={
                        updatingStatus ||
                        !selectedStatus ||
                        selectedStatus ===
                          selectedBooking.status ||
                        selectedBooking.status ===
                          "cancelled"
                      }
                    >
                      {updatingStatus
                        ? "Updating..."
                        : "Update Status →"}
                    </button>

                    {statusMessage && (
                      <div
                        style={{
                          padding:
                            "12px 14px",
                          borderRadius:
                            "8px",
                          background:
                            statusMessage.includes(
                              "successfully"
                            )
                              ? "#eefbf3"
                              : "#fff1f1",
                          color:
                            statusMessage.includes(
                              "successfully"
                            )
                              ? "#137333"
                              : "#b42318",
                        }}
                      >
                        {
                          statusMessage
                        }
                      </div>
                    )}

                  </div>

                </div>

                {/* ==================================
                    CANCELLATION & REFUND
                ================================== */}

                {selectedBooking.paymentStatus ===
                  "paid" &&
                  selectedBooking.status !==
                    "completed" &&
                  selectedBooking.status !==
                    "cancelled" && (
                    <div className="admin-detail-section">

                      <div className="admin-detail-section-title">
                        Cancellation & Refund
                      </div>

                      <div
                        style={{
                          display:
                            "flex",
                          flexDirection:
                            "column",
                          gap: "12px",
                        }}
                      >

                        <p
                          style={{
                            margin: 0,
                            fontSize:
                              "14px",
                            lineHeight:
                              1.6,
                            color:
                              "#666",
                          }}
                        >
                          Cancelling this
                          booking will
                          issue a full
                          refund of{" "}
                          <strong>
                            {formatAmount(
                              selectedBooking.price,
                              selectedBooking.currency
                            )}
                          </strong>{" "}
                          to the
                          customer
                          through
                          Razorpay.
                        </p>

                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={
                            refundBooking
                          }
                          disabled={
                            refunding
                          }
                          style={{
                            background:
                              "#b42318",
                            borderColor:
                              "#b42318",
                          }}
                        >
                          {refunding
                            ? "Processing Refund..."
                            : "Cancel & Refund Booking →"}
                        </button>

                        {refundMessage && (
                          <div
                            style={{
                              padding:
                                "12px 14px",
                              borderRadius:
                                "8px",
                              background:
                                refundMessage.includes(
                                  "successfully"
                                )
                                  ? "#eefbf3"
                                  : "#fff1f1",
                              color:
                                refundMessage.includes(
                                  "successfully"
                                )
                                  ? "#137333"
                                  : "#b42318",
                            }}
                          >
                            {
                              refundMessage
                            }
                          </div>
                        )}

                      </div>

                    </div>
                  )}

                {/* ==================================
                    REFUND RESULT
                ================================== */}

                {selectedBooking.paymentStatus ===
                  "refunded" && (
                  <div className="admin-detail-section">

                    <div className="admin-detail-section-title">
                      Refund
                    </div>

                    <div
                      style={{
                        padding:
                          "14px",
                        borderRadius:
                          "8px",
                        background:
                          "#eefbf3",
                        color:
                          "#137333",
                        fontSize:
                          "14px",
                        lineHeight:
                          1.6,
                      }}
                    >
                      This booking has
                      been refunded
                      successfully.
                    </div>

                  </div>
                )}

                {/* ==================================
                    CLIENT
                ================================== */}

                <div className="admin-detail-section">

                  <div className="admin-detail-section-title">
                    Client
                  </div>

                  <div className="admin-detail-client">

                    <div className="admin-booking-avatar large">

                      {selectedBooking.customer.fullName
                        .charAt(0)
                        .toUpperCase()}

                    </div>

                    <div>

                      <strong>
                        {
                          selectedBooking
                            .customer
                            .fullName
                        }
                      </strong>

                      <span>
                        {
                          selectedBooking
                            .customer
                            .email
                        }
                      </span>

                      <span>
                        {
                          selectedBooking
                            .customer
                            .mobile
                        }
                      </span>

                    </div>

                  </div>

                </div>

                {/* ==================================
                    BIRTH DETAILS
                ================================== */}

                {(selectedBooking.customer.dob ||
                  selectedBooking
                    .customer
                    .birthTime ||
                  selectedBooking
                    .customer
                    .birthPlace ||
                  selectedBooking
                    .customer
                    .gender) && (
                  <div className="admin-detail-section">

                    <div className="admin-detail-section-title">
                      Birth Details
                    </div>

                    <div className="admin-detail-grid">

                      <DetailItem
                        label="Date of Birth"
                        value={
                          selectedBooking
                            .customer
                            .dob
                        }
                      />

                      <DetailItem
                        label="Birth Time"
                        value={
                          selectedBooking
                            .customer
                            .birthTime
                        }
                      />

                      <DetailItem
                        label="Birth Place"
                        value={
                          selectedBooking
                            .customer
                            .birthPlace
                        }
                      />

                      <DetailItem
                        label="Gender"
                        value={
                          selectedBooking
                            .customer
                            .gender
                        }
                      />

                    </div>

                  </div>
                )}

                {/* ==================================
                    CONSULTATION DETAILS
                ================================== */}

                {(selectedBooking.customer
                  .concern ||
                  selectedBooking
                    .customer
                    .language ||
                  selectedBooking
                    .customer
                    .currentName ||
                  selectedBooking
                    .customer
                    .tarotQuestion) && (
                  <div className="admin-detail-section">

                    <div className="admin-detail-section-title">
                      Consultation Details
                    </div>

                    {selectedBooking.customer
                      .concern && (
                      <DetailText
                        label="Concern"
                        value={
                          selectedBooking
                            .customer
                            .concern
                        }
                      />
                    )}

                    {selectedBooking.customer
                      .language && (
                      <DetailText
                        label="Language"
                        value={
                          selectedBooking
                            .customer
                            .language
                        }
                      />
                    )}

                    {selectedBooking.customer
                      .currentName && (
                      <DetailText
                        label="Current Name"
                        value={
                          selectedBooking
                            .customer
                            .currentName
                        }
                      />
                    )}

                    {selectedBooking.customer
                      .tarotQuestion && (
                      <DetailText
                        label="Tarot Question"
                        value={
                          selectedBooking
                            .customer
                            .tarotQuestion
                        }
                      />
                    )}

                  </div>
                )}

                {/* ==================================
                    SECOND PERSON
                ================================== */}

                {selectedBooking.customer
                  .person2Name && (
                  <div className="admin-detail-section">

                    <div className="admin-detail-section-title">
                      Additional Person
                    </div>

                    <div className="admin-detail-grid">

                      <DetailItem
                        label="Name"
                        value={
                          selectedBooking
                            .customer
                            .person2Name
                        }
                      />

                      <DetailItem
                        label="Date of Birth"
                        value={
                          selectedBooking
                            .customer
                            .person2Dob
                        }
                      />

                      <DetailItem
                        label="Birth Time"
                        value={
                          selectedBooking
                            .customer
                            .person2BirthTime
                        }
                      />

                      <DetailItem
                        label="Birth Place"
                        value={
                          selectedBooking
                            .customer
                            .person2BirthPlace
                        }
                      />

                    </div>

                  </div>
                )}

                {/* ==================================
                    PAYMENT
                ================================== */}

                <div className="admin-detail-section">

                  <div className="admin-detail-section-title">
                    Payment
                  </div>

                  <div className="admin-detail-payment">

                    <div>
                      <span>
                        Status
                      </span>

                      <strong>
                        {statusLabel(
                          selectedBooking
                            .paymentStatus
                        )}
                      </strong>
                    </div>

                    <div>
                      <span>
                        Razorpay Order
                      </span>

                      <strong>
                        {
                          selectedBooking
                            .razorpayOrderId ||
                          "—"
                        }
                      </strong>
                    </div>

                    <div>
                      <span>
                        Razorpay Payment
                      </span>

                      <strong>
                        {
                          selectedBooking
                            .razorpayPaymentId ||
                          "—"
                        }
                      </strong>
                    </div>

                  </div>

                </div>

              </div>

            </aside>

          </div>
        )}

    </main>
  );
}

/* ============================================
   DETAIL HELPERS
============================================ */

function DetailItem({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="admin-detail-item">

      <span>
        {label}
      </span>

      <strong>
        {value || "—"}
      </strong>

    </div>
  );
}

function DetailText({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div className="admin-detail-text">

      <span>
        {label}
      </span>

      <p>
        {value || "—"}
      </p>

    </div>
  );
}