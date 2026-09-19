"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import PageHero from "@/components/shared/PageHero";
import { useLanguage } from "@/context/LanguageContext";

interface GuestBooking {
  bookingId: string;
  serviceName: string;
  consultantName?: string;
  date: string;
  time: string;
  endTime: string;
  duration: number;
  mode: "video" | "voice";
  price: number;
  currency: string;
  status: string;
  paymentStatus: string;
  refundReason: string;
}

function formatDate(date: string) {
  return new Date(
    `${date}T00:00:00`
  ).toLocaleDateString(
    "en-IN",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }
  );
}

function formatTime(time: string) {
  const [hour, minute] =
    time.split(":").map(Number);

  const suffix =
    hour >= 12 ? "PM" : "AM";
  const hour12 =
    hour % 12 || 12;

  return `${hour12}:${String(
    minute
  ).padStart(2, "0")} ${suffix}`;
}

function formatMode(
  mode: GuestBooking["mode"],
  language: "en" | "hi"
) {
  return mode === "video"
    ? language === "hi"
      ? "वीडियो कॉल"
      : "Video Call"
    : language === "hi"
      ? "वॉइस कॉल"
      : "Voice Call";
}

function formatStatus(
  value: string
) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) =>
      c.toUpperCase()
    );
}

export default function TrackBookingPage() {
  const { language } = useLanguage();
  const searchParams =
    useSearchParams();

  const [bookingId, setBookingId] =
    useState(() =>
      searchParams.get("bookingId")?.trim() || ""
    );
  const [email, setEmail] =
    useState(() =>
      searchParams.get("email")?.trim() || ""
    );
  const [otp, setOtp] =
    useState("");
  const [step, setStep] =
    useState<"details" | "otp" | "result">(
      "details"
    );
  const [loading, setLoading] =
    useState(false);
  const [error, setError] =
    useState("");
  const [message, setMessage] =
    useState("");
  const [booking, setBooking] =
    useState<GuestBooking | null>(
      null
    );

  const loadExistingAccess =
    async () => {
      try {
        const response =
          await fetch(
            "/api/guest/booking/track",
            {
              cache: "no-store",
            }
          );

        const data =
          await response.json();

        if (
          response.ok &&
          data.success
        ) {
          setBooking(
            data.booking
          );
          setStep("result");
        }
      } catch {
        // No active guest-access token. Continue normally.
      }
    };

  useEffect(() => {
    const queryBookingId =
      searchParams.get("bookingId")?.trim() || "";
    const queryEmail =
      searchParams.get("email")?.trim() || "";

    if (queryBookingId) {
      setBookingId((current) =>
        current || queryBookingId
      );
    }

    if (queryEmail) {
      setEmail((current) =>
        current || queryEmail
      );
    }

    void loadExistingAccess();
  }, [searchParams]);

  const requestOtp =
    async (event: FormEvent) => {
      event.preventDefault();
      setError("");
      setMessage("");

      if (!bookingId.trim()) {
        setError(
          language === "hi" ? "अपनी बुकिंग आईडी दर्ज करें।" : "Enter your booking ID."
        );
        return;
      }

      if (!email.trim()) {
        setError(
          language === "hi" ? "बुकिंग के लिए इस्तेमाल किया गया ईमेल पता दर्ज करें।" : "Enter the email address used for the booking."
        );
        return;
      }

      try {
        setLoading(true);

        const response =
          await fetch(
            "/api/guest/booking/request-otp",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                bookingId:
                  bookingId.trim(),
                email:
                  email.trim(),
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
              language === "hi" ? "सत्यापन कोड का अनुरोध नहीं किया जा सका।" : "Unable to request a verification code."
          );
        }

        setMessage(
          data.message ||
            language === "hi" ? "सत्यापन कोड के लिए अपना ईमेल देखें।" : "Check your email for the verification code."
        );
        setStep("otp");
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : language === "hi" ? "सत्यापन कोड का अनुरोध नहीं किया जा सका।" : "Unable to request a verification code."
        );
      } finally {
        setLoading(false);
      }
    };

  const verifyOtp =
    async (event: FormEvent) => {
      event.preventDefault();
      setError("");

      if (!/^\d{6}$/.test(otp)) {
        setError(
          language === "hi" ? "छह अंकों का सत्यापन कोड दर्ज करें।" : "Enter the six-digit verification code."
        );
        return;
      }

      try {
        setLoading(true);

        const response =
          await fetch(
            "/api/guest/booking/verify-otp",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              body: JSON.stringify({
                bookingId:
                  bookingId.trim(),
                otp: otp.trim(),
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
              language === "hi" ? "बुकिंग सत्यापित नहीं की जा सकी।" : "Unable to verify the booking."
          );
        }

        const trackResponse =
          await fetch(
            "/api/guest/booking/track",
            {
              cache: "no-store",
            }
          );

        const trackData =
          await trackResponse.json();

        if (
          !trackResponse.ok ||
          !trackData.success
        ) {
          throw new Error(
            trackData.error ||
              language === "hi" ? "बुकिंग लोड नहीं की जा सकी।" : "Unable to load the booking."
          );
        }

        setBooking(
          trackData.booking
        );
        setStep("result");
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : language === "hi" ? "बुकिंग सत्यापित नहीं की जा सकी।" : "Unable to verify the booking."
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <>
      <PageHero
        eyebrow={language === "hi" ? "अतिथि एक्सेस" : "GUEST ACCESS"}
        title={language === "hi" ? "अपनी बुकिंग ट्रैक करें" : "Track Your Booking"}
        description={language === "hi" ? "अपनी कंसल्टेशन की जानकारी सुरक्षित रूप से देखने के लिए बुकिंग आईडी और बुकिंग के समय इस्तेमाल किया गया ईमेल पता दर्ज करें।" : "Use the booking ID and the email address used during checkout to securely access your consultation details."}
      />

      <section className="section">
        <div className="site-container">
          <div className="guest-track-card surface-card">
            {step !== "result" && (
              <>
                <div className="booking-header">
                  <p className="eyebrow">
                    {language === "hi" ? "सुरक्षित बुकिंग एक्सेस" : "SECURE BOOKING ACCESS"}
                  </p>
                  <h2 className="section-heading">
                    {step === "details"
                      ? language === "hi" ? "अपनी बुकिंग खोजें" : "Find your booking"
                      : language === "hi" ? "अपना सत्यापन कोड दर्ज करें" : "Enter your verification code"}
                  </h2>
                  <p className="section-description">
                    {step === "details"
                      ? language === "hi" ? "किसी अकाउंट की आवश्यकता नहीं है। हम इस बुकिंग के लिए इस्तेमाल किए गए ईमेल पर एक बार उपयोग होने वाला कोड भेजेंगे।" : "No account is required. We will send a one-time code to the email used for this booking."
                      : language === "hi" ? "छह अंकों के कोड के लिए अपना ईमेल देखें। यह 10 मिनट में समाप्त हो जाएगा।" : "Check your email for the six-digit code. It expires in 10 minutes."}
                  </p>
                </div>

                <div className="booking-summary-divider" />

                {step === "details" ? (
                  <form
                    onSubmit={
                      requestOtp
                    }
                    className="guest-track-form"
                  >
                    <label>
                      {language === "hi" ? "बुकिंग आईडी" : "Booking ID"}
                      <input
                        value={
                          bookingId
                        }
                        onChange={(e) =>
                          setBookingId(
                            e.target.value
                          )
                        }
                        placeholder="AKJ-2026-123456"
                        autoComplete="off"
                      />
                    </label>

                    <label>
                      {language === "hi" ? "बुकिंग ईमेल" : "Booking Email"}
                      <input
                        type="email"
                        value={email}
                        onChange={(e) =>
                          setEmail(
                            e.target.value
                          )
                        }
                        placeholder="you@example.com"
                        autoComplete="email"
                      />
                    </label>

                    {error && (
                      <p
                        className="booking-error"
                        role="alert"
                      >
                        {error}
                      </p>
                    )}

                    <button
                      className="btn btn-primary"
                      type="submit"
                      disabled={
                        loading
                      }
                    >
                      {loading
                        ? language === "hi" ? "कोड भेजा जा रहा है..." : "Sending Code..."
                        : language === "hi" ? "सत्यापन कोड भेजें" : "Send Verification Code"}
                    </button>
                  </form>
                ) : (
                  <form
                    onSubmit={
                      verifyOtp
                    }
                    className="guest-track-form"
                  >
                    <div className="guest-track-otp-label">
                      {language === "hi" ? "कोड आपके बुकिंग ईमेल पर भेज दिया गया है" : "Code sent to your booking email"}
                    </div>

                    <input
                      className="guest-track-otp-input"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) =>
                        setOtp(
                          e.target.value.replace(
                            /\D/g,
                            ""
                          )
                        )
                      }
                      placeholder="123456"
                      aria-label={language === "hi" ? "सत्यापन कोड" : "Verification code"}
                    />

                    {message && (
                      <p className="booking-form-help">
                        {message}
                      </p>
                    )}

                    {error && (
                      <p
                        className="booking-error"
                        role="alert"
                      >
                        {error}
                      </p>
                    )}

                    <button
                      className="btn btn-primary"
                      type="submit"
                      disabled={
                        loading
                      }
                    >
                      {loading
                        ? language === "hi" ? "सत्यापन हो रहा है..." : "Verifying..."
                        : language === "hi" ? "सत्यापित करें और बुकिंग देखें" : "Verify & View Booking"}
                    </button>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setStep(
                          "details"
                        );
                        setOtp("");
                        setError("");
                      }}
                    >
                      {language === "hi" ? "अलग जानकारी इस्तेमाल करें" : "Use Different Details"}
                    </button>
                  </form>
                )}
              </>
            )}

            {step === "result" &&
              booking && (
                <div className="guest-track-result">
                  <div className="booking-header">
                    <p className="eyebrow">
                      {language === "hi" ? "बुकिंग सत्यापित" : "BOOKING VERIFIED"}
                    </p>
                    <h2 className="section-heading">
                      {formatStatus(
                        booking.status
                      )}
                    </h2>
                    <p className="section-description">
                      Booking {booking.bookingId}
                    </p>
                  </div>

                  <div className="booking-summary-divider" />

                  <div className="booking-summary-section">
                    <p className="booking-summary-label">
                      {language === "hi" ? "कंसल्टेशन" : "Consultation"}
                    </p>
                    <h3 className="booking-summary-service">
                      {booking.serviceName}
                    </h3>
                  </div>

                  <div className="booking-summary-grid">
                    <div className="booking-summary-item">
                      <span>
                        {language === "hi" ? "कंसल्टेंट" : "Consultant"}
                      </span>
                      <strong>
                        {booking.consultantName ||
                          language === "hi" ? "अभी निर्धारित नहीं" : "To be assigned"}
                      </strong>
                    </div>

                    <div className="booking-summary-item">
                      <span>
                        {language === "hi" ? "तारीख" : "Date"}
                      </span>
                      <strong>
                        {formatDate(
                          booking.date
                        )}
                      </strong>
                    </div>

                    <div className="booking-summary-item">
                      <span>
                        {language === "hi" ? "समय (IST)" : "Time (IST)"}
                      </span>
                      <strong>
                        {formatTime(
                          booking.time
                        )} – {formatTime(
                          booking.endTime
                        )}
                      </strong>
                    </div>

                    <div className="booking-summary-item">
                      <span>
                        {language === "hi" ? "मोड" : "Mode"}
                      </span>
                      <strong>
                        {formatMode(
                          booking.mode,
                          language
                        )}
                      </strong>
                    </div>
                  </div>

                  <div className="booking-summary-divider" />

                  <div className="booking-summary-grid">
                    <div className="booking-summary-item">
                      <span>
                        {language === "hi" ? "भुगतान" : "Payment"}
                      </span>
                      <strong>
                        {formatStatus(
                          booking.paymentStatus
                        )}
                      </strong>
                    </div>

                    <div className="booking-summary-item">
                      <span>
                        {language === "hi" ? "राशि" : "Amount"}
                      </span>
                      <strong>
                        ₹{booking.price.toLocaleString(
                          "en-IN"
                        )}
                      </strong>
                    </div>
                  </div>

                  {booking.refundReason && (
                    <p className="booking-form-help">
                      {language === "hi" ? "रिफंड नोट: " : "Refund note: "}{booking.refundReason}
                    </p>
                  )}

                  <div className="booking-next">
                    <Link
                      href="/book"
                      className="btn btn-primary"
                    >
                      {language === "hi" ? "एक और कंसल्टेशन बुक करें" : "Book Another Consultation"}
                    </Link>

                    <Link
                      href={`/account/create?email=${encodeURIComponent(
                        email
                      )}&bookingId=${encodeURIComponent(
                        bookingId
                      )}`}
                      className="btn btn-secondary"
                    >
                      {language === "hi" ? "अकाउंट बनाएं" : "Create an Account"}
                    </Link>
                  </div>
                </div>
              )}
          </div>
        </div>
      </section>
    </>
  );
}
