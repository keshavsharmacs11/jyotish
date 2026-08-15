"use client";

import { Booking } from "@/types/booking";

type BookingSummaryProps = {
  booking: Booking;
  onProceedToPayment: () => void;
};

export default function BookingSummary({
  booking,
  onProceedToPayment,
}: BookingSummaryProps) {
  const formattedDate = new Date(
    `${booking.date}T00:00:00`
  ).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const formattedMode =
    booking.mode === "video"
      ? "Video Call"
      : "Voice Call";

  const formattedPrice =
    booking.price > 0
      ? `₹${booking.price.toLocaleString("en-IN")}`
      : "To be confirmed";

  return (
    <section className="booking-summary">

      {/* ================================
          HEADER
      ================================= */}

      <div className="booking-header">
        <p className="eyebrow">
          STEP 6
        </p>

        <h2 className="section-heading">
          Review Your Booking
        </h2>

        <p className="section-description">
          Please review all your consultation
          details carefully before proceeding
          to secure payment.
        </p>
      </div>

      <div className="booking-summary-card">

        {/* ================================
            CONSULTATION
        ================================= */}

        <div className="booking-summary-section">

          <p className="booking-summary-label">
            Consultation
          </p>

          <h3 className="booking-summary-service">
            {booking.serviceName}
          </h3>

        </div>

        <div className="booking-summary-divider" />

        {/* ================================
            CONSULTATION DETAILS
        ================================= */}

        <div className="booking-summary-grid">

          <div className="booking-summary-item">
            <span>
              Consultation Mode
            </span>

            <strong>
              {formattedMode}
            </strong>
          </div>

          <div className="booking-summary-item">
            <span>
              Consultant
            </span>

            <strong>
              {booking.consultantName ||
                "Consultant assigned"}
            </strong>
          </div>

          <div className="booking-summary-item">
            <span>
              Date
            </span>

            <strong>
              {formattedDate}
            </strong>
          </div>

          <div className="booking-summary-item">
            <span>
              Time
            </span>

            <strong>
              {booking.time}
            </strong>
          </div>

        </div>

        <div className="booking-summary-divider" />

        {/* ================================
            CUSTOMER
        ================================= */}

        <div className="booking-summary-section">

          <p className="booking-summary-label">
            Customer
          </p>

          <div className="booking-summary-customer">

            <strong>
              {booking.customer.fullName}
            </strong>

            <span>
              {booking.customer.mobile}
            </span>

            <span>
              {booking.customer.email}
            </span>

          </div>

        </div>

        <div className="booking-summary-divider" />

        {/* ================================
            PAYMENT
        ================================= */}

        <div className="booking-summary-price">

          <span>
            Total Consultation Fee
          </span>

          <strong>
            {formattedPrice}
          </strong>

        </div>

        {/* ================================
            PAYMENT NOTE
        ================================= */}

        <p
          className="section-description"
          style={{
            marginTop: "16px",
            marginBottom: "0",
          }}
        >
          You will be securely redirected to
          Razorpay to complete your payment.
        </p>

        {/* ================================
            ACTION
        ================================= */}

        <div className="booking-summary-action">

          <button
            type="button"
            className="btn btn-primary"
            onClick={onProceedToPayment}
            disabled={booking.price <= 0}
          >
            {booking.price > 0
              ? `Confirm & Pay ${formattedPrice} →`
              : "Payment Amount Unavailable"}
          </button>

        </div>

      </div>
    </section>
  );
}