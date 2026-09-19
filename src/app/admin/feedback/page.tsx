"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type FeedbackStatus = "pending" | "approved" | "rejected";

interface FeedbackItem {
  _id?: string;
  feedbackId: string;
  name: string;
  email: string;
  rating: number;
  message: string;
  serviceName?: string;
  bookingId?: string;
  verifiedCustomer: boolean;
  publishRequested: boolean;
  status: FeedbackStatus;
  adminNote?: string;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface FeedbackResponse {
  success?: boolean;
  message?: string;
  feedback?: FeedbackItem[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const STATUS_OPTIONS: Array<{
  value: "all" | FeedbackStatus;
  label: string;
}> = [
  { value: "all", label: "All Feedback" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function statusLabel(status: FeedbackStatus) {
  switch (status) {
    case "pending":
      return "Pending";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    default:
      return status;
  }
}

function StarRating({ rating }: { rating: number }) {
  return (
    <span
      aria-label={`${rating} out of 5 stars`}
      style={{
        display: "inline-flex",
        gap: 2,
        color: "var(--color-gold, #d6a63b)",
        fontSize: "0.95rem",
        letterSpacing: "0.03em",
      }}
    >
      {Array.from({ length: 5 }, (_, index) => (
        <span key={index}>{index < rating ? "★" : "☆"}</span>
      ))}
    </span>
  );
}

export default function AdminFeedbackPage() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [status, setStatus] = useState<"all" | FeedbackStatus>("pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedFeedback, setSelectedFeedback] =
    useState<FeedbackItem | null>(null);

  const [adminNote, setAdminNote] = useState("");

  const loadFeedback = useCallback(
    async (showRefreshState = false) => {
      if (showRefreshState) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const params = new URLSearchParams();

        params.set("page", String(page));
        params.set("limit", "20");

        if (status !== "all") {
          params.set("status", status);
        }

        if (search.trim()) {
          params.set("search", search.trim());
        }

        const response = await fetch(
          `/api/admin/feedback?${params.toString()}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const data: FeedbackResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || "Unable to load feedback.");
        }

        setFeedback(Array.isArray(data.feedback) ? data.feedback : []);

        setTotal(data.pagination?.total ?? 0);
        setTotalPages(Math.max(data.pagination?.totalPages ?? 1, 1));
      } catch (err) {
        console.error("Admin feedback load error:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load feedback right now."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, search, status]
  );

  useEffect(() => {
    void loadFeedback();
  }, [loadFeedback]);

  useEffect(() => {
    setPage(1);
  }, [status]);

  const visibleCount = useMemo(() => feedback.length, [feedback]);

  function openFeedback(item: FeedbackItem) {
    setSelectedFeedback(item);
    setAdminNote(item.adminNote || "");
    setSuccess("");
    setError("");
  }

  function closeFeedback() {
    if (actionId) return;

    setSelectedFeedback(null);
    setAdminNote("");
  }

  async function updateFeedback(
    item: FeedbackItem,
    action: "approve" | "reject" | "unpublish"
  ) {
    setActionId(item.feedbackId);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/admin/feedback", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          feedbackId: item.feedbackId,
          action,
          adminNote: adminNote.trim(),
        }),
      });

      const data: FeedbackResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to update feedback.");
      }

      const actionMessage =
        action === "approve"
          ? "Feedback approved successfully."
          : action === "reject"
            ? "Feedback rejected."
            : "Feedback unpublished.";

      setSuccess(actionMessage);

      setSelectedFeedback(null);
      setAdminNote("");

      await loadFeedback(true);
    } catch (err) {
      console.error("Admin feedback update error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to update feedback right now."
      );
    } finally {
      setActionId(null);
    }
  }

  function handleSearchSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
  }

  return (
    <main className="admin-page admin-feedback-page">
      <div className="admin-content">
        <section className="admin-page-header">
          <div>
            <p className="admin-topbar-eyebrow">CUSTOMER EXPERIENCE</p>

            <h1 className="admin-page-title">Feedback & Reviews</h1>

            <p className="admin-page-description">
              Review customer feedback, moderate submissions, and control which
              reviews appear publicly on the website.
            </p>
          </div>

          <button
            type="button"
            className="admin-bookings-refresh"
            onClick={() => void loadFeedback(true)}
            disabled={refreshing || loading}
          >
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </section>

        {error && (
          <div
            className="admin-alert admin-alert-error"
            role="alert"
            style={{ marginBottom: 18 }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            className="admin-alert admin-alert-success"
            role="status"
            style={{ marginBottom: 18 }}
          >
            {success}
          </div>
        )}

        <section className="admin-section">
          <div className="admin-table-card">
            <div
              className="admin-feedback-toolbar"
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 14,
                padding: "18px 20px",
                borderBottom:
                  "1px solid rgba(10, 35, 55, 0.08)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                }}
              >
                {STATUS_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setStatus(option.value);
                      setPage(1);
                    }}
                    className={
                      status === option.value
                        ? "admin-filter-button is-active"
                        : "admin-filter-button"
                    }
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <form
                onSubmit={handleSearchSubmit}
                style={{
                  display: "flex",
                  gap: 8,
                  minWidth: 0,
                  flex: "1 1 300px",
                  justifyContent: "flex-end",
                }}
              >
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search name, email or feedback…"
                  aria-label="Search feedback"
                  className="admin-search-input"
                  style={{
                    width: "min(100%, 340px)",
                  }}
                />

                <button
                  type="submit"
                  className="admin-services-add"
                  style={{ whiteSpace: "nowrap" }}
                >
                  Search
                </button>
              </form>
            </div>

            <div
              style={{
                padding: "12px 20px",
                color: "var(--color-muted, #6c747b)",
                fontSize: "0.76rem",
              }}
            >
              Showing {visibleCount} of {total} feedback submissions
            </div>

            {loading ? (
              <div
                className="admin-empty-state"
                style={{
                  minHeight: 240,
                  display: "grid",
                  placeItems: "center",
                  padding: 30,
                }}
              >
                Loading feedback…
              </div>
            ) : feedback.length === 0 ? (
              <div
                className="admin-empty-state"
                style={{
                  minHeight: 260,
                  display: "grid",
                  placeItems: "center",
                  padding: 30,
                  textAlign: "center",
                }}
              >
                <div>
                  <div
                    style={{
                      width: 54,
                      height: 54,
                      margin: "0 auto 14px",
                      display: "grid",
                      placeItems: "center",
                      border:
                        "1px solid rgba(214, 166, 59, 0.25)",
                      borderRadius: "50%",
                      background:
                        "rgba(214, 166, 59, 0.07)",
                      color:
                        "var(--color-gold-dark, #9b7625)",
                      fontSize: "1.2rem",
                    }}
                  >
                    ★
                  </div>

                  <strong
                    style={{
                      display: "block",
                      color:
                        "var(--color-midnight, #071a2b)",
                      fontFamily:
                        'var(--font-heading), Georgia, serif',
                      fontSize: "1.2rem",
                      fontWeight: 600,
                    }}
                  >
                    No feedback found
                  </strong>

                  <p
                    style={{
                      margin: "7px auto 0",
                      maxWidth: 420,
                      color:
                        "var(--color-muted, #6c747b)",
                      lineHeight: 1.6,
                    }}
                  >
                    There are no feedback submissions matching the current
                    filter.
                  </p>
                </div>
              </div>
            ) : (
              <div
                className="admin-table-wrapper"
                style={{
                  width: "100%",
                  overflowX: "auto",
                }}
              >
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Rating</th>
                      <th>Feedback</th>
                      <th>Service</th>
                      <th>Status</th>
                      <th>Submitted</th>
                      <th>Action</th>
                    </tr>
                  </thead>

                  <tbody>
                    {feedback.map((item) => {
                      const isBusy = actionId === item.feedbackId;

                      return (
                        <tr key={item.feedbackId}>
                          <td>
                            <div>
                              <strong>{item.name}</strong>

                              <div
                                style={{
                                  marginTop: 3,
                                  color:
                                    "var(--color-muted, #6c747b)",
                                  fontSize: "0.72rem",
                                }}
                              >
                                {item.email}
                              </div>

                              {item.verifiedCustomer && (
                                <span
                                  style={{
                                    display: "inline-flex",
                                    marginTop: 7,
                                    padding: "4px 8px",
                                    borderRadius: 999,
                                    background:
                                      "rgba(79, 138, 102, 0.09)",
                                    border:
                                      "1px solid rgba(79, 138, 102, 0.18)",
                                    color: "#356f4b",
                                    fontSize: "0.62rem",
                                    fontWeight: 750,
                                  }}
                                >
                                  VERIFIED CUSTOMER
                                </span>
                              )}
                            </div>
                          </td>

                          <td>
                            <StarRating rating={item.rating} />
                          </td>

                          <td>
                            <div
                              style={{
                                maxWidth: 360,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                color:
                                  "var(--color-muted, #5f6970)",
                                lineHeight: 1.5,
                              }}
                              title={item.message}
                            >
                              {item.message}
                            </div>
                          </td>

                          <td>
                            {item.serviceName || "General"}
                          </td>

                          <td>
                            <span
                              className={`admin-status-badge admin-status-${item.status}`}
                            >
                              {statusLabel(item.status)}
                            </span>

                            {item.publishedAt && (
                              <div
                                style={{
                                  marginTop: 5,
                                  color: "#356f4b",
                                  fontSize: "0.64rem",
                                  fontWeight: 700,
                                }}
                              >
                                Published
                              </div>
                            )}
                          </td>

                          <td>
                            <span
                              style={{
                                whiteSpace: "nowrap",
                                fontSize: "0.72rem",
                                color:
                                  "var(--color-muted, #6c747b)",
                              }}
                            >
                              {formatDate(item.createdAt)}
                            </span>
                          </td>

                          <td>
                            <button
                              type="button"
                              className="admin-service-cancel"
                              onClick={() => openFeedback(item)}
                              disabled={isBusy}
                            >
                              Review
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                  padding: "18px 20px",
                  borderTop:
                    "1px solid rgba(10, 35, 55, 0.08)",
                }}
              >
                <button
                  type="button"
                  className="admin-service-cancel"
                  disabled={page <= 1 || loading}
                  onClick={() =>
                    setPage((current) => Math.max(current - 1, 1))
                  }
                >
                  Previous
                </button>

                <span
                  style={{
                    minWidth: 90,
                    textAlign: "center",
                    color:
                      "var(--color-muted, #6c747b)",
                    fontSize: "0.75rem",
                    fontWeight: 650,
                  }}
                >
                  Page {page} of {totalPages}
                </span>

                <button
                  type="button"
                  className="admin-service-cancel"
                  disabled={page >= totalPages || loading}
                  onClick={() =>
                    setPage((current) =>
                      Math.min(current + 1, totalPages)
                    )
                  }
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </section>
      </div>

      {selectedFeedback && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="feedback-review-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeFeedback();
            }
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "grid",
            placeItems: "center",
            padding: 18,
            background: "rgba(4, 14, 24, 0.62)",
            backdropFilter: "blur(8px)",
          }}
        >
          <div
            style={{
              width: "min(720px, 100%)",
              maxHeight: "min(820px, calc(100vh - 36px))",
              overflowY: "auto",
              border:
                "1px solid rgba(214, 166, 59, 0.22)",
              borderRadius: 22,
              background:
                "var(--color-white, #ffffff)",
              boxShadow:
                "0 28px 90px rgba(0, 0, 0, 0.24)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 20,
                padding: "24px 26px 20px",
                borderBottom:
                  "1px solid rgba(10, 35, 55, 0.08)",
              }}
            >
              <div>
                <p
                  className="admin-topbar-eyebrow"
                  style={{ marginBottom: 7 }}
                >
                  FEEDBACK REVIEW
                </p>

                <h2
                  id="feedback-review-title"
                  style={{
                    margin: 0,
                    color:
                      "var(--color-midnight, #071a2b)",
                    fontFamily:
                      "var(--font-heading), Georgia, serif",
                    fontSize: "clamp(1.5rem, 3vw, 2rem)",
                    fontWeight: 600,
                  }}
                >
                  {selectedFeedback.name}
                </h2>

                <div
                  style={{
                    marginTop: 6,
                    color:
                      "var(--color-muted, #6c747b)",
                    fontSize: "0.75rem",
                  }}
                >
                  {selectedFeedback.email}
                </div>
              </div>

              <button
                type="button"
                onClick={closeFeedback}
                disabled={Boolean(actionId)}
                aria-label="Close feedback review"
                style={{
                  width: 38,
                  height: 38,
                  flex: "0 0 auto",
                  border:
                    "1px solid rgba(10, 35, 55, 0.1)",
                  borderRadius: "50%",
                  background: "transparent",
                  color:
                    "var(--color-midnight, #071a2b)",
                  cursor: actionId
                    ? "not-allowed"
                    : "pointer",
                  fontSize: "1.1rem",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gap: 22,
                padding: "24px 26px 28px",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(150px, 1fr))",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    padding: 15,
                    border:
                      "1px solid rgba(10, 35, 55, 0.08)",
                    borderRadius: 14,
                    background:
                      "rgba(10, 35, 55, 0.025)",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      marginBottom: 6,
                      color:
                        "var(--color-muted, #6c747b)",
                      fontSize: "0.65rem",
                      fontWeight: 750,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    Rating
                  </span>

                  <StarRating rating={selectedFeedback.rating} />
                </div>

                <div
                  style={{
                    padding: 15,
                    border:
                      "1px solid rgba(10, 35, 55, 0.08)",
                    borderRadius: 14,
                    background:
                      "rgba(10, 35, 55, 0.025)",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      marginBottom: 6,
                      color:
                        "var(--color-muted, #6c747b)",
                      fontSize: "0.65rem",
                      fontWeight: 750,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    Service
                  </span>

                  <strong
                    style={{
                      color:
                        "var(--color-midnight, #071a2b)",
                      fontSize: "0.82rem",
                    }}
                  >
                    {selectedFeedback.serviceName ||
                      "General"}
                  </strong>
                </div>

                <div
                  style={{
                    padding: 15,
                    border:
                      "1px solid rgba(10, 35, 55, 0.08)",
                    borderRadius: 14,
                    background:
                      "rgba(10, 35, 55, 0.025)",
                  }}
                >
                  <span
                    style={{
                      display: "block",
                      marginBottom: 6,
                      color:
                        "var(--color-muted, #6c747b)",
                      fontSize: "0.65rem",
                      fontWeight: 750,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    Customer
                  </span>

                  <strong
                    style={{
                      color:
                        selectedFeedback.verifiedCustomer
                          ? "#356f4b"
                          : "var(--color-midnight, #071a2b)",
                      fontSize: "0.82rem",
                    }}
                  >
                    {selectedFeedback.verifiedCustomer
                      ? "Verified"
                      : "Unverified"}
                  </strong>
                </div>
              </div>

              <div>
                <span
                  style={{
                    display: "block",
                    marginBottom: 9,
                    color:
                      "var(--color-muted, #6c747b)",
                    fontSize: "0.65rem",
                    fontWeight: 750,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  Customer Feedback
                </span>

                <div
                  style={{
                    padding: 18,
                    border:
                      "1px solid rgba(214, 166, 59, 0.18)",
                    borderRadius: 15,
                    background:
                      "rgba(214, 166, 59, 0.045)",
                    color:
                      "var(--color-midnight, #243746)",
                    lineHeight: 1.75,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {selectedFeedback.message}
                </div>
              </div>

              {selectedFeedback.bookingId && (
                <div>
                  <span
                    style={{
                      display: "block",
                      marginBottom: 6,
                      color:
                        "var(--color-muted, #6c747b)",
                      fontSize: "0.65rem",
                      fontWeight: 750,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    Booking ID
                  </span>

                  <code
                    style={{
                      fontSize: "0.78rem",
                      color:
                        "var(--color-midnight, #071a2b)",
                    }}
                  >
                    {selectedFeedback.bookingId}
                  </code>
                </div>
              )}

              <div>
                <label
                  htmlFor="feedback-admin-note"
                  style={{
                    display: "block",
                    marginBottom: 8,
                    color:
                      "var(--color-midnight, #071a2b)",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                  }}
                >
                  Admin Note
                </label>

                <textarea
                  id="feedback-admin-note"
                  value={adminNote}
                  onChange={(event) =>
                    setAdminNote(event.target.value)
                  }
                  maxLength={1000}
                  rows={4}
                  placeholder="Optional internal moderation note…"
                  disabled={Boolean(actionId)}
                  className="admin-search-input feedback-admin-note"
                />
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                  gap: 10,
                  paddingTop: 4,
                }}
              >
                <button
                  type="button"
                  className="admin-service-cancel"
                  onClick={closeFeedback}
                  disabled={Boolean(actionId)}
                >
                  Close
                </button>

                {selectedFeedback.status !== "rejected" && (
                  <button
                    type="button"
                    className="admin-service-cancel"
                    onClick={() =>
                      void updateFeedback(
                        selectedFeedback,
                        "reject"
                      )
                    }
                    disabled={Boolean(actionId)}
                  >
                    {actionId === selectedFeedback.feedbackId
                      ? "Saving…"
                      : "Reject"}
                  </button>
                )}

                {selectedFeedback.status === "approved" &&
                selectedFeedback.publishedAt ? (
                  <button
                    type="button"
                    className="admin-service-cancel"
                    onClick={() =>
                      void updateFeedback(
                        selectedFeedback,
                        "unpublish"
                      )
                    }
                    disabled={Boolean(actionId)}
                  >
                    {actionId === selectedFeedback.feedbackId
                      ? "Saving…"
                      : "Unpublish"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="admin-services-add"
                    onClick={() =>
                      void updateFeedback(
                        selectedFeedback,
                        "approve"
                      )
                    }
                    disabled={Boolean(actionId)}
                  >
                    {actionId === selectedFeedback.feedbackId
                      ? "Saving…"
                      : "Approve & Publish"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
