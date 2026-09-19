"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

type PublicFeedback = {
  feedbackId: string;
  name: string;
  rating: number;
  message: string;
  serviceName?: string;
  verifiedCustomer: boolean;
  publishedAt?: string;
};

export default function Testimonials() {
  const { t } = useLanguage();

  const [testimonials, setTestimonials] = useState<PublicFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFeedback() {
      try {
        const response = await fetch("/api/feedback?limit=6", {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load feedback");
        }

        const data = await response.json();

        if (!cancelled && Array.isArray(data.feedback)) {
          setTestimonials(data.feedback);
        }
      } catch {
        if (!cancelled) {
          setTestimonials([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    const section = sectionRef.current;

    if (typeof IntersectionObserver === "undefined" || !section) {
      void loadFeedback();

      return () => {
        cancelled = true;
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) {
          return;
        }

        observer.disconnect();
        void loadFeedback();
      },
      { rootMargin: "600px 0px" },
    );

    observer.observe(section);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, []);

  return (
    <section ref={sectionRef} className="section">
      <div className="site-container">
        <p className="eyebrow">{t("home.testimonials.eyebrow")}</p>

        <h2 className="section-heading">
          {t("home.testimonials.title")}
        </h2>

        {loading ? (
          <div
            className="testimonial-grid testimonial-loading"
            aria-label={t("home.testimonials.loading")}
          >
            {[1, 2, 3].map((item) => (
              <article
                key={item}
                className="testimonial-card testimonial-skeleton"
                aria-hidden="true"
              >
                <span className="testimonial-quote-mark">“</span>

                <div className="testimonial-rating">
                  ★★★★★
                </div>

                <div className="testimonial-skeleton-line testimonial-skeleton-line-wide" />
                <div className="testimonial-skeleton-line" />
                <div className="testimonial-skeleton-line testimonial-skeleton-line-short" />

                <div className="testimonial-skeleton-name" />
                <div className="testimonial-skeleton-location" />
              </article>
            ))}
          </div>
        ) : testimonials.length > 0 ? (
          <div className="testimonial-grid">
            {testimonials.map((item) => (
              <article
                key={item.feedbackId}
                className="testimonial-card"
              >
                <span
                  className="testimonial-quote-mark"
                  aria-hidden="true"
                >
                  “
                </span>

                <div
                  className="testimonial-rating"
                  aria-label={`${item.rating} out of 5 stars`}
                >
                  {"★".repeat(item.rating)}
                  {"☆".repeat(5 - item.rating)}
                </div>

                <p className="testimonial-review">
                  "{item.message}"
                </p>

                <div className="testimonial-client">
                  <h3>{item.name}</h3>

                  {item.serviceName && (
                    <span>{item.serviceName}</span>
                  )}

                  {item.verifiedCustomer && (
                    <span
                      className="testimonial-verified"
                      title={t("home.testimonials.verified")}
                    >
                      {t("home.testimonials.verified")}
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="testimonial-empty">
            <span
              className="testimonial-empty-mark"
              aria-hidden="true"
            >
              “
            </span>

            <p>{t("home.testimonials.empty")}</p>
          </div>
        )}
      </div>
    </section>
  );
}