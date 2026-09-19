"use client";

import Link from "next/link";
import { siteContent } from "@/data/site";
import FadeIn from "@/components/ui/FadeIn";
import { useLanguage } from "@/context/LanguageContext";

export default function Trust() {
  const { trust } = siteContent;
  const { t } = useLanguage();

  return (
    <FadeIn>
      <section
        className="section"
        aria-labelledby="trust-title"
      >
        <div className="site-container">
          <p className="eyebrow">
            {t("home.trust.eyebrow")}
          </p>

          <h2
            id="trust-title"
            className="section-heading"
          >
            {t("home.trust.title")}
          </h2>

          <div className="trust-grid">
            {trust.items.map((item, index) => (
              <article
                key={item.title}
                className="trust-card"
              >
                <div className="trust-card-top">
                  <span className="trust-card-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <span
                    className="trust-card-mark"
                    aria-hidden="true"
                  >
                    ✦
                  </span>
                </div>

                <h3>{item.title}</h3>

                <p>{item.description}</p>
              </article>
            ))}
          </div>

          <div
            className="home-next-step"
            aria-label={t("home.trust.nextStepEyebrow")}
          >
            <div className="home-next-step-copy">
              <span className="eyebrow">
                {t("home.trust.nextStepEyebrow")}
              </span>

              <strong>
                {t("home.trust.nextStepTitle")}
              </strong>
            </div>

            <nav
              className="home-next-step-links"
              aria-label={t("home.trust.nextStepEyebrow")}
            >
              <Link
                href="/services"
                className="home-next-step-link home-next-step-link-primary"
              >
                <span>
                  {t("home.trust.findGuidance")}
                </span>

                <b aria-hidden="true">↗</b>
              </Link>

              <Link
                href="/consultants"
                className="home-next-step-link"
              >
                <span>
                  {t("home.trust.meetConsultants")}
                </span>

                <b aria-hidden="true">↗</b>
              </Link>

              <Link
                href="/book"
                className="home-next-step-link"
              >
                <span>
                  {t("home.trust.bookConsultation")}
                </span>

                <b aria-hidden="true">↗</b>
              </Link>
            </nav>
          </div>
        </div>
      </section>
    </FadeIn>
  );
}