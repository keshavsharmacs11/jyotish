"use client";

import { useState } from "react";

const faqs = [
  {
    question: "How do I book a consultation?",
    answer:
      "Simply click on Book Consultation, choose your preferred service, date and time, then confirm your booking.",
  },
  {
    question: "Are online consultations available?",
    answer:
      "Yes. Consultations are conducted online through Google Meet or your preferred platform.",
  },
  {
    question: "Which services do you provide?",
    answer:
      "We provide Vedic Astrology, Numerology and Tarot consultations for career, marriage, business and personal guidance.",
  },
  {
    question: "How long does one consultation last?",
    answer:
      "Most consultations last between 30 and 60 minutes depending on the selected service.",
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className="section">
      <div className="site-container">

        <p className="eyebrow">
          FAQ
        </p>

        <h2 className="section-heading">
          Frequently Asked Questions
        </h2>

        <div className="faq-list">

          {faqs.map((faq, index) => (

            <div
              key={faq.question}
              className="faq-item"
            >

              <button
                className="faq-question"
                onClick={() =>
                  setOpen(open === index ? null : index)
                }
              >
                {faq.question}

                <span>
                  {open === index ? "−" : "+"}
                </span>

              </button>

              {open === index && (
                <p className="faq-answer">
                  {faq.answer}
                </p>
              )}

            </div>

          ))}

        </div>

      </div>
    </section>
  );
}