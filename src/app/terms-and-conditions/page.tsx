import Link from "next/link";

export const metadata = {
  title: "Terms & Conditions | Akshaanshh Jyotish",
  description:
    "Terms governing use of the Akshaanshh Jyotish website, consultations, bookings, payments and related services.",
};

const sections = [
  {
    number: "01",
    title: "About these Terms",
    paragraphs: [
      "These Terms & Conditions govern your use of the Akshaanshh Jyotish website and the consultation and related services offered through it. By accessing the website, creating an account, submitting information, or placing a booking, you agree to these Terms to the extent permitted by applicable law.",
      "These Terms should be read together with our Privacy Policy and Cancellation & Refund Policy. Additional service-specific conditions may apply where they are shown before you complete a transaction.",
    ],
  },
  {
    number: "02",
    title: "Our services",
    paragraphs: [
      "Akshaanshh Jyotish provides astrology, numerology, tarot and related guidance-oriented consultation services. The service description, duration, consultation mode, availability and price applicable to a booking are shown before payment.",
      "These services are interpretive in nature and are provided for personal reflection and guidance. They are not presented as scientific, medical, legal, financial or guaranteed predictions.",
    ],
  },
  {
    number: "03",
    title: "Eligibility and lawful use",
    paragraphs: [
      "You may use the website only where you are legally able to enter into the relevant transaction and where your use is permitted by applicable law. You must provide truthful information and must not use the website to impersonate another person or to facilitate unlawful activity.",
      "Where a consultation concerns a minor or another person, you should provide information only where you have the appropriate authority or permission to do so.",
    ],
  },
  {
    number: "04",
    title: "Bookings and customer information",
    paragraphs: [
      "You are responsible for reviewing the selected service, consultant, date, time, consultation mode and the information you provide before payment. Depending on the service, this may include your name, contact details, birth date, birth time, birth place and a question or other information you choose to provide.",
      "A booking is treated as confirmed only after the required booking process is completed and payment is successfully recorded. A booking may be associated with a unique booking ID and may contain a snapshot of the service and price applicable at the time of booking.",
    ],
  },
  {
    number: "05",
    title: "Accounts and security",
    paragraphs: [
      "If you create an account, you are responsible for keeping your login details confidential and for activity carried out through your account. Notify us promptly if you believe your account has been accessed without your permission.",
      "We may restrict or suspend access where reasonably necessary for security, fraud prevention, misuse, breach of these Terms, or compliance with applicable law.",
    ],
  },
  {
    number: "06",
    title: "Prices and payments",
    paragraphs: [
      "The price shown for a service at checkout is the price applicable to that booking, together with any taxes, fees or other charges that are clearly stated before payment. We may change prices or service offerings for future transactions.",
      "Payments are processed using the payment method made available at checkout. We do not ask customers to send card PINs, UPI PINs, banking passwords or other payment authentication credentials by email or message.",
    ],
  },
  {
    number: "07",
    title: "Cancellation and refunds",
    paragraphs: [
      "Cancellation, refund and payment-related exceptions are governed by the Cancellation & Refund Policy in force at the time of the relevant transaction, subject to applicable law.",
    ],
    links: [
      {
        label: "View Cancellation & Refund Policy",
        href: "/cancellation-refund-policy",
      },
    ],
  },
  {
    number: "08",
    title: "Nature and limitations of consultations",
    paragraphs: [
      "Astrology, numerology and tarot consultations are interpretive services. They are not a substitute for qualified medical, mental-health, legal, tax, financial, investment or other professional advice.",
      "No consultation or website content guarantees a particular event, diagnosis, relationship outcome, employment result, financial result or other future condition. You remain responsible for decisions you make after receiving guidance from the service.",
    ],
  },
  {
    number: "09",
    title: "Acceptable use",
    paragraphs: [
      "You must not attempt to disrupt or damage the website, bypass authentication or security controls, interfere with another customer's booking, introduce malicious code, or access systems or data that you are not authorised to access.",
      "You must not use the website to submit knowingly false, fraudulent, abusive or unlawful information or to misuse payment, booking, communication or account features.",
    ],
  },
  {
    number: "10",
    title: "Intellectual property",
    paragraphs: [
      "The Akshaanshh Jyotish name, branding, original text, software, graphics, layout and other original materials made available through the website are protected by applicable intellectual-property laws and remain the property of their respective owners.",
      "Except where permitted by law or by written permission, you must not reproduce, republish, sell, distribute, reverse engineer or commercially exploit protected website materials.",
    ],
  },
  {
    number: "11",
    title: "Third-party services and availability",
    paragraphs: [
      "The website may rely on third-party providers for payment processing, email delivery, hosting, communications, security, analytics or other infrastructure. Those providers may have their own terms and privacy notices.",
      "We may temporarily suspend, change or restrict website features for maintenance, security, technical reasons or circumstances outside our reasonable control. We will take reasonable steps to address service issues that materially affect a paid booking.",
    ],
  },
  {
    number: "12",
    title: "Changes, governing law and contact",
    paragraphs: [
      "We may update these Terms when our services, technology, legal obligations or business practices change. The latest version will be published on this page with an updated date. A change does not by itself alter a completed transaction except where required or permitted by law.",
      "These Terms are intended to operate subject to the laws applicable to the services and the transaction. Nothing in these Terms is intended to remove or restrict a consumer or other legal right that cannot lawfully be excluded or restricted.",
      "Questions about these Terms can be sent to info.akshaanshhjyotish@gmail.com.",
    ],
  },
];

export default function TermsAndConditionsPage() {
  return (
    <main className="legal-page legal-standalone-page terms-policy-page">
      <div className="site-container">
        <article className="legal-standalone-card">
          <header className="legal-standalone-header">
            <span className="legal-document-eyebrow">LEGAL</span>
            <h1>Terms &amp; Conditions</h1>
            <p>
              The rules that apply when you use the Akshaanshh Jyotish website,
              create an account, book a consultation or use our services.
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
            <span className="legal-callout-icon" aria-hidden="true">✓</span>
            <div>
              <strong>Please review your booking before payment.</strong>
              <p>
                Accurate customer information and careful review of the selected
                service, date, time and consultation mode help us provide the
                service you requested.
              </p>
            </div>
          </section>

          <nav className="legal-standalone-nav" aria-label="Terms sections">
            {sections.map((section) => (
              <a key={section.number} href={`#terms-${section.number}`}>
                <span>{section.number}</span>
                {section.title}
              </a>
            ))}
          </nav>

          <div className="legal-standalone-sections">
            {sections.map((section) => (
              <section
                className="legal-standalone-section"
                id={`terms-${section.number}`}
                key={section.number}
              >
                <div className="legal-section-heading">
                  <span>{section.number}</span>
                  <div>
                    <span className="legal-section-kicker">TERMS</span>
                    <h2>{section.title}</h2>
                  </div>
                </div>

                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}

                {section.links && (
                  <div className="legal-link-row">
                    {section.links.map((link) => (
                      <Link href={link.href} key={link.href}>
                        {link.label} →
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>

          <footer className="legal-document-footer">
            <div>
              <span className="legal-document-eyebrow">RELATED POLICIES</span>
              <p>
                These Terms should be read together with the Privacy Policy and
                Cancellation &amp; Refund Policy.
              </p>
              <div className="legal-link-row">
                <Link href="/privacy-policy">Privacy Policy →</Link>
                <Link href="/cancellation-refund-policy">
                  Cancellation &amp; Refund Policy →
                </Link>
              </div>
            </div>
            <Link href="/book?return=policy" className="legal-back-link">
              ← Back to booking
            </Link>
          </footer>
        </article>
      </div>
    </main>
  );
}
