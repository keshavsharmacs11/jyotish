"use client";

import Button from "@/components/ui/Button";
import { useLanguage } from "@/context/LanguageContext";

export default function CTA() {
  const { t } = useLanguage();

  return (
    <section className="section">
      <div className="site-container">
        <div className="cta-box">
          <p className="eyebrow">{t("home.cta.eyebrow")}</p>

          <h2 className="section-heading">
            {t("home.cta.title")}
          </h2>

          <p className="cta-description">
            {t("home.cta.description")}
          </p>

          <div className="cta-actions">
            <Button href="/book">
              {t("home.cta.primary")}
            </Button>

            <Button href="/services" variant="secondary">
              {t("home.cta.secondary")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}