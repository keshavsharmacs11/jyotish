"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

type CategoryMeta = {
  label: string;
  symbol: string;
};

const categoryMeta: Record<string, CategoryMeta> = {
  astrology: {
    label: "Vedic Astrology",
    symbol: "✦",
  },
  numerology: {
    label: "Numerology",
    symbol: "◈",
  },
  tarot: {
    label: "Tarot Reading",
    symbol: "◇",
  },
};

function getCategoryMeta(
  category: string,
  language: "en" | "hi",
): CategoryMeta {
  const normalized = category.trim().toLowerCase();

  const translations: Record<
    string,
    {
      en: string;
      hi: string;
    }
  > = {
    astrology: {
      en: "Vedic Astrology",
      hi: "वैदिक ज्योतिष",
    },
    numerology: {
      en: "Numerology",
      hi: "अंक ज्योतिष",
    },
    tarot: {
      en: "Tarot Reading",
      hi: "टैरो रीडिंग",
    },
  };

  if (translations[normalized]) {
    return {
      label:
        language === "hi"
          ? translations[normalized].hi
          : translations[normalized].en,
      symbol: categoryMeta[normalized].symbol,
    };
  }

  return {
    label: category || (language === "hi" ? "परामर्श" : "Consultation"),
    symbol: "✧",
  };
}

function formatPrice(
  price?: number,
  currency = "INR",
) {
  if (typeof price !== "number") {
    return null;
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

export default function Services() {
  const { language, t } = useLanguage();

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
          throw new Error(
            data.error || "Unable to load services.",
          );
        }

        if (!cancelled) {
          const activeServices = Array.isArray(data.services)
            ? data.services.filter(
                (service: Service) =>
                  service.active !== false,
              )
            : [];

          setServices(activeServices);
        }
      } catch (err) {
        console.error("HOMEPAGE SERVICES ERROR:", err);

        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load services.",
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

  return (
    <section
      className="services-section"
      id="services"
      aria-labelledby="services-title"
    >
      <div className="site-container">
        {/* HEADER */}

        <div className="section-heading services-heading">
          <span className="eyebrow">
            {t("home.services.eyebrow")}
          </span>

          <h2 id="services-title">
            {t("home.services.title")}
          </h2>

          <p>
            {t("home.services.description")}
          </p>
        </div>

        {/* LOADING */}

        {loading && (
          <div className="services-home-loading">
            <span className="services-home-spinner" />

            <p>
              {t("home.services.loading")}
            </p>
          </div>
        )}

        {/* ERROR */}

        {!loading && error && (
          <div
            className="services-home-error"
            role="status"
          >
            <p>
              {t("home.services.loadError")}
            </p>

            <Link
              href="/book"
              className="btn btn-primary"
            >
              {t("home.services.viewBookingOptions")}
            </Link>
          </div>
        )}

        {/* SERVICES */}

        {!loading &&
          !error &&
          services.length > 0 && (
            <div className="services-grid services-home-grid">
              {services.map((service, index) => {
                const meta = getCategoryMeta(
                  service.category,
                  language,
                );

                const price = formatPrice(
                  service.price,
                  service.currency,
                );

                return (
                  <article
                    className="service-card service-home-card"
                    key={
                      service.serviceId ||
                      `${service.name}-${index}`
                    }
                  >
                    <div className="service-home-top">
                      <span
                        className="service-home-symbol"
                        aria-hidden="true"
                      >
                        {meta.symbol}
                      </span>

                      <span className="service-home-number">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                    </div>

                    <span className="service-home-category">
                      {meta.label}
                    </span>

                    <h3>{service.name}</h3>

                    {service.description && (
                      <p className="service-home-description">
                        {service.description}
                      </p>
                    )}

                    <div
                      className="service-home-details"
                      aria-label={
                        language === "hi"
                          ? "सेवा विवरण"
                          : "Service details"
                      }
                    >
                      {service.duration &&
                        service.duration > 0 && (
                          <span>
                            {service.duration}{" "}
                            {language === "hi"
                              ? "मिनट"
                              : "min"}
                          </span>
                        )}

                      {service.availableModes?.length ? (
                        <span>
                          {service.availableModes.includes(
                            "video",
                          ) &&
                          service.availableModes.includes(
                            "voice",
                          )
                            ? t("home.services.videoVoice")
                            : service.availableModes.includes(
                                  "video",
                                )
                              ? t("home.services.video")
                              : t("home.services.voice")}
                        </span>
                      ) : null}
                    </div>

                    <div className="service-home-bottom">
                      <div className="service-home-price">
                        <span className="service-home-price-label">
                          {t(
                            "home.services.startingFrom",
                          )}
                        </span>

                        <strong>
                          {price ||
                            t(
                              "home.services.contactUs",
                            )}
                        </strong>
                      </div>

                      <Link
                        href={`/book?service=${encodeURIComponent(
                          service.serviceId,
                        )}`}
                        className="service-home-link"
                        aria-label={`${t(
                          "home.services.bookService",
                        )} ${service.name}`}
                      >
                        <span>
                          {t("home.services.bookNow")}
                        </span>

                        <span aria-hidden="true">
                          →
                        </span>
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

        {/* EMPTY */}

        {!loading &&
          !error &&
          services.length === 0 && (
            <div className="services-home-empty">
              <p>
                {t("home.services.empty")}
              </p>

              <Link
                href="/book"
                className="btn btn-primary"
              >
                {t(
                  "home.services.bookConsultation",
                )}
              </Link>
            </div>
          )}

        {/* SERVICES SECTION CTA */}

        {!loading &&
          !error &&
          services.length > 0 && (
            <div className="services-home-footer">
              <div className="services-home-cta-copy">
                <strong>
                  {t("home.services.specific")}
                </strong>

                <p>
                  {t(
                    "home.services.specificDescription",
                  )}
                </p>
              </div>

              <Link
                href="/book"
                className="btn btn-primary service-home-view-all"
              >
                {t("home.services.viewAll")} →
              </Link>
            </div>
          )}
      </div>
    </section>
  );
}