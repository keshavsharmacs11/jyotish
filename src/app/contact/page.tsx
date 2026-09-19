"use client";


import { FormEvent, useEffect, useRef, useState } from "react";
import PageHero from "@/components/shared/PageHero";
type ContactMode = "query" | "feedback";

const queryCategories = [
  "General",
  "Astrology Consultation",
  "Booking",
  "Payment",
  "Technical Support",
  "Service",
  "Other",
];

type FormStatus = {
  type: "success" | "error" | "";
  message: string;
};

export default function ContactPage() {
  const [mode, setMode] = useState<ContactMode>("query");

  const [queryForm, setQueryForm] = useState({
    name: "",
    email: "",
    mobile: "",
    category: "General",
    subject: "",
    message: "",
    website: "",
  });

  const [feedbackForm, setFeedbackForm] = useState({
    name: "",
    email: "",
    rating: 5,
    bookingId: "",
    serviceName: "",
    message: "",
    website: "",
  });

  const [queryStatus, setQueryStatus] = useState<FormStatus>({
    type: "",
    message: "",
  });

  const [feedbackStatus, setFeedbackStatus] = useState<FormStatus>({
    type: "",
    message: "",
  });

  const [querySubmitting, setQuerySubmitting] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);

  const [bookingLookup, setBookingLookup] = useState<{
    status: "idle" | "loading" | "found" | "not_found" | "error";
    message: string;
  }>({
    status: "idle",
    message: "",
  });

  const bookingLookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bookingLookupRequest = useRef(0);

  useEffect(() => {
    const bookingId = feedbackForm.bookingId.trim();

    if (bookingLookupTimer.current) {
      clearTimeout(bookingLookupTimer.current);
      bookingLookupTimer.current = null;
    }

    if (!bookingId) {
      bookingLookupRequest.current += 1;
      setFeedbackForm((current) => ({
        ...current,
        serviceName: "",
      }));
      setBookingLookup({
        status: "idle",
        message: "",
      });
      return;
    }

    setBookingLookup({
      status: "loading",
      message: "Checking booking ID…",
    });

    const requestId = ++bookingLookupRequest.current;

    bookingLookupTimer.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/contact/booking?bookingId=${encodeURIComponent(bookingId)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const data = await response.json().catch(() => null);

        if (requestId !== bookingLookupRequest.current) return;

        if (!response.ok || !data?.booking?.serviceName) {
        setFeedbackForm((current) => ({
          ...current,
          serviceName: "",
        }));

        setBookingLookup({
          status: "not_found",
          message: "Booking ID not found.",
        });

        return;
      }

      setFeedbackForm((current) => ({
        ...current,
        serviceName: String(data.booking.serviceName),
      }));

        setBookingLookup({
          status: "found",
          message: "Booking found. Service added automatically.",
        });
      } catch {
        if (requestId !== bookingLookupRequest.current) return;

        setFeedbackForm((current) => ({
          ...current,
          serviceName: "",
        }));

        setBookingLookup({
          status: "error",
          message: "We couldn't verify this booking right now.",
        });
      }
    }, 500);

    return () => {
      if (bookingLookupTimer.current) {
        clearTimeout(bookingLookupTimer.current);
        bookingLookupTimer.current = null;
      }
    };
  }, [feedbackForm.bookingId]);

  const handleQuerySubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (querySubmitting) return;

    setQueryStatus({
      type: "",
      message: "",
    });

    setQuerySubmitting(true);

    try {
      const response = await fetch("/api/contact/query", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(queryForm),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message || "Unable to send your query. Please try again."
        );
      }

      setQueryStatus({
        type: "success",
        message:
          data?.message ||
          "Your query has been received. Our team will get back to you soon.",
      });

      setQueryForm({
        name: "",
        email: "",
        mobile: "",
        category: "General",
        subject: "",
        message: "",
        website: "",
      });
    } catch (error) {
      setQueryStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
      });
    } finally {
      setQuerySubmitting(false);
    }
  };

  const handleFeedbackSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (feedbackSubmitting) return;

    setFeedbackStatus({
      type: "",
      message: "",
    });

    setFeedbackSubmitting(true);

    try {
      const response = await fetch("/api/contact/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(feedbackForm),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message ||
            "Unable to submit your feedback. Please try again."
        );
      }

      setFeedbackStatus({
        type: "success",
        message:
          data?.message ||
          "Thank you for your feedback. It has been submitted for review.",
      });

      setFeedbackForm({
        name: "",
        email: "",
        rating: 5,
        bookingId: "",
        serviceName: "",
        message: "",
        website: "",
      });
    } catch (error) {
      setFeedbackStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.",
      });
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  return (
    <>
      <PageHero
        eyebrow="CONTACT US"
        title="Let's Start Your Journey"
        description="Have a question, need help with a booking, or want to share your experience? Choose an option below and reach out to us directly."
      />

      <main className="contact-page">
        <section className="contact-section">
          <div className="contact-intro-grid">
            <div className="contact-intro">
              <span className="contact-form-badge">
                WE&apos;RE HERE TO HELP
              </span>

              <h2>
                Speak with us directly.
              </h2>

              <p>
                Whether you have a question about our services, need help
                with a booking, or simply want to share your experience,
                we&apos;d love to hear from you.
              </p>
            </div>

            <div className="contact-trust-card">
              <span>✦</span>

              <div>
                <strong>Every message matters.</strong>
                <p>
                  Queries are reviewed by our team and feedback is moderated
                  before appearing publicly.
                </p>
              </div>
            </div>
          </div>

          <div
            className="contact-mode-switch"
            role="tablist"
            aria-label="Contact options"
          >
            <button
              type="button"
              role="tab"
              aria-selected={mode === "query"}
              className={mode === "query" ? "active" : ""}
              onClick={() => {
                setMode("query");
                setQueryStatus({
                  type: "",
                  message: "",
                });
                setFeedbackStatus({
                  type: "",
                  message: "",
                });
              }}
            >
              <span>✦</span>
              Ask a Query
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={mode === "feedback"}
              className={mode === "feedback" ? "active" : ""}
              onClick={() => {
                setMode("feedback");
                setQueryStatus({
                  type: "",
                  message: "",
                });
                setFeedbackStatus({
                  type: "",
                  message: "",
                });
              }}
            >
              <span>★</span>
              Share Feedback
            </button>
          </div>

          {mode === "query" ? (
            <div className="contact-form-card">
              <div className="contact-form-heading">
                <div>
                  <span className="contact-form-badge">
                    DIRECT SUPPORT
                  </span>

                  <h2>Send us your query</h2>

                  <p>
                    Tell us what you need help with. Your query will be
                    recorded securely and our team will respond to you.
                  </p>
                </div>
              </div>

              <form
                className="contact-form"
                onSubmit={handleQuerySubmit}
                noValidate
              >
                <div className="contact-form-grid">
                  <div className="contact-field">
                    <label htmlFor="query-name">
                      Name <span>*</span>
                    </label>

                    <input
                      id="query-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      value={queryForm.name}
                      onChange={(event) =>
                        setQueryForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Your name"
                      maxLength={120}
                      required
                    />
                  </div>

                  <div className="contact-field">
                    <label htmlFor="query-email">
                      Email <span>*</span>
                    </label>

                    <input
                      id="query-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={queryForm.email}
                      onChange={(event) =>
                        setQueryForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      placeholder="you@example.com"
                      maxLength={320}
                      required
                    />
                  </div>

                  <div className="contact-field">
                    <label htmlFor="query-mobile">
                      Mobile
                    </label>

                    <input
                      id="query-mobile"
                      name="mobile"
                      type="tel"
                      autoComplete="tel"
                      value={queryForm.mobile}
                      onChange={(event) =>
                        setQueryForm((current) => ({
                          ...current,
                          mobile: event.target.value,
                        }))
                      }
                      placeholder="+91 XXXXX XXXXX"
                      maxLength={30}
                    />
                  </div>

                  <div className="contact-field">
                    <label htmlFor="query-category">
                      Category <span>*</span>
                    </label>

                    <select
                      id="query-category"
                      name="category"
                      value={queryForm.category}
                      onChange={(event) =>
                        setQueryForm((current) => ({
                          ...current,
                          category: event.target.value,
                        }))
                      }
                      required
                    >
                      {queryCategories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="contact-field contact-field-full">
                    <label htmlFor="query-subject">
                      Subject <span>*</span>
                    </label>

                    <input
                      id="query-subject"
                      name="subject"
                      type="text"
                      value={queryForm.subject}
                      onChange={(event) =>
                        setQueryForm((current) => ({
                          ...current,
                          subject: event.target.value,
                        }))
                      }
                      placeholder="What can we help you with?"
                      maxLength={200}
                      required
                    />
                  </div>

                  <div className="contact-field contact-field-full">
                    <label htmlFor="query-message">
                      Message <span>*</span>
                    </label>

                    <textarea
                      id="query-message"
                      name="message"
                      rows={7}
                      value={queryForm.message}
                      onChange={(event) =>
                        setQueryForm((current) => ({
                          ...current,
                          message: event.target.value,
                        }))
                      }
                      placeholder="Write your query here..."
                      maxLength={5000}
                      required
                    />

                    <small>
                      {queryForm.message.length}/5000
                    </small>
                  </div>
                </div>

                <div
                  className="contact-honeypot"
                  aria-hidden="true"
                >
                  <label htmlFor="query-website">
                    Website
                  </label>

                  <input
                    id="query-website"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={queryForm.website}
                    onChange={(event) =>
                      setQueryForm((current) => ({
                        ...current,
                        website: event.target.value,
                      }))
                    }
                  />
                </div>

                {queryStatus.message && (
                  <div
                    className={`contact-form-status ${queryStatus.type}`}
                    role={
                      queryStatus.type === "error"
                        ? "alert"
                        : "status"
                    }
                  >
                    {queryStatus.message}
                  </div>
                )}

                <div className="contact-submit">
                  <button
                    type="submit"
                    disabled={querySubmitting}
                  >
                    {querySubmitting
                      ? "Sending..."
                      : "Send Query"}
                  </button>

                  <span>
                    We&apos;ll respond using the email address you provide.
                  </span>
                </div>
              </form>
            </div>
          ) : (
            <div className="contact-form-card">
              <div className="contact-form-heading">
                <div>
                  <span className="contact-form-badge">
                    YOUR EXPERIENCE
                  </span>

                  <h2>Share your feedback</h2>

                  <p>
                    Your experience can help others make a more informed
                    decision. Genuine feedback is reviewed before it is
                    published.
                  </p>
                </div>
              </div>

              <form
                className="contact-form"
                onSubmit={handleFeedbackSubmit}
                noValidate
              >
                <div className="contact-form-grid">
                  <div className="contact-field">
                    <label htmlFor="feedback-name">
                      Name <span>*</span>
                    </label>

                    <input
                      id="feedback-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      value={feedbackForm.name}
                      onChange={(event) =>
                        setFeedbackForm((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      placeholder="Your name"
                      maxLength={120}
                      required
                    />
                  </div>

                  <div className="contact-field">
                    <label htmlFor="feedback-email">
                      Email <span>*</span>
                    </label>

                    <input
                      id="feedback-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={feedbackForm.email}
                      onChange={(event) =>
                        setFeedbackForm((current) => ({
                          ...current,
                          email: event.target.value,
                        }))
                      }
                      placeholder="you@example.com"
                      maxLength={320}
                      required
                    />
                  </div>

                  <div className="contact-field contact-field-full">
                    <label>
                      Your rating <span>*</span>
                    </label>

                    <div
                      className="contact-rating-input"
                      role="radiogroup"
                      aria-label="Rating"
                    >
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          type="button"
                          role="radio"
                          aria-checked={
                            feedbackForm.rating === rating
                          }
                          aria-label={`${rating} out of 5`}
                          className={
                            feedbackForm.rating >= rating
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            setFeedbackForm((current) => ({
                              ...current,
                              rating,
                            }))
                          }
                        >
                          ★
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="contact-field">
                    <label htmlFor="feedback-booking">
                      Booking ID
                    </label>

                    <input
                      id="feedback-booking"
                      name="bookingId"
                      type="text"
                      value={feedbackForm.bookingId}
                      onChange={(event) =>
                        setFeedbackForm((current) => ({
                          ...current,
                          bookingId: event.target.value,
                        }))
                      }
                      placeholder="Optional"
                      maxLength={120}
                      autoComplete="off"
                    />

                    <small>
                      Enter your booking ID and the service will be fetched
                      automatically.
                    </small>

                    {bookingLookup.message && (
                      <small
                        className={`contact-booking-status ${bookingLookup.status}`}
                        role={
                          bookingLookup.status === "not_found" ||
                          bookingLookup.status === "error"
                            ? "alert"
                            : "status"
                        }
                      >
                        {bookingLookup.message}
                      </small>
                    )}
                  </div>

                  <div className="contact-field">
                    <label htmlFor="feedback-service">
                      Service
                    </label>

                    <input
                      id="feedback-service"
                      name="serviceName"
                      type="text"
                      value={feedbackForm.serviceName}
                      placeholder={
                        bookingLookup.status === "loading"
                          ? "Fetching service…"
                          : "Enter a booking ID above"
                      }
                      readOnly
                      aria-readonly="true"
                    />

                    <small>
                      This service is linked to your booking and cannot be
                      changed manually.
                    </small>
                  </div>

                  <div className="contact-field contact-field-full">
                    <label htmlFor="feedback-message">
                      Your feedback <span>*</span>
                    </label>

                    <textarea
                      id="feedback-message"
                      name="message"
                      rows={7}
                      value={feedbackForm.message}
                      onChange={(event) =>
                        setFeedbackForm((current) => ({
                          ...current,
                          message: event.target.value,
                        }))
                      }
                      placeholder="Tell us about your experience..."
                      maxLength={5000}
                      required
                    />

                    <small>
                      {feedbackForm.message.length}/5000
                    </small>
                  </div>
                </div>

                <div
                  className="contact-honeypot"
                  aria-hidden="true"
                >
                  <label htmlFor="feedback-website">
                    Website
                  </label>

                  <input
                    id="feedback-website"
                    name="website"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={feedbackForm.website}
                    onChange={(event) =>
                      setFeedbackForm((current) => ({
                        ...current,
                        website: event.target.value,
                      }))
                    }
                  />
                </div>

                <div className="contact-consent">
                  <span>✦</span>
                  <p>
                    Feedback is moderated before publication. By submitting,
                    you understand that approved feedback may be displayed
                    publicly on the website.
                  </p>
                </div>

                {feedbackStatus.message && (
                  <div
                    className={`contact-form-status ${feedbackStatus.type}`}
                    role={
                      feedbackStatus.type === "error"
                        ? "alert"
                        : "status"
                    }
                  >
                    {feedbackStatus.message}
                  </div>
                )}

                <div className="contact-submit">
                  <button
                    type="submit"
                    disabled={feedbackSubmitting}
                  >
                    {feedbackSubmitting
                      ? "Submitting..."
                      : "Submit Feedback"}
                  </button>

                  <span>
                    Thank you for helping us improve.
                  </span>
                </div>
              </form>
            </div>
          )}

          <div className="contact-direct-grid">
            <div>
              <span>EMAIL</span>
              <strong>Reach us directly</strong>
              <p>
                For general assistance, you can also contact our support
                team through the email address provided on the website.
              </p>
            </div>

            <div>
              <span>RESPONSE</span>
              <strong>We&apos;ll get back to you</strong>
              <p>
                Once your query is received, our team can review it from
                the admin panel and reply directly to your email.
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}