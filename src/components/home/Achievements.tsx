"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";

const achievements = [
  {
    id: "award-certificate",
    src: "/images/achievements/award-certificate.jpeg",
    alt: "Award certificate recognising an achievement in astrology",
    eyebrow: "AWARD & RECOGNITION",
    title: "Sanatan Dharma Jyotish Ratan Award",
    detail: "Official award recognition",
  },
  {
    id: "award-presentation",
    src: "/images/achievements/award-presentation.jpeg",
    alt: "Award presentation ceremony",
    eyebrow: "THE AWARD MOMENT",
    title: "Award Presentation",
    detail: "Recognition on the conference stage",
  },
  {
    id: "recognition-stage",
    src: "/images/achievements/recognition-stage.jpeg",
    alt: "Recognition on stage at an astrology event",
    eyebrow: "THE RECOGNITION MOMENT",
    title: "Honoured on the Conference Stage",
    detail: "A moment of recognition and honour",
  },
  {
    id: "recognition-certificate-shweta",
    src: "/images/achievements/recognition-certificate-shweta.jpeg",
    alt: "Vedamritam Best Award recognition certificate",
    eyebrow: "BEST AWARD",
    title: "Vedamritam Best Award",
    detail: "Vedamritam Astro-Vastu & Ayurveda Summit · 2026",
  },
  {
    id: "award-presentation-stage",
    src: "/images/achievements/award-presentation-stage.jpeg",
    alt: "Award being presented during the Vedamritam summit",
    eyebrow: "AWARD CEREMONY",
    title: "Recognition at the Summit",
    detail: "Vedamritam Astro-Vastu & Ayurveda Summit · 2026",
  },
  {
    id: "award-presentation-recognition",
    src: "/images/achievements/award-presentation-recognition.jpeg",
    alt: "Award and certificate presentation on stage",
    eyebrow: "HONOURED ON STAGE",
    title: "Award & Certificate Presentation",
    detail: "A formal moment of recognition",
  },
  {
    id: "conference-group",
    src: "/images/achievements/conference-group.jpeg",
    alt: "Group photograph at the astrology summit",
    eyebrow: "CONFERENCE MOMENT",
    title: "Summit & Community",
    detail: "A gathering of distinguished participants",
  },
  {
    id: "conference-stage",
    src: "/images/achievements/conference-stage.jpeg",
    alt: "Conference stage photograph",
    eyebrow: "CONFERENCE STAGE",
    title: "Among Esteemed Guests",
    detail: "Vedamritam summit · 2026",
  },
  {
    id: "felicitation-bouquet",
    src: "/images/achievements/felicitation-bouquet.jpeg",
    alt: "Felicitation with a bouquet during a recognition event",
    eyebrow: "FELICITATION",
    title: "Honour & Felicitation",
    detail: "A memorable moment of appreciation",
  },
  {
    id: "recognition-certificate-deepak",
    src: "/images/achievements/recognition-certificate-deepak.jpeg",
    alt: "Vedamritam recognition certificate",
    eyebrow: "OFFICIAL RECOGNITION",
    title: "Recognition Certificate",
    detail: "Vedamritam Astro-Vastu & Ayurveda Summit · 2026",
  },
] as const;

const achievementTranslations = {
  en: {
    "award-certificate": {
      eyebrow: "AWARD & RECOGNITION",
      title: "Sanatan Dharma Jyotish Ratan Award",
      detail: "Official award recognition",
    },
    "award-presentation": {
      eyebrow: "THE AWARD MOMENT",
      title: "Award Presentation",
      detail: "Recognition on the conference stage",
    },
    "recognition-stage": {
      eyebrow: "THE RECOGNITION MOMENT",
      title: "Honoured on the Conference Stage",
      detail: "A moment of recognition and honour",
    },
    "recognition-certificate-shweta": {
      eyebrow: "BEST AWARD",
      title: "Vedamritam Best Award",
      detail: "Vedamritam Astro-Vastu & Ayurveda Summit · 2026",
    },
    "award-presentation-stage": {
      eyebrow: "AWARD CEREMONY",
      title: "Recognition at the Summit",
      detail: "Vedamritam Astro-Vastu & Ayurveda Summit · 2026",
    },
    "award-presentation-recognition": {
      eyebrow: "HONOURED ON STAGE",
      title: "Award & Certificate Presentation",
      detail: "A formal moment of recognition",
    },
    "conference-group": {
      eyebrow: "CONFERENCE MOMENT",
      title: "Summit & Community",
      detail: "A gathering of distinguished participants",
    },
    "conference-stage": {
      eyebrow: "CONFERENCE STAGE",
      title: "Among Esteemed Guests",
      detail: "Vedamritam summit · 2026",
    },
    "felicitation-bouquet": {
      eyebrow: "FELICITATION",
      title: "Honour & Felicitation",
      detail: "A memorable moment of appreciation",
    },
    "recognition-certificate-deepak": {
      eyebrow: "OFFICIAL RECOGNITION",
      title: "Recognition Certificate",
      detail: "Vedamritam Astro-Vastu & Ayurveda Summit · 2026",
    },
  },
  hi: {
    "award-certificate": {
      eyebrow: "सम्मान एवं मान्यता",
      title: "सनातन धर्म ज्योतिष रत्न पुरस्कार",
      detail: "आधिकारिक पुरस्कार सम्मान",
    },
    "award-presentation": {
      eyebrow: "पुरस्कार का क्षण",
      title: "पुरस्कार प्रस्तुति",
      detail: "सम्मेलन मंच पर सम्मान",
    },
    "recognition-stage": {
      eyebrow: "सम्मान का क्षण",
      title: "सम्मेलन मंच पर सम्मानित",
      detail: "सम्मान और गौरव का एक विशेष क्षण",
    },
    "recognition-certificate-shweta": {
      eyebrow: "सर्वश्रेष्ठ पुरस्कार",
      title: "वेदामृतम् बेस्ट अवॉर्ड",
      detail: "वेदामृतम् एस्ट्रो-वास्तु एवं आयुर्वेद समिट · 2026",
    },
    "award-presentation-stage": {
      eyebrow: "पुरस्कार समारोह",
      title: "समिट में सम्मान",
      detail: "वेदामृतम् एस्ट्रो-वास्तु एवं आयुर्वेद समिट · 2026",
    },
    "award-presentation-recognition": {
      eyebrow: "मंच पर सम्मानित",
      title: "पुरस्कार एवं प्रमाणपत्र प्रस्तुति",
      detail: "औपचारिक सम्मान का एक विशेष क्षण",
    },
    "conference-group": {
      eyebrow: "सम्मेलन का क्षण",
      title: "समिट एवं समुदाय",
      detail: "विशिष्ट प्रतिभागियों का एक विशेष समागम",
    },
    "conference-stage": {
      eyebrow: "सम्मेलन मंच",
      title: "प्रतिष्ठित अतिथियों के साथ",
      detail: "वेदामृतम् समिट · 2026",
    },
    "felicitation-bouquet": {
      eyebrow: "अभिनंदन",
      title: "सम्मान एवं अभिनंदन",
      detail: "प्रशंसा का एक यादगार क्षण",
    },
    "recognition-certificate-deepak": {
      eyebrow: "आधिकारिक सम्मान",
      title: "सम्मान प्रमाणपत्र",
      detail: "वेदामृतम् एस्ट्रो-वास्तु एवं आयुर्वेद समिट · 2026",
    },
  },
} as const;

export default function Achievements() {
  const { language, t } = useLanguage();

  const [activeIndex, setActiveIndex] = useState(0);

  const [selected, setSelected] =
    useState<(typeof achievements)[number] | null>(null);

  const activeAchievement = achievements[activeIndex];

  const activeTranslation =
    achievementTranslations[language][activeAchievement.id];

  useEffect(() => {
    if (selected) return;

    const timer = window.setInterval(() => {
      setActiveIndex(
        (current) => (current + 1) % achievements.length
      );
    }, 2000);

    return () => window.clearInterval(timer);
  }, [selected]);

  useEffect(() => {
    if (!selected) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelected(null);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [selected, activeIndex]);

  const goTo = (index: number) => {
    setActiveIndex(index);
  };

  const goNext = () => {
    setActiveIndex(
      (current) => (current + 1) % achievements.length
    );
  };

  const goPrevious = () => {
    setActiveIndex(
      (current) =>
        (current - 1 + achievements.length) %
        achievements.length
    );
  };

  return (
    <section
      className="achievements-section"
      aria-labelledby="achievements-title"
    >
      <div
        className="achievements-glow achievements-glow-one"
        aria-hidden="true"
      />

      <div
        className="achievements-glow achievements-glow-two"
        aria-hidden="true"
      />

      <div className="site-container achievements-shell">
        <div className="achievements-intro">
          <div>
            <p className="eyebrow achievements-eyebrow">
              {t("home.achievements.eyebrow")}
            </p>

            <h2
              id="achievements-title"
              className="display-heading achievements-title"
            >
              {t("home.achievements.title")}
            </h2>
          </div>

          <div className="achievements-intro-copy">
            <span
              className="achievements-rule"
              aria-hidden="true"
            />

            <p>
              {t("home.achievements.description")}
            </p>
          </div>
        </div>

        <div className="achievements-showcase">
          <div className="achievements-main-card">
            <button
              type="button"
              className="achievements-main-image"
              style={{ position: "relative" }}
              onClick={() =>
                setSelected(activeAchievement)
              }
              aria-label={
                language === "hi"
                  ? `${activeTranslation.title} फोटो खोलें`
                  : `Open ${activeTranslation.title} photograph`
              }
            >
              <Image
                key={activeAchievement.id}
                src={activeAchievement.src}
                alt={activeAchievement.alt}
                fill
                sizes="(max-width: 900px) 100vw, 68vw"
                className="achievements-main-photo"
                priority={activeIndex === 0}
              />

              <span
                className="achievements-main-shade"
                aria-hidden="true"
              />

              <span
                className="achievements-main-index"
                aria-hidden="true"
              >
                {String(activeIndex + 1).padStart(2, "0")}
              </span>

              <span
                className="achievements-main-expand"
                aria-hidden="true"
              >
                ↗
              </span>
            </button>

            <button
              type="button"
              className="achievements-arrow achievements-arrow-left"
              onClick={goPrevious}
              aria-label={t(
                "home.achievements.previous"
              )}
            >
              ‹
            </button>

            <button
              type="button"
              className="achievements-arrow achievements-arrow-right"
              onClick={goNext}
              aria-label={t(
                "home.achievements.next"
              )}
            >
              ›
            </button>
          </div>

          <div className="achievements-info">
            <span className="achievements-info-number">
              {String(activeIndex + 1).padStart(2, "0")}
              <span>
                / {String(achievements.length).padStart(2, "0")}
              </span>
            </span>

            <span
              className="achievements-info-rule"
              aria-hidden="true"
            />

            <p className="achievements-info-eyebrow">
              {activeTranslation.eyebrow}
            </p>

            <h3>{activeTranslation.title}</h3>

            <p className="achievements-info-detail">
              {activeTranslation.detail}
            </p>

            <button
              type="button"
              className="achievements-info-view"
              onClick={() =>
                setSelected(activeAchievement)
              }
            >
              {t("home.achievements.viewRecognition")}{" "}
              <span aria-hidden="true">↗</span>
            </button>
          </div>
        </div>

        <div className="achievements-carousel-controls">
          <div className="achievements-carousel-dots">
            {achievements.map((item, index) => {
              const translation =
                achievementTranslations[language][item.id];

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`achievements-carousel-dot ${
                    index === activeIndex
                      ? "is-active"
                      : ""
                  }`}
                  onClick={() => goTo(index)}
                  aria-label={
                    language === "hi"
                      ? `सम्मान ${index + 1} दिखाएं: ${translation.title}`
                      : `Show achievement ${index + 1}: ${translation.title}`
                  }
                  aria-current={
                    index === activeIndex
                      ? "true"
                      : undefined
                  }
                />
              );
            })}
          </div>

          <span className="achievements-carousel-status">
            {String(activeIndex + 1).padStart(2, "0")} /{" "}
            {String(achievements.length).padStart(2, "0")}
          </span>
        </div>

        <div
          className="achievements-thumbnails"
          aria-label={t("home.achievements.gallery")}
        >
          {achievements.map((item, index) => {
            const translation =
              achievementTranslations[language][item.id];

            return (
              <button
                key={item.id}
                type="button"
                className={`achievements-thumbnail ${
                  index === activeIndex
                    ? "is-active"
                    : ""
                }`}
                style={{ position: "relative" }}
                onClick={() => goTo(index)}
                aria-label={
                  language === "hi"
                    ? `${translation.title} दिखाएं`
                    : `Show ${translation.title}`
                }
                aria-current={
                  index === activeIndex
                    ? "true"
                    : undefined
                }
              >
                <Image
                  src={item.src}
                  alt=""
                  fill
                  sizes="120px"
                  className="achievements-thumbnail-image"
                />

                <span>
                  {String(index + 1).padStart(2, "0")}
                </span>
              </button>
            );
          })}
        </div>

        <div
          className="achievements-gallery-hint"
          aria-hidden="true"
        >
          <span>⌕</span>{" "}
          {t("home.achievements.galleryHint")}
        </div>

        <div className="achievements-footer">
          <span>
            {t("home.achievements.footer")}
          </span>

          <button
            type="button"
            onClick={() =>
              setSelected(activeAchievement)
            }
          >
            {t("home.achievements.viewRecognition")}{" "}
            <span aria-hidden="true">↗</span>
          </button>
        </div>
      </div>

      {selected && (
        <div
          className="achievement-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={
            language === "hi"
              ? "सम्मान फोटो व्यूअर"
              : "Achievement photograph viewer"
          }
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setSelected(null);
            }
          }}
        >
          <button
            type="button"
            className="achievement-lightbox-close"
            onClick={() => setSelected(null)}
            aria-label={t(
              "home.achievements.closeViewer"
            )}
          >
            ×
          </button>

          <div
            className="achievement-lightbox-image"
            style={{ position: "relative" }}
          >
            <Image
              src={selected.src}
              alt={selected.alt}
              fill
              sizes="92vw"
              className="achievement-image"
            />
          </div>

          <div className="achievement-lightbox-caption">
            <span>
              {
                achievementTranslations[language][
                  selected.id
                ].eyebrow
              }
            </span>

            <strong>
              {
                achievementTranslations[language][
                  selected.id
                ].title
              }
            </strong>

            <small>
              {
                achievementTranslations[language][
                  selected.id
                ].detail
              }
            </small>
          </div>
        </div>
      )}
    </section>
  );
}