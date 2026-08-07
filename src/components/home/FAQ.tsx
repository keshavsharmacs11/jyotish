"use client";

import { useState } from "react";

const faqData = [
  {
    question: "How do I book a consultation?",
    answer:
      "Click on the Book Consultation button, select your preferred service, choose an available date and time, and confirm your booking.",
  },
  {
    question: "Are online consultations available?",
    answer:
      "Yes. All consultations are available online through Google Meet or your preferred communication platform.",
  },
  {
    question: "Which services do you provide?",
    answer:
      "We provide Vedic Astrology, Numerology, Tarot Reading, Career Guidance, Marriage Consultation and Business Consultation.",
  },
  {
    question: "How long is one consultation?",
    answer:
      "Most consultations last between 30 and 60 minutes depending on the selected service.",
  },
  {
    question: "Can I reschedule my booking?",
    answer:
      "Yes. You can request a reschedule before your appointment time by contacting our support.",
  },
];

export default function FAQ() {
  const [activeIndex, setActiveIndex] = useState<number | null>(0);

  const toggle = (index: number) => {
    setActiveIndex(activeIndex === index ? null : index);
  };

  return (
    <section className="section">
      <div className="site-container">

        <p className="eyebrow">FAQ</p>

        <h2 className="section-heading">
          Frequently Asked Questions
        </h2>

        <div className="faq-container">
          {faqData.map((faq, index) => (
            <div key={faq.question} className="faq-card">

              <button
                className="faq-question"
                onClick={() => toggle(index)}
              >
                <span>{faq.question}</span>

                <span className="faq-icon">
                  {activeIndex === index ? "−" : "+"}
                </span>

              </button>

              {activeIndex === index && (
                <div className="faq-answer">
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