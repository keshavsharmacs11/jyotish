"use client";

import { useEffect, useState } from "react";

import { useLanguage } from "@/context/LanguageContext";
import { Booking } from "@/types/booking";

type BookingSummaryProps = {
  booking: Booking;
  onProceedToPayment: () => Promise<void> | void;
};

function formatDate(
  date: string,
  language: "en" | "hi"
): string {
  const [year, month, day] = date.split("-").map(Number);

  if (!year || !month || !day) {
    return date;
  }

  return new Intl.DateTimeFormat(
    language === "hi" ? "hi-IN" : "en-IN",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Kolkata",
    }
  ).format(
    new Date(
      Date.UTC(year, month - 1, day, 6)
    )
  );
}

function formatMode(
  mode: Booking["mode"],
  language: "en" | "hi"
): string {
  if (language === "hi") {
    return mode === "video"
      ? "वीडियो कॉल"
      : "वॉइस कॉल";
  }

  return mode === "video"
    ? "Video Call"
    : "Voice Call";
}

export default function BookingSummary({
  booking,
  onProceedToPayment,
}: BookingSummaryProps) {
  const { language } = useLanguage();
  const isHindi = language === "hi";

  const [paymentStarting, setPaymentStarting] =
    useState(false);

  /*
   * Reset the local loading state when the
   * selected booking details change.
   *
   * This component does not create the booking
   * or process payment. It only delegates the
   * existing payment action to the parent.
   */
  useEffect(() => {
    setPaymentStarting(false);
  }, [
    booking.serviceId,
    booking.mode,
    booking.date,
    booking.time,
    booking.customer?.email,
    booking.price,
  ]);

  const handleProceedToPayment = async () => {
    if (paymentStarting) {
      return;
    }

    setPaymentStarting(true);

    try {
      await onProceedToPayment();
    } catch (error) {
      setPaymentStarting(false);
      throw error;
    }
  };

  const formattedDate = formatDate(
    booking.date,
    language
  );

  const formattedMode = formatMode(
    booking.mode,
    language
  );

  const amount = Number(booking.price || 0);

  return (
    <section
      className="booking-summary"
      aria-labelledby="booking-summary-title"
    >
      <div className="booking-summary-card">
        <div className="booking-header">
          <p className="eyebrow">
            {isHindi ? "बुकिंग की समीक्षा" : "REVIEW BOOKING"}
          </p>

          <h2
            id="booking-summary-title"
            className="section-heading"
          >
            {isHindi
              ? "अपनी बुकिंग की जानकारी जाँचें"
              : "Review Your Booking"}
          </h2>

          <p className="section-description">
            {isHindi
              ? "भुगतान से पहले अपनी परामर्श जानकारी की एक बार पुष्टि कर लें।"
              : "Please review your consultation details once before proceeding to payment."}
          </p>
        </div>

        <div className="booking-summary-divider" />

        <div className="booking-summary-section">
          <p className="booking-summary-label">
            {isHindi ? "परामर्श" : "Consultation"}
          </p>

          <h3 className="booking-summary-service">
            {booking.serviceName}
          </h3>
        </div>

        <div className="booking-summary-divider" />

        <div className="booking-summary-grid">
          <div className="booking-summary-item">
            <span>
              {isHindi ? "परामर्श का माध्यम" : "Consultation Mode"}
            </span>

            <strong>{formattedMode}</strong>
          </div>

          <div className="booking-summary-item">
            <span>
              {isHindi ? "ज्योतिष सलाहकार" : "Consultant"}
            </span>

            <strong>
              {booking.consultantName ||
                (isHindi ? "निर्धारित किया जाएगा" : "To be assigned")}
            </strong>
          </div>

          <div className="booking-summary-item">
            <span>
              {isHindi ? "तारीख" : "Date"}
            </span>

            <strong>{formattedDate}</strong>
          </div>

          <div className="booking-summary-item">
            <span>
              {isHindi ? "समय (IST)" : "Time (IST)"}
            </span>

            <strong>{booking.time}</strong>
          </div>
        </div>

        <div className="booking-summary-divider" />

        <div className="booking-summary-section">
          <p className="booking-summary-label">
            {isHindi ? "ग्राहक" : "Customer"}
          </p>

          <div className="booking-summary-customer">
            <strong>
              {booking.customer.fullName}
            </strong>

            <span>{booking.customer.mobile}</span>
            <span>{booking.customer.email}</span>
          </div>
        </div>

        <div className="booking-summary-divider" />

        <div className="booking-summary-price">
          <span>
            {isHindi ? "भुगतान योग्य राशि" : "Amount Payable"}
          </span>

          <strong>
            {booking.currency === "INR" ? "₹" : `${booking.currency} `}
            {amount.toLocaleString(
              language === "hi" ? "hi-IN" : "en-IN"
            )}
          </strong>
        </div>

        <div className="booking-summary-divider" />

        <div className="booking-summary-actions">
          <p className="booking-form-help">
            {isHindi
              ? "आगे बढ़ने पर आप सुरक्षित भुगतान प्रक्रिया पर जाएँगे।"
              : "You will be taken to the secure payment process when you continue."}
          </p>

          <button
            type="button"
            className="btn btn-primary"
            onClick={handleProceedToPayment}
            disabled={paymentStarting}
            aria-busy={paymentStarting}
          >
            {paymentStarting
              ? isHindi
                ? "भुगतान तैयार हो रहा है..."
                : "Preparing Payment..."
              : isHindi
                ? "सुरक्षित भुगतान पर जाएँ →"
                : "Proceed to Secure Payment →"}
          </button>
        </div>
      </div>
    </section>
  );
}
