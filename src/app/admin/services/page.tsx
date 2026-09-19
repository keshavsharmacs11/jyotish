/* src/app/services/page.tsx */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ServiceFinderModal from "@/components/services/ServiceFinderModal";
import { useLanguage } from "@/context/LanguageContext";

type Service = {
  serviceId: string;
  name: string;
  category: string;
  description?: string;
  duration?: number | null;
  price?: number;
  currency?: string;
  availableModes?: ("video" | "voice")[];
  active?: boolean;
};

type GuidanceCard = {
  icon: string;
  title: {
    en: string;
    hi: string;
  };
  questions: {
    en: string;
    hi: string;
  };
};

const guidanceCards: GuidanceCard[] = [
  {
    icon: "✦",
    title: {
      en: "Career & Profession",
      hi: "करियर और पेशा",
    },
    questions: {
      en: "Career decisions • Job changes • Business • Professional growth",
      hi: "करियर से जुड़े निर्णय • नौकरी में बदलाव • व्यवसाय • पेशेवर विकास",
    },
  },
  {
    icon: "♡",
    title: {
      en: "Love & Relationships",
      hi: "प्रेम और रिश्ते",
    },
    questions: {
      en: "Marriage • Compatibility • Relationships • Family matters",
      hi: "विवाह • अनुकूलता • रिश्ते • पारिवारिक विषय",
    },
  },
  {
    icon: "◈",
    title: {
      en: "Life Direction",
      hi: "जीवन की दिशा",
    },
    questions: {
      en: "Major decisions • Life path • Personal challenges • Future planning",
      hi: "महत्वपूर्ण निर्णय • जीवन की दिशा • व्यक्तिगत चुनौतियाँ • भविष्य की योजना",
    },
  },
  {
    icon: "◇",
    title: {
      en: "Self & Personal Patterns",
      hi: "स्वयं और व्यक्तिगत प्रवृत्तियाँ",
    },
    questions: {
      en: "Personality • Numbers • Life patterns • Important dates",
      hi: "व्यक्तित्व • अंक • जीवन की प्रवृत्तियाँ • महत्वपूर्ण तिथियाँ",
    },
  },
  {
    icon: "☽",
    title: {
      en: "Intuitive Guidance",
      hi: "अंतर्ज्ञान आधारित मार्गदर्शन",
    },
    questions: {
      en: "A specific situation • Choices • Emotional clarity • Short-term guidance",
      hi: "किसी विशेष परिस्थिति • विकल्प • भावनात्मक स्पष्टता • अल्पकालिक मार्गदर्शन",
    },
  },
];

function categoryLabel(category?: string) {
  const value = String(category || "").trim();

  if (!value) return "Consultation";

  return value
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatPrice(price?: number, currency = "INR") {
  if (typeof price !== "number" || Number.isNaN(price)) {
    return "Contact us";
  }

  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `₹${price.toLocaleString("en-IN")}`;
  }
}

export default function ServicesPage() {
  const { language } = useLanguage();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [finderOpen, setFinderOpen] = useState(false);

  const isHindi = language === "hi";

  useEffect(() => {
    let cancelled = false;

    async function loadServices() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/services", {
          method: "GET",
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Unable to load services.");
        }

        const activeServices = Array.isArray(data.services)
          ? data.services.filter(
              (service: Service) => service.active !== false
            )
          : [];

        if (!cancelled) {
          setServices(activeServices);
        }
      } catch (err) {
        console.error("SERVICES PAGE ERROR:", err);

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load services."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadServices();

    return () => {
      cancelled = true;
    };
  }, []);

  const serviceCountLabel = useMemo(() => {
    if (loading) {
      return isHindi
        ? "परामर्श सेवाएँ लोड हो रही हैं"
        : "Loading consultations";
    }

    if (error) {
      return isHindi
        ? "परामर्श सेवाएँ उपलब्ध हैं"
        : "Consultations available";
    }

    if (isHindi) {
      return `${services.length} ${
        services.length === 1 ? "परामर्श सेवा" : "परामर्श सेवाएँ"
      } उपलब्ध हैं`;
    }

    return `${services.length} consultation${
      services.length === 1 ? "" : "s"
    } available`;
  }, [error, isHindi, loading, services.length]);

  return (
    <main className="services-page">
      {/* HERO */}
      <section className="services-page-hero">
        <div className="services-page-hero-orbit services-page-hero-orbit-one" />
        <div className="services-page-hero-orbit services-page-hero-orbit-two" />

        <div className="site-container services-page-hero-inner">
          <span className="eyebrow services-page-eyebrow">
            {isHindi ? "हमारी सेवाएँ" : "OUR SERVICES"}
          </span>

          <h1 className="services-page-title">
            {isHindi ? (
              <>
                उन सवालों के लिए
                <span> मार्गदर्शन जो महत्वपूर्ण हैं।</span>
              </>
            ) : (
              <>
                Guidance for the Questions
                <span> That Matter.</span>
              </>
            )}
          </h1>

          <p className="services-page-lead">
            {isHindi
              ? "हर परामर्श इस तरह तैयार किया गया है कि आप अपनी परिस्थिति को बेहतर समझ सकें, अपने विकल्पों पर विचार कर सकें और अधिक स्पष्टता के साथ आगे बढ़ सकें।"
              : "Every consultation is designed to help you understand your situation, explore your options and move forward with greater clarity."}
          </p>

          <div className="services-page-actions">
            <button
              type="button"
              className="btn btn-primary"
              aria-haspopup="dialog"
              aria-controls="service-finder-dialog"
              onClick={() => setFinderOpen(true)}
            >
              {isHindi ? "अपना मार्गदर्शन खोजें" : "Find Your Guidance"}{" "}
              <span aria-hidden="true">↓</span>
            </button>

            <Link href="/book" className="services-page-hero-link">
              {isHindi ? "परामर्श बुक करें" : "Book a Consultation"}{" "}
              <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="services-page-hero-note">
            <span aria-hidden="true">✦</span>

            {services.length > 0
              ? Array.from(
                  new Set(
                    services
                      .map((service) =>
                        categoryLabel(service.category)
                      )
                      .filter(Boolean)
                  )
                ).join(" • ")
              : isHindi
                ? "वर्तमान परामर्श सेवाओं के माध्यम से व्यक्तिगत मार्गदर्शन"
                : "Personalised guidance from our current consultations"}

            <span aria-hidden="true">✦</span>
          </div>
        </div>
      </section>

      {/* INTRO / VALUE */}
      <section className="section services-value-section">
        <div className="site-container">
          <div className="services-value-grid">
            <div className="services-value-heading">
              <span className="eyebrow">
                {isHindi
                  ? "व्यक्तिगत दृष्टिकोण"
                  : "A PERSONAL APPROACH"}
              </span>

              <h2 className="section-heading">
                {isHindi ? (
                  <>
                    केवल एक रीडिंग नहीं।
                    <br />
                    एक स्पष्ट दृष्टिकोण।
                  </>
                ) : (
                  <>
                    More than a reading.
                    <br />
                    A clearer perspective.
                  </>
                )}
              </h2>
            </div>

            <div className="services-value-copy">
              <p>
                {isHindi
                  ? "आपके सवाल व्यक्तिगत हैं, इसलिए परामर्श भी व्यक्तिगत होना चाहिए। हमारा मार्गदर्शन किसी एक ही तरीके के उत्तर के बजाय आपकी परिस्थिति पर केंद्रित रहता है।"
                  : "Your questions are personal, so the consultation should be personal too. Our guidance is centred around your situation rather than a one-size-fits-all answer."}
              </p>

              <div className="services-value-points">
                <div>
                  <span>01</span>
                  <strong>
                    {isHindi
                      ? "व्यक्तिगत समझ"
                      : "Personalised interpretation"}
                  </strong>
                  <p>
                    {isHindi
                      ? "आपका परामर्श आपके व्यक्तिगत प्रश्न और परिस्थितियों पर केंद्रित रहता है।"
                      : "Your consultation is focused on your individual question and circumstances."}
                  </p>
                </div>

                <div>
                  <span>02</span>
                  <strong>
                    {isHindi
                      ? "केंद्रित मार्गदर्शन"
                      : "Focused guidance"}
                  </strong>
                  <p>
                    {isHindi
                      ? "उन जीवन क्षेत्रों पर ध्यान दें जहाँ आपको सबसे अधिक स्पष्टता की आवश्यकता है।"
                      : "Explore the areas of life where you need the most clarity."}
                  </p>
                </div>

                <div>
                  <span>03</span>
                  <strong>
                    {isHindi
                      ? "आगे बढ़ने की स्पष्टता"
                      : "Clarity to move forward"}
                  </strong>
                  <p>
                    {isHindi
                      ? "अपने सत्र से मिले संकेतों और समझ के आधार पर महत्वपूर्ण निर्णयों पर अधिक स्पष्टता से विचार करें।"
                      : "Use the insights from your session to approach important decisions with perspective."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FIND THE RIGHT GUIDANCE */}
      <section
        className="section services-guidance-section"
        id="find-guidance"
        aria-labelledby="find-guidance-title"
      >
        <div className="site-container">
          <div className="services-section-intro">
            <span className="eyebrow">
              {isHindi ? "अपना मार्गदर्शन खोजें" : "FIND YOUR GUIDANCE"}
            </span>

            <h2
              className="section-heading"
              id="find-guidance-title"
            >
              {isHindi
                ? "आपके लिए कौन-सा परामर्श सही है?"
                : "Which consultation is right for you?"}
            </h2>

            <p>
              {isHindi
                ? "अपने मन में मौजूद सवाल से शुरुआत करें। हम आपको उस प्रकार के मार्गदर्शन की ओर ले जाएँगे जो आपकी आवश्यकता के सबसे करीब हो।"
                : "Start with the question on your mind. We'll show you the kind of guidance that best fits what you're looking for."}
            </p>
          </div>

          <div className="guidance-grid">
            {guidanceCards.map((card, index) => (
              <article
                className="guidance-card"
                key={card.title.en}
              >
                <div className="guidance-card-top">
                  <span
                    className="guidance-card-icon"
                    aria-hidden="true"
                  >
                    {card.icon}
                  </span>

                  <span className="guidance-card-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>

                <h3>
                  {isHindi ? card.title.hi : card.title.en}
                </h3>

                <p className="guidance-card-questions">
                  {isHindi
                    ? card.questions.hi
                    : card.questions.en}
                </p>

                <div className="guidance-card-service">
                  <span>
                    {isHindi
                      ? "व्यक्तिगत सुझाव"
                      : "Personalised match"}
                  </span>

                  <strong>
                    {isHindi
                      ? "सही परामर्श खोजें →"
                      : "Find the right consultation →"}
                  </strong>
                </div>

                <button
                  type="button"
                  className="guidance-card-link"
                  aria-haspopup="dialog"
                  aria-controls="service-finder-dialog"
                  onClick={() => setFinderOpen(true)}
                >
                  {isHindi ? "चुनने में सहायता लें" : "Help me choose"}{" "}
                  <span aria-hidden="true">→</span>
                </button>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT YOU RECEIVE */}
      <section className="section services-receive-section">
        <div className="site-container">
          <div className="services-receive-shell">
            <div className="services-receive-heading">
              <span className="eyebrow">
                {isHindi ? "आपको क्या मिलेगा" : "WHAT YOU RECEIVE"}
              </span>

              <h2 className="section-heading">
                {isHindi
                  ? "आपके सवाल के अनुसार तैयार किया गया परामर्श।"
                  : "A consultation built around your question."}
              </h2>

              <p>
                {isHindi
                  ? "वह तरीका चुनें जो आपको सही लगे और अपने सत्र में उन सवालों पर ध्यान दें जो आपके लिए सबसे अधिक महत्वपूर्ण हैं।"
                  : "Choose the approach that feels right for you, then use your session to explore the questions that matter most."}
              </p>
            </div>

            <div className="services-receive-list">
              <div className="services-receive-item">
                <span>✦</span>

                <div>
                  <strong>
                    {isHindi
                      ? "व्यक्तिगत समझ"
                      : "Personalised insight"}
                  </strong>

                  <p>
                    {isHindi
                      ? "आपकी परिस्थिति और आपके सवालों के अनुसार केंद्रित व्याख्या।"
                      : "Interpretation centred on your situation and the questions you bring."}
                  </p>
                </div>
              </div>

              <div className="services-receive-item">
                <span>✦</span>

                <div>
                  <strong>
                    {isHindi
                      ? "केंद्रित बातचीत"
                      : "Focused conversation"}
                  </strong>

                  <p>
                    {isHindi
                      ? "अपने परामर्श समय का उपयोग उन विषयों पर करें जहाँ आपको सबसे अधिक स्पष्टता चाहिए।"
                      : "Use your consultation time for the areas where you need the most clarity."}
                  </p>
                </div>
              </div>

              <div className="services-receive-item">
                <span>✦</span>

                <div>
                  <strong>
                    {isHindi
                      ? "व्यावहारिक दृष्टिकोण"
                      : "Practical perspective"}
                  </strong>

                  <p>
                    {isHindi
                      ? "महत्वपूर्ण निर्णय लेते समय विचार करने के लिए अपने सत्र से उपयोगी समझ लेकर जाएँ।"
                      : "Walk away with insights you can reflect on when making important choices."}
                  </p>
                </div>
              </div>

              <div className="services-receive-item">
                <span>✦</span>

                <div>
                  <strong>
                    {isHindi
                      ? "सुविधाजनक ऑनलाइन अनुभव"
                      : "Comfortable online experience"}
                  </strong>

                  <p>
                    {isHindi
                      ? "प्रत्येक सेवा के साथ उपलब्ध परामर्श माध्यम दिखाए जाते हैं।"
                      : "Available consultation modes are shown with each service below."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE SERVICES */}
      <section
        className="section services-live-section"
        id="consultations"
        aria-labelledby="consultations-title"
      >
        <div className="site-container">
          <div className="services-section-intro services-live-intro">
            <span className="eyebrow">
              {isHindi ? "हमारे परामर्श" : "OUR CONSULTATIONS"}
            </span>

            <h2
              className="section-heading"
              id="consultations-title"
            >
              {isHindi
                ? "अपनी आवश्यकता के अनुसार सेवा चुनें।"
                : "Choose the service that fits your needs."}
            </h2>

            <p>
              {isHindi
                ? "ये विकल्प हमारे परामर्श सिस्टम से प्रबंधित होते हैं, इसलिए यहाँ वर्तमान सक्रिय सेवाएँ, कीमतें, अवधि और उपलब्ध माध्यम दिखाए जाते हैं।"
                : "These options are managed from our consultation system, so the latest active services, prices, durations and available modes are shown here."}
            </p>

            <span className="services-live-count">
              {serviceCountLabel}
            </span>
          </div>

          {loading && (
            <div className="services-page-state">
              <span className="services-page-spinner" />

              <strong>
                {isHindi
                  ? "हमारे परामर्श लोड हो रहे हैं..."
                  : "Loading our consultations..."}
              </strong>

              <p>
                {isHindi
                  ? "वर्तमान में उपलब्ध सेवाएँ खोजी जा रही हैं।"
                  : "Finding the currently available services."}
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="services-page-state services-page-state-error">
              <strong>
                {isHindi
                  ? "इस समय सेवाएँ लोड नहीं हो पा रही हैं।"
                  : "We're unable to load the services right now."}
              </strong>

              <p>
                {isHindi
                  ? "उपलब्ध परामर्श विकल्प देखने के लिए बुकिंग पेज पर जाएँ।"
                  : "Please continue to the booking page to view the available consultation options."}
              </p>

              <Link href="/book" className="btn btn-primary">
                {isHindi
                  ? "बुकिंग विकल्प देखें"
                  : "View Booking Options"}
              </Link>
            </div>
          )}

          {!loading && !error && services.length === 0 && (
            <div className="services-page-state">
              <strong>
                {isHindi
                  ? "इस समय कोई परामर्श सूचीबद्ध नहीं है।"
                  : "No consultations are currently listed."}
              </strong>

              <p>
                {isHindi
                  ? "कृपया कुछ समय बाद फिर देखें या सहायता के लिए हमसे संपर्क करें।"
                  : "Please check back shortly or contact us for assistance."}
              </p>

              <Link href="/contact" className="btn btn-primary">
                {isHindi ? "संपर्क करें" : "Contact Us"}
              </Link>
            </div>
          )}

          {!loading && !error && services.length > 0 && (
            <div className="services-detail-grid">
              {services.map((service, index) => {
                const label = categoryLabel(service.category);
                const price = formatPrice(
                  service.price,
                  service.currency
                );

                return (
                  <article
                    className="services-detail-card"
                    key={
                      service.serviceId ||
                      `${service.name}-${index}`
                    }
                  >
                    <div className="services-detail-card-top">
                      <span
                        className="services-detail-icon"
                        aria-hidden="true"
                      >
                        {service.category
                          ? service.category
                              .slice(0, 1)
                              .toUpperCase()
                          : "✧"}
                      </span>

                      <span className="services-detail-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>

                    <span className="services-detail-category">
                      {label}
                    </span>

                    <h3>{service.name}</h3>

                    <p className="services-detail-description">
                      {service.description ||
                        (isHindi
                          ? "आपके सवालों और जीवन के उन क्षेत्रों के अनुसार तैयार किया गया व्यक्तिगत परामर्श जिन्हें आप समझना चाहते हैं।"
                          : "A personalised consultation designed around the questions and areas of life you want to explore.")}
                    </p>

                    <div className="services-detail-meta">
                      {service.duration &&
                        service.duration > 0 && (
                          <span>
                            <b>
                              {isHindi ? "अवधि" : "Duration"}
                            </b>
                            {service.duration}{" "}
                            {isHindi ? "मिनट" : "min"}
                          </span>
                        )}

                      {service.availableModes &&
                        service.availableModes.length > 0 && (
                          <span>
                            <b>
                              {isHindi ? "माध्यम" : "Mode"}
                            </b>

                            {service.availableModes
                              .map((mode) =>
                                mode === "video"
                                  ? isHindi
                                    ? "वीडियो"
                                    : "Video"
                                  : isHindi
                                    ? "वॉइस"
                                    : "Voice"
                              )
                              .join(" / ")}
                          </span>
                        )}
                    </div>

                    <div className="services-detail-bottom">
                      <div>
                        <small>
                          {isHindi
                            ? "शुरुआती कीमत"
                            : "Starting from"}
                        </small>

                        <strong>{price}</strong>
                      </div>

                      <Link
                        href={`/book?service=${encodeURIComponent(
                          service.serviceId
                        )}`}
                        className="services-detail-book"
                      >
                        {isHindi ? "अभी बुक करें" : "Book Now"}{" "}
                        <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section services-process-section">
        <div className="site-container">
          <div className="services-section-intro">
            <span className="eyebrow">
              {isHindi ? "यह कैसे काम करता है" : "HOW IT WORKS"}
            </span>

            <h2 className="section-heading">
              {isHindi
                ? "आपके सवाल से एक स्पष्ट दिशा तक।"
                : "From your question to a clearer direction."}
            </h2>
          </div>

          <div className="services-process-grid">
            <div className="services-process-step">
              <span>01</span>

              <h3>
                {isHindi ? "अपना सवाल साझा करें" : "Share your question"}
              </h3>

              <p>
                {isHindi
                  ? "उस जीवन क्षेत्र के बारे में सोचें जहाँ आप अधिक स्पष्टता चाहते हैं।"
                  : "Think about the area of life where you would like more clarity."}
              </p>
            </div>

            <div className="services-process-step">
              <span>02</span>

              <h3>
                {isHindi
                  ? "अपना मार्गदर्शन चुनें"
                  : "Choose your guidance"}
              </h3>

              <p>
                {isHindi
                  ? "अपनी आवश्यकता के अनुसार सबसे उपयुक्त परामर्श चुनें।"
                  : "Select the consultation that best matches what you are looking for."}
              </p>
            </div>

            <div className="services-process-step">
              <span>03</span>

              <h3>
                {isHindi ? "अपना सत्र बुक करें" : "Book your session"}
              </h3>

              <p>
                {isHindi
                  ? "उपलब्ध समय चुनें और अपनी सुरक्षित बुकिंग पूरी करें।"
                  : "Choose an available time and complete your secure booking."}
              </p>
            </div>

            <div className="services-process-step">
              <span>04</span>

              <h3>
                {isHindi
                  ? "अपना परामर्श शुरू करें"
                  : "Begin your consultation"}
              </h3>

              <p>
                {isHindi
                  ? "अपने सवालों को समझने और अधिक स्पष्टता पाने के लिए सत्र का उपयोग करें।"
                  : "Use the session to explore your questions and gain a clearer perspective."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* HELP ME CHOOSE */}
      <section className="services-help-section">
        <div className="site-container">
          <div className="services-help-shell">
            <div>
              <span className="eyebrow">
                {isHindi ? "अभी भी तय नहीं कर पा रहे?" : "STILL NOT SURE?"}
              </span>

              <h2>
                {isHindi
                  ? "हमें बताइए कि आप क्या खोज रहे हैं।"
                  : "Tell us what you're looking for."}
              </h2>

              <p>
                {isHindi
                  ? "यदि आपको यह तय करने में सहायता चाहिए कि आपके सवाल के लिए कौन-सा परामर्श सही है, तो हमसे संपर्क करें। हम आपको सही शुरुआत चुनने में सहायता करेंगे।"
                  : "If you are unsure which consultation fits your question, contact us and we'll help you find the right place to begin."}
              </p>
            </div>

            <div className="services-help-actions">
              <Link href="/contact" className="btn btn-secondary">
                {isHindi ? "चुनने में सहायता लें" : "Help Me Choose"}
              </Link>

              <Link
                href="/book"
                className="services-help-book"
              >
                {isHindi
                  ? "परामर्श बुक करें"
                  : "Book Consultation"}{" "}
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <ServiceFinderModal
        open={finderOpen}
        onClose={() => setFinderOpen(false)}
      />
    </main>
  );
}