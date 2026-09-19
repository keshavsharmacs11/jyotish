"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

type Consultant = {
  _id: string;
  name: string;
  photo?: string;
  specialization: string;
  availableModes: ("video" | "voice")[];
};

export default function ConsultantsPage() {
  const { language, t } = useLanguage();
  const isHindi = language === "hi";

  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadConsultants() {
      try {
        const response = await fetch("/api/consultants", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "Unable to load consultants.");
        }

        if (mounted) {
          setConsultants(data.consultants || []);
        }
      } catch (error) {
        console.error("Consultants page error:", error);

        if (mounted) {
          setConsultants([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadConsultants();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <main className="consultants-page">
      {/* =====================================================
          PREMIUM CONSULTANTS HERO
          ===================================================== */}
      <section className="consultants-page-hero">
        <div
          className="consultants-hero-orbit consultants-hero-orbit-one"
          aria-hidden="true"
        />
        <div
          className="consultants-hero-orbit consultants-hero-orbit-two"
          aria-hidden="true"
        />
        <div className="consultants-hero-glow" aria-hidden="true" />

        <div className="site-container consultants-page-hero-inner">
          <span className="eyebrow consultants-page-eyebrow">
            {t("consultants.personalGuidance")}
          </span>

          <h1 className="consultants-page-title">
            {isHindi ? (
              <>
                आपकी मार्गदर्शक टीम से
                <span>मिलिए।</span>
              </>
            ) : (
              <>
                Meet the People Behind
                <span>Your Guidance.</span>
              </>
            )}
          </h1>

          <p className="consultants-page-lead">
            {isHindi
              ? "अनुभवी विशेषज्ञ आपके सवालों, निर्णयों और अगले कदमों के लिए व्यक्तिगत एवं विचारपूर्ण मार्गदर्शन प्रदान करते हैं।"
              : "Experienced practitioners offering thoughtful, personalised guidance across your questions, choices and next steps."}
          </p>

          <div
            className="consultants-page-hero-note"
            aria-hidden="true"
          >
            <span>✦</span>
            <span>{isHindi ? "विश्वास" : "TRUST"}</span>
            <span>{isHindi ? "स्पष्टता" : "CLARITY"}</span>
            <span>{isHindi ? "सम्बन्ध" : "CONNECTION"}</span>
            <span>✦</span>
          </div>
        </div>
      </section>

      {/* =====================================================
          CONSULTANTS
          ===================================================== */}
      <section className="section consultants-section">
        <div className="site-container">
          <div className="consultants-intro">
            <p className="eyebrow">
              {isHindi ? "हमारे विशेषज्ञ" : "OUR PRACTITIONERS"}
            </p>

            <h2 className="section-heading">
              {isHindi
                ? "ऐसा मार्गदर्शन जो व्यक्तिगत महसूस हो।"
                : "Guidance that feels personal."}
            </h2>

            <p>
              {isHindi
                ? "हमारे सक्रिय विशेषज्ञों को जानें और अपने लिए उपयुक्त मार्गदर्शन का तरीका चुनें।"
                : "Explore our active consultants and choose the guidance style that feels right for you."}
            </p>
          </div>

          {/* =================================================
              LOADING
              ================================================= */}
          {loading ? (
            <div
              className="consultants-loading"
              role="status"
              aria-live="polite"
            >
              <span aria-hidden="true" />

              <p>{t("consultants.loading")}</p>
            </div>
          ) : consultants.length === 0 ? (
            /* ===============================================
               EMPTY STATE
               =============================================== */
            <div className="consultants-loading">
              <p>{t("consultants.noConsultants")}</p>

              <Link href="/book" className="btn btn-primary">
                {isHindi
                  ? "परामर्श देखें →"
                  : "Explore Consultations →"}
              </Link>
            </div>
          ) : (
            /* ===============================================
               CONSULTANT CARDS
               =============================================== */
            <div className="consultants-grid">
              {consultants.map((consultant) => (
                <article
                  key={consultant._id}
                  className="consultant-card"
                >
                  <div className="consultant-photo-wrapper">
                    {consultant.photo ? (
                      <img
                        src={consultant.photo}
                        alt={consultant.name}
                        className="consultant-photo"
                      />
                    ) : (
                      <div
                        className="consultant-photo-placeholder"
                        aria-hidden="true"
                      >
                        <span>
                          {consultant.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}

                    <div
                      className="consultant-photo-glow"
                      aria-hidden="true"
                    />
                  </div>

                  <div className="consultant-content">
                    <h3>{consultant.name}</h3>

                    {/* Dynamic consultant specialization.
                        Do not translate this because it comes
                        directly from the database. */}
                    <p className="consultant-specialization">
                      {consultant.specialization}
                    </p>

                    <div
                      className="consultant-modes"
                      aria-label={
                        isHindi
                          ? "उपलब्ध परामर्श माध्यम"
                          : "Available consultation modes"
                      }
                    >
                      {consultant.availableModes.includes("video") && (
                        <span>
                          <i aria-hidden="true" />
                          {isHindi
                            ? "वीडियो परामर्श"
                            : "Video consultation"}
                        </span>
                      )}

                      {consultant.availableModes.includes("voice") && (
                        <span>
                          <i aria-hidden="true" />
                          {isHindi
                            ? "वॉइस परामर्श"
                            : "Voice consultation"}
                        </span>
                      )}
                    </div>

                    <Link
                      href="/book"
                      className="btn btn-primary consultant-book-button"
                    >
                      {isHindi
                        ? "परामर्श बुक करें →"
                        : "Book a Consultation →"}
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}