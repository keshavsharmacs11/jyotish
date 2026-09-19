"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type QueryStatus =
  | "new"
  | "in_progress"
  | "resolved"
  | "closed";

type QueryPriority =
  | "normal"
  | "high"
  | "urgent";

type MessageSender = "customer" | "admin";

interface QueryMessage {
  sender: MessageSender;
  message: string;
  sentAt: string;
  adminId?: string | null;
}

interface ContactQuery {
  _id?: string;
  queryId: string;
  name: string;
  email: string;
  mobile?: string;
  subject: string;
  category: string;
  message: string;
  status: QueryStatus;
  priority: QueryPriority;
  messages: QueryMessage[];
  lastRepliedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_OPTIONS: {
  value: QueryStatus;
  label: string;
}[] = [
  { value: "new", label: "New" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
  { value: "closed", label: "Closed" },
];

const PRIORITY_OPTIONS: {
  value: QueryPriority;
  label: string;
}[] = [
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

function formatDate(value?: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusLabel(status: QueryStatus) {
  return (
    STATUS_OPTIONS.find((option) => option.value === status)
      ?.label || status
  );
}

function priorityLabel(priority: QueryPriority) {
  return (
    PRIORITY_OPTIONS.find(
      (option) => option.value === priority
    )?.label || priority
  );
}

function statusClass(status: QueryStatus) {
  return `admin-query-status admin-query-status-${status}`;
}

function priorityClass(priority: QueryPriority) {
  return `admin-query-priority admin-query-priority-${priority}`;
}

export default function AdminQueriesPage() {
  const [queries, setQueries] = useState<ContactQuery[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState("");
  const [activeSearch, setActiveSearch] = useState("");

  const [statusFilter, setStatusFilter] =
    useState<QueryStatus | "">("");

  const [priorityFilter, setPriorityFilter] =
    useState<QueryPriority | "">("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [selectedQuery, setSelectedQuery] =
    useState<ContactQuery | null>(null);

  const [replyMessage, setReplyMessage] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState("");
  const [replySuccess, setReplySuccess] = useState("");

  const [updatingField, setUpdatingField] = useState<
    "status" | "priority" | null
  >(null);

  const [detailLoading, setDetailLoading] = useState(false);

  const queryCountLabel = useMemo(() => {
    if (pagination.total === 1) {
      return "1 query";
    }

    return `${pagination.total} queries`;
  }, [pagination.total]);

  const loadQueries = useCallback(
    async (page = 1, showRefresh = false) => {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const params = new URLSearchParams();

        params.set("page", String(page));
        params.set("limit", "20");

        if (activeSearch) {
          params.set("search", activeSearch);
        }

        if (statusFilter) {
          params.set("status", statusFilter);
        }

        if (priorityFilter) {
          params.set("priority", priorityFilter);
        }

        const response = await fetch(
          `/api/admin/queries?${params.toString()}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok || !data?.success) {
          throw new Error(
            data?.message || "Unable to load contact queries."
          );
        }

        setQueries(Array.isArray(data.queries) ? data.queries : []);

        setPagination(
          data.pagination || {
            page,
            limit: 20,
            total: 0,
            totalPages: 1,
          }
        );
      } catch (err) {
        console.error("Admin queries load error:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load contact queries."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeSearch, priorityFilter, statusFilter]
  );

  useEffect(() => {
    void loadQueries(1);
  }, [loadQueries]);

  const openQuery = async (query: ContactQuery) => {
    setSelectedQuery(query);
    setReplyMessage("");
    setReplyError("");
    setReplySuccess("");

    /*
     * The list API already returns messages.
     * We still keep this small loading state so the
     * detail panel can safely support future expansion
     * without changing its structure.
     */
    setDetailLoading(true);

    try {
      setSelectedQuery(query);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeQuery = () => {
    if (sendingReply || updatingField) {
      return;
    }

    setSelectedQuery(null);
    setReplyMessage("");
    setReplyError("");
    setReplySuccess("");
  };

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setActiveSearch(search.trim());
  };

  const clearFilters = () => {
    setSearch("");
    setActiveSearch("");
    setStatusFilter("");
    setPriorityFilter("");
  };

  const updateQuery = async (
    queryId: string,
    field: "status" | "priority",
    value: QueryStatus | QueryPriority
  ) => {
    setUpdatingField(field);
    setError("");

    try {
      const response = await fetch("/api/admin/queries", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          queryId,
          [field]: value,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message || `Unable to update query ${field}.`
        );
      }

      const updatedQuery = data.query as ContactQuery;

      setQueries((current) =>
        current.map((item) =>
          item.queryId === updatedQuery.queryId
            ? updatedQuery
            : item
        )
      );

      setSelectedQuery((current) =>
        current?.queryId === updatedQuery.queryId
          ? updatedQuery
          : current
      );
    } catch (err) {
      console.error(
        `Admin query ${field} update error:`,
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : `Unable to update query ${field}.`
      );
    } finally {
      setUpdatingField(null);
    }
  };

  const handleReply = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!selectedQuery || sendingReply) {
      return;
    }

    const message = replyMessage.trim();

    if (!message) {
      setReplyError("Please enter a reply.");
      return;
    }

    if (message.length > 5000) {
      setReplyError(
        "Reply cannot be longer than 5000 characters."
      );
      return;
    }

    setSendingReply(true);
    setReplyError("");
    setReplySuccess("");

    try {
      const response = await fetch(
        "/api/admin/queries/reply",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            queryId: selectedQuery.queryId,
            message,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(
          data?.message || "Unable to send reply."
        );
      }

      const updatedQuery = data.query as
        | ContactQuery
        | undefined;

      if (updatedQuery) {
        setSelectedQuery(updatedQuery);

        setQueries((current) =>
          current.map((item) =>
            item.queryId === updatedQuery.queryId
              ? updatedQuery
              : item
          )
        );
      } else {
        await loadQueries(pagination.page, true);
      }

      setReplyMessage("");

      if (data.emailSent === false) {
        setReplySuccess(
          "Reply was saved, but the customer email could not be sent."
        );
      } else {
        setReplySuccess(
          "Reply saved and email sent successfully."
        );
      }
    } catch (err) {
      console.error("Admin query reply error:", err);

      setReplyError(
        err instanceof Error
          ? err.message
          : "Unable to send reply."
      );
    } finally {
      setSendingReply(false);
    }
  };

  const handlePageChange = (page: number) => {
    if (
      page < 1 ||
      page > pagination.totalPages ||
      page === pagination.page ||
      loading
    ) {
      return;
    }

    void loadQueries(page);
  };

  return (
    <>


      <div className="queries-page">
        <div className="queries-header">
          <div>
            <h1 className="queries-heading">
              Contact Queries
            </h1>

            <p className="queries-description">
              Review customer enquiries, manage their status
              and priority, and reply directly by email.
            </p>
          </div>

          <button
            type="button"
            className="queries-refresh"
            onClick={() =>
              void loadQueries(pagination.page, true)
            }
            disabled={refreshing || loading}
          >
            {refreshing ? "Refreshing…" : "↻ Refresh"}
          </button>
        </div>

        <form
          className="queries-toolbar"
          onSubmit={handleSearch}
        >
          <div className="queries-search">
            <input
              type="search"
              className="queries-input"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search name, email, subject or query ID…"
              aria-label="Search contact queries"
            />
          </div>

          <select
            className="queries-select"
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as QueryStatus | ""
              )
            }
            aria-label="Filter by status"
          >
            <option value="">All statuses</option>

            {STATUS_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>

          <select
            className="queries-select"
            value={priorityFilter}
            onChange={(event) =>
              setPriorityFilter(
                event.target.value as QueryPriority | ""
              )
            }
            aria-label="Filter by priority"
          >
            <option value="">All priorities</option>

            {PRIORITY_OPTIONS.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="submit"
            className="queries-search-button"
          >
            Search
          </button>

          {(activeSearch ||
            statusFilter ||
            priorityFilter) && (
            <button
              type="button"
              className="queries-clear-button"
              onClick={clearFilters}
            >
              Clear
            </button>
          )}
        </form>

        {error && (
          <div className="queries-error" role="alert">
            {error}
          </div>
        )}

        <div className="queries-summary">
          <span>{queryCountLabel}</span>

          <span>
            Page {pagination.page} of{" "}
            {pagination.totalPages}
          </span>
        </div>

        <div className="queries-table-wrap">
          {loading ? (
            <div className="queries-loading">
              Loading contact queries…
            </div>
          ) : queries.length === 0 ? (
            <div className="queries-empty">
              <h2 className="queries-empty-title">
                No queries found
              </h2>

              <p className="queries-empty-text">
                {activeSearch ||
                statusFilter ||
                priorityFilter
                  ? "Try changing your search or filters."
                  : "Customer queries will appear here when submitted."}
              </p>
            </div>
          ) : (
            <table className="queries-table">
              <thead>
                <tr>
                  <th>Query</th>
                  <th>Customer</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Priority</th>
                  <th>Received</th>
                </tr>
              </thead>

              <tbody>
                {queries.map((query) => (
                  <tr
                    key={query.queryId}
                    onClick={() => void openQuery(query)}
                  >
                    <td>
                      <span className="query-id">
                        {query.queryId}
                      </span>
                    </td>

                    <td>
                      <div className="query-customer">
                        <strong>{query.name}</strong>
                        <span>{query.email}</span>
                      </div>
                    </td>

                    <td>
                      <div className="query-subject">
                        <strong>{query.subject}</strong>
                        <span className="query-category">
                          {query.category}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`query-badge ${statusClass(
                          query.status
                        )}`}
                      >
                        {statusLabel(query.status)}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`query-badge ${priorityClass(
                          query.priority
                        )}`}
                      >
                        {priorityLabel(query.priority)}
                      </span>
                    </td>

                    <td>
                      <span
                        style={{
                          fontSize: "11px",
                          opacity: 0.55,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {formatDate(query.createdAt)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {!loading &&
          pagination.totalPages > 1 && (
            <div className="queries-pagination">
              <button
                type="button"
                className="queries-page-button"
                disabled={pagination.page <= 1}
                onClick={() =>
                  handlePageChange(
                    pagination.page - 1
                  )
                }
              >
                ←
              </button>

              {Array.from(
                {
                  length: Math.min(
                    pagination.totalPages,
                    5
                  ),
                },
                (_, index) => {
                  let pageNumber = index + 1;

                  if (
                    pagination.totalPages > 5 &&
                    pagination.page > 3
                  ) {
                    pageNumber =
                      pagination.page - 2 + index;

                    if (
                      pageNumber >
                      pagination.totalPages
                    ) {
                      pageNumber =
                        pagination.totalPages -
                        4 +
                        index;
                    }
                  }

                  return (
                    <button
                      key={pageNumber}
                      type="button"
                      className={`queries-page-button ${
                        pageNumber ===
                        pagination.page
                          ? "queries-page-button-active"
                          : ""
                      }`}
                      onClick={() =>
                        handlePageChange(pageNumber)
                      }
                    >
                      {pageNumber}
                    </button>
                  );
                }
              )}

              <button
                type="button"
                className="queries-page-button"
                disabled={
                  pagination.page >=
                  pagination.totalPages
                }
                onClick={() =>
                  handlePageChange(
                    pagination.page + 1
                  )
                }
              >
                →
              </button>
            </div>
          )}
      </div>

      {selectedQuery && (
        <div
          className="query-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeQuery();
            }
          }}
        >
          <aside
            className="query-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="query-panel-title"
          >
            <div className="query-panel-header">
              <div>
                <p className="query-panel-kicker">
                  {selectedQuery.queryId}
                </p>

                <h2
                  id="query-panel-title"
                  className="query-panel-title"
                >
                  {selectedQuery.subject}
                </h2>
              </div>

              <button
                type="button"
                className="query-panel-close"
                onClick={closeQuery}
                disabled={
                  sendingReply ||
                  updatingField !== null
                }
                aria-label="Close query"
              >
                ×
              </button>
            </div>

            <div className="query-panel-body">
              {detailLoading ? (
                <div className="query-detail-loading">
                  Loading query…
                </div>
              ) : (
                <>
                  <div className="query-meta-grid">
                    <div className="query-meta-card">
                      <span className="query-meta-label">
                        Customer
                      </span>

                      <span className="query-meta-value">
                        {selectedQuery.name}
                      </span>
                    </div>

                    <div className="query-meta-card">
                      <span className="query-meta-label">
                        Email
                      </span>

                      <span className="query-meta-value">
                        {selectedQuery.email}
                      </span>
                    </div>

                    <div className="query-meta-card">
                      <span className="query-meta-label">
                        Mobile
                      </span>

                      <span className="query-meta-value">
                        {selectedQuery.mobile || "Not provided"}
                      </span>
                    </div>

                    <div className="query-meta-card">
                      <span className="query-meta-label">
                        Category
                      </span>

                      <span className="query-meta-value">
                        {selectedQuery.category}
                      </span>
                    </div>

                    <div className="query-meta-card">
                      <span className="query-meta-label">
                        Submitted
                      </span>

                      <span className="query-meta-value">
                        {formatDate(
                          selectedQuery.createdAt
                        )}
                      </span>
                    </div>

                    <div className="query-meta-card">
                      <span className="query-meta-label">
                        Last Reply
                      </span>

                      <span className="query-meta-value">
                        {formatDate(
                          selectedQuery.lastRepliedAt
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="query-controls">
                    <div className="query-control">
                      <label htmlFor="query-status">
                        Status
                      </label>

                      <select
                        id="query-status"
                        className="queries-select"
                        value={selectedQuery.status}
                        disabled={
                          updatingField !== null
                        }
                        onChange={(event) =>
                          void updateQuery(
                            selectedQuery.queryId,
                            "status",
                            event.target
                              .value as QueryStatus
                          )
                        }
                      >
                        {STATUS_OPTIONS.map(
                          (option) => (
                            <option
                              key={option.value}
                              value={option.value}
                            >
                              {option.label}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    <div className="query-control">
                      <label htmlFor="query-priority">
                        Priority
                      </label>

                      <select
                        id="query-priority"
                        className="queries-select"
                        value={
                          selectedQuery.priority
                        }
                        disabled={
                          updatingField !== null
                        }
                        onChange={(event) =>
                          void updateQuery(
                            selectedQuery.queryId,
                            "priority",
                            event.target
                              .value as QueryPriority
                          )
                        }
                      >
                        {PRIORITY_OPTIONS.map(
                          (option) => (
                            <option
                              key={option.value}
                              value={option.value}
                            >
                              {option.label}
                            </option>
                          )
                        )}
                      </select>
                    </div>
                  </div>

                  <section className="query-message-section">
                    <h3 className="query-section-title">
                      Original Query
                    </h3>

                    <div className="query-original-message">
                      {selectedQuery.message}
                    </div>
                  </section>

                  <section>
                    <h3 className="query-section-title">
                      Conversation
                    </h3>

                    <div className="query-thread">
                      {selectedQuery.messages?.length ? (
                        selectedQuery.messages.map(
                          (message, index) => (
                            <div
                              key={`${selectedQuery.queryId}-${index}-${message.sentAt}`}
                              className={`query-thread-message ${
                                message.sender ===
                                "admin"
                                  ? "query-thread-message-admin"
                                  : ""
                              }`}
                            >
                              <div className="query-thread-top">
                                <span className="query-thread-sender">
                                  {message.sender ===
                                  "admin"
                                    ? "Admin"
                                    : "Customer"}
                                </span>

                                <span className="query-thread-time">
                                  {formatDate(
                                    message.sentAt
                                  )}
                                </span>
                              </div>

                              <p className="query-thread-text">
                                {message.message}
                              </p>
                            </div>
                          )
                        )
                      ) : (
                        <div className="query-original-message">
                          No conversation messages found.
                        </div>
                      )}
                    </div>
                  </section>

                  <form
                    className="query-reply-box"
                    onSubmit={handleReply}
                  >
                    <h3 className="query-section-title">
                      Reply to Customer
                    </h3>

                    <textarea
                      className="queries-reply"
                      value={replyMessage}
                      onChange={(event) =>
                        setReplyMessage(
                          event.target.value
                        )
                      }
                      placeholder="Write your reply to the customer…"
                      maxLength={5000}
                      disabled={sendingReply}
                    />

                    <div className="query-reply-footer">
                      <span className="query-reply-counter">
                        {replyMessage.length}/5000
                      </span>

                      <button
                        type="submit"
                        className="query-reply-button"
                        disabled={
                          sendingReply ||
                          !replyMessage.trim()
                        }
                      >
                        {sendingReply
                          ? "Sending…"
                          : "Send Reply →"}
                      </button>
                    </div>

                    {replyError && (
                      <div
                        className="query-reply-error"
                        role="alert"
                      >
                        {replyError}
                      </div>
                    )}

                    {replySuccess && (
                      <div
                        className="query-reply-success"
                        role="status"
                      >
                        {replySuccess}
                      </div>
                    )}
                  </form>
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
