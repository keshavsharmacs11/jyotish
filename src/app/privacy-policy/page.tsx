import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | Akshaanshh Jyotish",
  description:
    "Privacy Policy explaining how Akshaanshh Jyotish handles personal information used for accounts, consultations, bookings and support.",
};

const sections = [
  {
    number: "01",
    title: "What this Policy covers",
    paragraphs: [
      "This Privacy Policy explains how Akshaanshh Jyotish handles personal information when you visit the website, create or use an account, request an astrology-related service, make a booking, contact us, or otherwise interact with our services.",
      "The Policy describes the data practices associated with the services currently offered through the website. Where a particular feature collects information in a materially different way, relevant information may also be provided at the point of collection.",
    ],
  },
  {
    number: "02",
    title: "Information you provide",
    paragraphs: [
      "Depending on how you use the website, we may receive your name, email address, phone number, booking details, consultation preferences and the content of questions, messages or support requests you choose to submit.",
      "For astrology-related services, this may include birth date, birth time, birth place and a specific question. These details are used to provide the requested service and related interpretation.",
    ],
  },
  {
    number: "03",
    title: "Account, device and security information",
    paragraphs: [
      "When you create an account, we process the information required to authenticate you, maintain the account and protect it from misuse. Authentication and session systems may also process technical information needed for security and access control.",
      "We may process information such as IP address, request metadata, session identifiers and security events where reasonably necessary for fraud prevention, rate limiting, abuse prevention, troubleshooting and website security.",
    ],
  },
  {
    number: "04",
    title: "Booking and payment information",
    paragraphs: [
      "When you book a consultation, we process information needed to create, manage and support the booking, including booking ID, selected service, consultant, date, time, consultation mode, customer contact information and transaction status.",
      "Payments are handled through the payment provider offered at checkout. The payment provider may process payment credentials and transaction data under its own terms and privacy notice. We may receive transaction identifiers, payment status and related information needed to confirm, reconcile, support or refund a transaction.",
    ],
  },
  {
    number: "05",
    title: "How we use personal information",
    paragraphs: [
      "We may use personal information to provide requested consultations and website functionality; create and manage accounts and bookings; process payments and refunds; send transactional communications; respond to support requests; prevent fraud and abuse; secure the website; maintain appropriate records; and improve our services.",
      "We may also process information where necessary to comply with applicable law, enforce our Terms, protect users or the website, or establish, exercise or defend legal rights.",
    ],
  },
  {
    number: "06",
    title: "Emails and service communications",
    paragraphs: [
      "We may send transactional communications about account security, invitations, bookings, payment events, refunds, support requests and other service activity. These communications are used to operate the service and are not necessarily marketing messages.",
      "If you contact us, we may retain relevant correspondence and reference information so that we can respond, resolve the issue and maintain an appropriate support record.",
    ],
  },
  {
    number: "07",
    title: "Sharing with service providers and others",
    paragraphs: [
      "We may share personal information with service providers that help operate the website and services, such as payment processors, email providers, hosting and infrastructure providers, database services and security providers, to the extent reasonably necessary for the relevant purpose.",
      "Information may also be disclosed where required by applicable law, valid legal process, or where reasonably necessary to prevent fraud, misuse, security incidents or harm.",
    ],
  },
  {
    number: "08",
    title: "Data retention",
    paragraphs: [
      "We retain personal information for as long as reasonably necessary for the purposes described in this Policy, including providing services, maintaining account and booking records, processing payments or refunds, handling disputes, meeting applicable legal or accounting requirements, and protecting the website.",
      "Different categories of information may therefore be retained for different periods. When information is no longer required, we aim to delete, anonymise or securely dispose of it, subject to applicable retention requirements.",
    ],
  },
  {
    number: "09",
    title: "Your privacy requests and choices",
    paragraphs: [
      "You may contact us to ask questions about how your information is handled or to request correction or updating of inaccurate information. Where applicable law gives you a right to request deletion, withdrawal of consent or another privacy action, we will handle the request in accordance with the applicable requirements.",
      "A deletion or withdrawal request may not apply to information that we are required or permitted to retain for legal compliance, security, fraud prevention, transaction records, dispute resolution or another lawful purpose.",
      "India's Digital Personal Data Protection Act, 2023 and the Digital Personal Data Protection Rules, 2025 have staggered commencement dates. We intend to apply the provisions that are in force and applicable to the relevant processing, and to update this Policy as the remaining provisions become applicable.",
    ],
  },
  {
    number: "10",
    title: "Cookies and similar technologies",
    paragraphs: [
      "The website may use essential cookies or similar technologies for authentication, session management, security and basic functionality. Third-party services integrated into the website may use their own technologies according to their own policies.",
      "You can control cookies through your browser settings. Disabling essential cookies may prevent account, booking or other parts of the website from functioning correctly.",
    ],
  },
  {
    number: "11",
    title: "Security",
    paragraphs: [
      "We use reasonable technical and organisational measures appropriate to the nature of the information and the services we operate. Depending on the system, these measures may include authentication controls, server-side validation, secure session handling, rate limiting, restricted administrative access and protected payment processing through a payment provider.",
      "No internet service can be guaranteed completely secure. If we become aware of a relevant security incident, we will take appropriate steps required by applicable law and the circumstances.",
    ],
  },
  {
    number: "12",
    title: "Children and information about others",
    paragraphs: [
      "The website is intended to be used by people who can lawfully use the service. We do not knowingly seek unnecessary personal information from children. If you provide information about a minor or another person, you should do so only where you have the necessary authority or permission.",
      "If you believe information has been submitted improperly, contact us so that we can review the request and take appropriate action consistent with applicable law.",
    ],
  },
  {
    number: "13",
    title: "Third-party websites and services",
    paragraphs: [
      "The website may contain links to or integrations with third-party websites, payment services or communication tools. Their privacy practices are governed by their own policies, and you should review those policies before providing information directly to them.",
    ],
  },
  {
    number: "14",
    title: "Changes and contact",
    paragraphs: [
      "We may update this Privacy Policy when our services, technology, legal obligations or data practices change. The latest version will be published on this page with an updated date.",
      "For privacy questions or privacy requests, contact Akshaanshh Jyotish at info.akshaanshhjyotish@gmail.com. Please include enough information to identify the relevant account, booking or request, but do not send passwords, PINs or payment authentication credentials.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="legal-page legal-standalone-page privacy-policy-page">
      <div className="site-container">
        <article className="legal-standalone-card">
          <header className="legal-standalone-header">
            <span className="legal-document-eyebrow">LEGAL &amp; PRIVACY</span>
            <h1>Privacy Policy</h1>
            <p>
              How Akshaanshh Jyotish handles the personal information used to
              provide accounts, consultations, bookings, payments and support.
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
            <span className="legal-callout-icon" aria-hidden="true">◌</span>
            <div>
              <strong>We collect information needed to provide the service.</strong>
              <p>
                This can include account and booking details and, for
                astrology-related services, the birth information and question
                you choose to provide.
              </p>
            </div>
          </section>

          <nav className="legal-standalone-nav" aria-label="Privacy sections">
            {sections.map((section) => (
              <a key={section.number} href={`#privacy-${section.number}`}>
                <span>{section.number}</span>
                {section.title}
              </a>
            ))}
          </nav>

          <div className="legal-standalone-sections">
            {sections.map((section) => (
              <section
                className="legal-standalone-section"
                id={`privacy-${section.number}`}
                key={section.number}
              >
                <div className="legal-section-heading">
                  <span>{section.number}</span>
                  <div>
                    <span className="legal-section-kicker">PRIVACY</span>
                    <h2>{section.title}</h2>
                  </div>
                </div>

                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </section>
            ))}
          </div>

          <footer className="legal-document-footer">
            <div>
              <span className="legal-document-eyebrow">RELATED POLICIES</span>
              <p>
                See our Terms &amp; Conditions and Cancellation &amp; Refund Policy
                for the rules that apply to website use and paid bookings.
              </p>
              <div className="legal-link-row">
                <Link href="/terms-and-conditions">
                  Terms &amp; Conditions →
                </Link>
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
