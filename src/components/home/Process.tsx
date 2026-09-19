"use client";

import FadeIn from "@/components/ui/FadeIn";
import { useLanguage } from "@/context/LanguageContext";

export default function Process() {
  const { t } = useLanguage();

  const steps = [
    {
      number: "01",
      title: t("home.process.step1.title"),
      description: t("home.process.step1.description"),
    },
    {
      number: "02",
      title: t("home.process.step2.title"),
      description: t("home.process.step2.description"),
    },
    {
      number: "03",
      title: t("home.process.step3.title"),
      description: t("home.process.step3.description"),
    },
    {
      number: "04",
      title: t("home.process.step4.title"),
      description: t("home.process.step4.description"),
    },
  ];

  return (
    <FadeIn>
      <section className="section">
        <div className="site-container">
          <p className="eyebrow">
            {t("home.process.eyebrow")}
          </p>

          <h2 className="section-heading">
            {t("home.process.title")}
          </h2>

          <div className="process-grid">
            {steps.map((step, index) => (
              <article
                key={step.number}
                className="process-card"
              >
                <div className="process-number">
                  {step.number}
                </div>

                <h3>{step.title}</h3>

                <p>{step.description}</p>

                {index < steps.length - 1 && (
                  <span
                    className="process-connector"
                    aria-hidden="true"
                  />
                )}
              </article>
            ))}
          </div>
        </div>
      </section>
    </FadeIn>
  );
}