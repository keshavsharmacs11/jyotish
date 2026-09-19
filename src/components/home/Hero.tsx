"use client";

import { useState, type CSSProperties } from "react";
import Button from "@/components/ui/Button";
import SlideLeft from "@/components/ui/SlideLeft";
import SlideRight from "@/components/ui/SlideRight";
import { siteContent } from "@/data/site";
import { useLanguage } from "@/context/LanguageContext";

const zodiacSigns = [
  ["♈", "Aries"],
  ["♉", "Taurus"],
  ["♊", "Gemini"],
  ["♋", "Cancer"],
  ["♌", "Leo"],
  ["♍", "Virgo"],
  ["♎", "Libra"],
  ["♏", "Scorpio"],
  ["♐", "Sagittarius"],
  ["♑", "Capricorn"],
  ["♒", "Aquarius"],
  ["♓", "Pisces"],
] as const;

const questions = [
  {
    id: "career",
    label: "Career",
    question: "Where is my career heading?",
    guidance: "Career • Timing • Strengths",
    icon: "◆",
  },
  {
    id: "relationships",
    label: "Relationships",
    question: "What should I understand about my relationships?",
    guidance: "Relationships • Compatibility • Timing",
    icon: "♡",
  },
  {
    id: "business",
    label: "Business",
    question: "Is this the right time for my next move?",
    guidance: "Business • Timing • Direction",
    icon: "↗",
  },
  {
    id: "life",
    label: "Life Direction",
    question: "Why do I feel stuck right now?",
    guidance: "Clarity • Cycles • Direction",
    icon: "✦",
  },
] as const;

type HeroQuestion = (typeof questions)[number];

const questionTranslations = {
  en: {
    career: {
      label: "Career",
      question: "Where is my career heading?",
      guidance: "Career • Timing • Strengths",
    },
    relationships: {
      label: "Relationships",
      question: "What should I understand about my relationships?",
      guidance: "Relationships • Compatibility • Timing",
    },
    business: {
      label: "Business",
      question: "Is this the right time for my next move?",
      guidance: "Business • Timing • Direction",
    },
    life: {
      label: "Life Direction",
      question: "Why do I feel stuck right now?",
      guidance: "Clarity • Cycles • Direction",
    },
  },
  hi: {
    career: {
      label: "करियर",
      question: "मेरे करियर की दिशा क्या है?",
      guidance: "करियर • समय • क्षमताएँ",
    },
    relationships: {
      label: "रिश्ते",
      question: "मुझे अपने रिश्तों के बारे में क्या समझना चाहिए?",
      guidance: "रिश्ते • अनुकूलता • समय",
    },
    business: {
      label: "व्यवसाय",
      question: "क्या यह मेरे अगले कदम के लिए सही समय है?",
      guidance: "व्यवसाय • समय • दिशा",
    },
    life: {
      label: "जीवन दिशा",
      question: "मुझे अभी ऐसा क्यों लगता है कि मैं आगे नहीं बढ़ पा रहा हूँ?",
      guidance: "स्पष्टता • चक्र • दिशा",
    },
  },
} as const;

export default function Hero() {
  const { hero } = siteContent;
  const { language, t } = useLanguage();

  const [activeQuestion, setActiveQuestion] =
    useState<HeroQuestion>(questions[0]);

  const activeTranslation =
    questionTranslations[language][activeQuestion.id];

  return (
    <section className="hero hero-live">
      <div
        className="hero-orbit hero-orbit-one"
        aria-hidden="true"
      />

      <div
        className="hero-orbit hero-orbit-two"
        aria-hidden="true"
      />

      <div className="site-container hero-grid">
        <SlideLeft>
          <div className="hero-content">
            <p className="eyebrow hero-eyebrow">
              {t("home.hero.eyebrow")}
            </p>

            <h1 className="display-heading hero-title">
              {t("home.hero.title")}
            </h1>

            <p className="hero-description">
              {t("home.hero.description")}
            </p>

            <div className="hero-actions">
              <Button href="/book">
                {t("home.hero.primaryCta")}
              </Button>

              <Button
                href="/services"
                variant="secondary"
              >
                {t("home.hero.secondaryCta")}
              </Button>
            </div>

            <div className="hero-trust">
              <div>
                <strong>
                  {t("home.hero.trust.personal")}
                </strong>

                <span>
                  {t("home.hero.trust.personalDetail")}
                </span>
              </div>

              <div>
                <strong>
                  {t("home.hero.trust.confidential")}
                </strong>

                <span>
                  {t("home.hero.trust.confidentialDetail")}
                </span>
              </div>

              <div>
                <strong>
                  {t("home.hero.trust.online")}
                </strong>

                <span>
                  {t("home.hero.trust.onlineDetail")}
                </span>
              </div>
            </div>
          </div>
        </SlideLeft>

        <SlideRight>
          <div className="hero-visual hero-visual-live">
            <div
              className="hero-celestial-field"
              aria-hidden="true"
            >
              {Array.from({ length: 22 }).map(
                (_, index) => (
                  <span
                    key={index}
                    className={`celestial-star celestial-star-${
                      (index % 8) + 1
                    }`}
                    style={
                      {
                        "--star-index": index,
                      } as CSSProperties
                    }
                  />
                )
              )}

              <span className="celestial-nebula celestial-nebula-one" />
              <span className="celestial-nebula celestial-nebula-two" />
            </div>

            <div
              className="celestial-orbit celestial-orbit-a"
              aria-hidden="true"
            />

            <div
              className="celestial-orbit celestial-orbit-b"
              aria-hidden="true"
            />

            <div className="hero-live-question">
              <div className="hero-live-kicker">
                <span
                  className="hero-live-dot"
                  aria-hidden="true"
                />

                {t("home.hero.questionLabel")}
              </div>

              <p>
                “{activeTranslation.question}”
              </p>

              <span
                className="hero-question-connector"
                aria-hidden="true"
              />
            </div>

            <div
              className="live-zodiac-stage"
              aria-label={
                language === "hi"
                  ? "एनिमेटेड त्रि-आयामी राशि उपकरण"
                  : "Animated three dimensional zodiac instrument"
              }
            >
              <div
                className="zodiac-stage-shadow"
                aria-hidden="true"
              />

              <div className="zodiac-instrument">
                <div
                  className="zodiac-backplate"
                  aria-hidden="true"
                />

                <div
                  className="zodiac-depth-ring zodiac-depth-ring-back"
                  aria-hidden="true"
                />

                <div
                  className="zodiac-depth-ring zodiac-depth-ring-mid"
                  aria-hidden="true"
                />

                <div className="zodiac-rotor zodiac-rotor-slow">
                  <div className="zodiac-metal-ring zodiac-metal-ring-outer" />

                  <div
                    className="zodiac-ring-line zodiac-ring-line-one"
                  />

                  <div
                    className="zodiac-ring-line zodiac-ring-line-two"
                  />
                </div>

                <div className="zodiac-rotor zodiac-rotor-main">
                  <div className="zodiac-metal-ring zodiac-metal-ring-zodiac" />

                  <div
                    className="zodiac-sign-band"
                    aria-hidden="true"
                  />

                  {zodiacSigns.map(
                    ([symbol, name], index) => (
                      <span
                        key={name}
                        className="live-zodiac-sign"
                        title={name}
                        style={
                          {
                            "--zodiac-index": index,
                          } as CSSProperties
                        }
                      >
                        {symbol}
                      </span>
                    )
                  )}
                </div>

                <div className="zodiac-rotor zodiac-rotor-inner">
                  <div className="zodiac-inner-ring zodiac-inner-ring-one" />

                  <div className="zodiac-inner-ring zodiac-inner-ring-two" />

                  <div className="zodiac-orbit-path zodiac-orbit-path-one">
                    <span className="zodiac-orbit-planet" />
                  </div>

                  <div className="zodiac-orbit-path zodiac-orbit-path-two">
                    <span className="zodiac-orbit-planet zodiac-orbit-planet-two" />
                  </div>
                </div>

                <div
                  className="zodiac-axis zodiac-axis-x"
                  aria-hidden="true"
                />

                <div
                  className="zodiac-axis zodiac-axis-y"
                  aria-hidden="true"
                />

                <div
                  className="zodiac-planet zodiac-planet-one"
                  aria-hidden="true"
                />

                <div
                  className="zodiac-planet zodiac-planet-two"
                  aria-hidden="true"
                />

                <div
                  className="zodiac-planet zodiac-planet-three"
                  aria-hidden="true"
                />

                <div className="zodiac-core">
                  <span
                    className="zodiac-core-halo"
                    aria-hidden="true"
                  />

                  <span className="zodiac-core-om">
                    ॐ
                  </span>

                  <strong>AKSHAANSHH</strong>

                  <small>JYOTISH</small>
                </div>

                <div
                  className="zodiac-light-sweep"
                  aria-hidden="true"
                />
              </div>

              <div
                className="zodiac-pedestal"
                aria-hidden="true"
              >
                <span className="zodiac-pedestal-top" />
                <span className="zodiac-pedestal-body" />
                <span className="zodiac-pedestal-base" />
              </div>
            </div>

            <div
              className="hero-live-options"
              role="tablist"
              aria-label={
                language === "hi"
                  ? "मार्गदर्शन का क्षेत्र चुनें"
                  : "Choose an area for guidance"
              }
            >
              {questions.map((item) => {
                const translated =
                  questionTranslations[language][item.id];

                return (
                  <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={
                      activeQuestion.id === item.id
                    }
                    className={
                      activeQuestion.id === item.id
                        ? "is-active"
                        : ""
                    }
                    onClick={() =>
                      setActiveQuestion(item)
                    }
                  >
                    <span>{item.icon}</span>
                    {translated.label}
                  </button>
                );
              })}
            </div>

            <div className="hero-live-guidance">
              <div>
                <span>
                  {t("home.hero.guidanceLabel")}
                </span>

                <strong>
                  {activeTranslation.guidance}
                </strong>

                <p>
                  {t(
                    "home.hero.guidanceDescription"
                  )}
                </p>
              </div>

              <Button href="/book">
                {t("home.hero.exploreGuidance")}
              </Button>
            </div>
          </div>
        </SlideRight>
      </div>
    </section>
  );
}