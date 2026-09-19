import PageHero from "@/components/shared/PageHero";

const refundRules = [
  [
    "Customer requests cancellation after payment",
    "No automatic refund",
    "Once payment is successfully completed, the booking cannot be cancelled through the website. A request does not by itself create a refund entitlement; refunds are handled only under the circumstances stated in this Policy and applicable law.",
    "neutral",
  ],
  [
    "Customer does not attend the consultation",
    "No refund",
    "If the customer does not attend the scheduled consultation, the payment is ordinarily non-refundable.",
    "neutral",
  ],
  [
    "Consultant does not attend",
    "100% refund",
    "If the assigned consultant does not attend and the consultation cannot be provided, the customer is eligible for a full refund.",
    "positive",
  ],
  [
    "Platform or technical failure",
    "100% refund",
    "If a material platform or technical failure attributable to the service prevents the consultation from being provided, the customer is eligible for a full refund.",
    "positive",
  ],
  [
    "Duplicate payment",
    "100% of duplicate amount",
    "Where the same booking is successfully charged more than once, the duplicate amount will be refunded after the duplicate transaction is verified.",
    "positive",
  ],
  [
    "Consultation completed",
    "No refund",
    "Once the consultation has been completed, the payment is ordinarily non-refundable.",
    "neutral",
  ],
  [
    "Customer disagrees with or dislikes the prediction",
    "No refund solely for this reason",
    "A refund is not ordinarily available solely because a customer disagrees with, dislikes, or does not receive the outcome they expected from an interpretive consultation, subject to applicable law.",
    "neutral",
  ],
  [
    "Incorrect customer information",
    "No refund after consultation",
    "Customers are responsible for providing accurate information needed for the consultation. If incorrect information supplied by the customer affects a consultation that has already been provided, a refund will not ordinarily be available.",
    "neutral",
  ],
  [
    "Booking cancelled by Akshaanshh Jyotish",
    "100% refund",
    "If Akshaanshh Jyotish cancels a paid booking and cannot provide the purchased consultation, the customer is eligible for a full refund.",
    "positive",
  ],
  [
    "Payment captured but booking/service cannot be provided",
    "100% refund",
    "If payment has been successfully captured but Akshaanshh Jyotish cannot provide the booked service, the customer is eligible for a full refund.",
    "positive",
  ],
];

const processSteps = [
  [
    "01",
    "Submit the request",
    "Contact us with your booking ID, the email used for the booking, and a brief description of the issue.",
  ],
  [
    "02",
    "Verification",
    "We review the booking and payment records and determine whether the circumstances fall within this Policy.",
  ],
  [
    "03",
    "Refund processing",
    "Where a refund is approved, it is initiated through the payment system used for the original transaction.",
  ],
  [
    "04",
    "Confirmation",
    "Once processed, refund confirmation may be sent to the email address associated with the booking.",
  ],
];

export default function CancellationRefundPolicyPage() {
  return (
    <>
      <PageHero
        eyebrow="LEGAL"
        title="Cancellation & Refund Policy"
        description="A clear guide to what happens when a paid consultation cannot be provided, a payment issue occurs, or a refund is requested."
      />

      <main className="legal-page refund-policy-page">
        <div className="site-container">
          <div className="legal-page-layout">
            <article className="legal-document">
              <header className="legal-document-header" id="overview">
                <span className="legal-document-eyebrow">
                  REFUND &amp; CANCELLATION
                </span>

                <h1>Fair, clear and easy to understand.</h1>

                <p>
                  This Policy explains when a refund may be available for a
                  consultation booked through Akshaanshh Jyotish and how refund
                  requests are handled.
                </p>

                <div className="legal-document-meta">
                  <span>
                    <strong>Effective date</strong>
                    <small>18 September 2026</small>
                  </span>

                  <span>
                    <strong>Last updated</strong>
                    <small>18 September 2026</small>
                  </span>
                </div>
              </header>

              <section className="legal-callout legal-callout-primary">
                <span className="legal-callout-icon">₹</span>

                <div>
                  <strong>
                    Important: there is no online cancellation button after
                    payment.
                  </strong>

                  <p>
                    Once payment has been successfully completed, the customer
                    cannot cancel the booking through the website. Refunds are
                    handled only in the circumstances described below.
                  </p>
                </div>
              </section>

              <section className="legal-section" id="important">
                <div className="legal-section-heading">
                  <span>01</span>

                  <div>
                    <span className="legal-section-kicker">
                      BEFORE PAYMENT
                    </span>

                    <h2>Choose carefully before completing payment.</h2>
                  </div>
                </div>

                <p>
                  Customers should review the selected consultation, date,
                  time, consultation mode, and the information they provide
                  before completing payment. Payment completion confirms the
                  booking process and there is no customer-facing cancellation
                  facility after payment.
                </p>

                <p>
                  If you notice an issue after payment, please contact us
                  promptly with your booking details. We will review the matter
                  against this Policy and applicable law.
                </p>
              </section>

              <section className="legal-section" id="rules">
                <div className="legal-section-heading">
                  <span>02</span>

                  <div>
                    <span className="legal-section-kicker">
                      REFUND RULES
                    </span>

                    <h2>When a refund is available</h2>
                  </div>
                </div>

                <p className="legal-section-intro">
                  These are the standard circumstances currently supported by
                  Akshaanshh Jyotish. They do not limit any rights that cannot
                  lawfully be excluded under applicable law.
                </p>

                <div className="refund-rule-list">
                  {refundRules.map(([title, outcome, detail, tone]) => (
                    <article
                      className={`refund-rule refund-rule-${tone}`}
                      key={title}
                    >
                      <div className="refund-rule-main">
                        <span
                          className="refund-rule-dot"
                          aria-hidden="true"
                        />

                        <div>
                          <h3>{title}</h3>
                          <p>{detail}</p>
                        </div>
                      </div>

                      <span className="refund-rule-outcome">{outcome}</span>
                    </article>
                  ))}
                </div>
              </section>

              <section className="legal-section" id="process">
                <div className="legal-section-heading">
                  <span>03</span>

                  <div>
                    <span className="legal-section-kicker">
                      HOW IT WORKS
                    </span>

                    <h2>Our refund process</h2>
                  </div>
                </div>

                <div className="legal-process-grid">
                  {processSteps.map(([number, title, text]) => (
                    <article className="legal-process-card" key={number}>
                      <span>{number}</span>
                      <h3>{title}</h3>
                      <p>{text}</p>
                    </article>
                  ))}
                </div>

                <div className="legal-callout legal-callout-soft">
                  <span className="legal-callout-icon">↗</span>

                  <div>
                    <strong>Refund timing</strong>

                    <p>
                      After an eligible refund is approved and processed by us,
                      the time taken for funds to appear can depend on the
                      payment provider, bank, card network, or payment method.
                      We do not promise a fixed crediting period outside our
                      control.
                    </p>
                  </div>
                </div>
              </section>

              <section className="legal-section" id="exceptions">
                <div className="legal-section-heading">
                  <span>04</span>

                  <div>
                    <span className="legal-section-kicker">
                      IMPORTANT NOTES
                    </span>

                    <h2>What this Policy does not promise</h2>
                  </div>
                </div>

                <div className="legal-note-list">
                  <div>
                    <strong>No rescheduling system</strong>
                    <p>
                      Akshaanshh Jyotish does not currently provide a
                      customer-facing online rescheduling feature. This Policy
                      does not create a right to reschedule a paid booking.
                    </p>
                  </div>

                  <div>
                    <strong>No guaranteed outcome</strong>
                    <p>
                      Astrology, numerology and tarot consultations are
                      interpretive and guidance-oriented services. A customer’s
                      expectations about a prediction or future outcome do not
                      by themselves create a refund entitlement.
                    </p>
                  </div>

                  <div>
                    <strong>Applicable law remains applicable</strong>
                    <p>
                      Nothing in this Policy is intended to exclude, restrict,
                      or waive any consumer or other statutory right that
                      cannot lawfully be excluded or restricted.
                    </p>
                  </div>

                  <div>
                    <strong>Verification of requests</strong>
                    <p>
                      Refund requests may be checked against booking and
                      payment records. Duplicate transactions are treated
                      separately from ordinary refund requests.
                    </p>
                  </div>
                </div>
              </section>

              <section className="legal-section" id="contact">
                <div className="legal-section-heading">
                  <span>05</span>

                  <div>
                    <span className="legal-section-kicker">CONTACT</span>

                    <h2>Need help with a refund?</h2>
                  </div>
                </div>

                <p>
                  Please contact us with enough information for us to identify
                  the booking and payment. Including the booking ID and the
                  email used for the booking will help us review your request
                  more quickly.
                </p>

                <div className="legal-contact-card">
                  <div>
                    <span>REFUND &amp; SUPPORT</span>
                    <strong>Akshaanshh Jyotish</strong>
                    <p>info.akshaanshhjyotish@gmail.com</p>
                  </div>

                  <a href="mailto:info.akshaanshhjyotish@gmail.com">
                    Email us <span>→</span>
                  </a>
                </div>
              </section>

              <footer className="legal-document-footer">
                <div>
                  <span className="legal-document-eyebrow">
                    AKSHAANSHH JYOTISH
                  </span>

                  <p>
                    This page contains the current Cancellation &amp; Refund
                    Policy for paid consultation bookings.
                  </p>
                </div>

                <a href="/book?return=policy" className="legal-back-link">
                  ← Back to booking
                </a>
              </footer>
            </article>
          </div>
        </div>
      </main>
    </>
  );
}