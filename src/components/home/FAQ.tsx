"use client";

import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

export default function FAQ() {
  const { t } = useLanguage();

  const faqData = [
    {
      question: t("home.faq.q1"),
      answer: t("home.faq.a1"),
    },
    {
      question: t("home.faq.q2"),
      answer: t("home.faq.a2"),
    },
    {
      question: t("home.faq.q3"),
      answer: t("home.faq.a3"),
    },
    {
      question: t("home.faq.q4"),
      answer: t("home.faq.a4"),
    },
    {
      question: t("home.faq.q5"),
      answer: t("home.faq.a5"),
    },
  ];

  const [activeIndex, setActiveIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <section className="section">
      <div className="site-container">
        <p className="eyebrow">{t("home.faq.eyebrow")}</p>

        <h2 className="section-heading">
          {t("home.faq.title")}
        </h2>

        <div className="faq-container">
          {faqData.map((faq, index) => (
            <div key={faq.question} className="faq-card">
              <button
                id={`faq-question-${index}`}
                className="faq-question"
                onClick={() => toggle(index)}
                aria-expanded={activeIndex === index}
                aria-controls={`faq-answer-${index}`}
              >
                <span>{faq.question}</span>

                <span className="faq-icon">
                  {activeIndex === index ? "−" : "+"}
                </span>
              </button>

              {activeIndex === index && (
                <div
                  id={`faq-answer-${index}`}
                  className="faq-answer"
                  role="region"
                  aria-labelledby={`faq-question-${index}`}
                >
                  <p>{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}