"use client";

import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

const content = {
  hi: {
    heroEyebrow: "✨ अक्षांश ज्योतिष ✨",
    heroTitle: "संभावनाओं को समझना, दिशा को स्पष्ट करना",
    heroQuote: "“भविष्य बताना नहीं, संभावनाओं को समझना हमारा उद्देश्य है।”",
    heroIntro:
      "हर व्यक्ति की कहानी अलग होती है। हमारा प्रयास आपके प्रश्न, आपकी परिस्थितियों और आगे की संभावनाओं को स्पष्ट और व्यावहारिक तरीके से समझने में आपकी सहायता करना है।",
    primary: "परामर्श बुक करें",
    secondary: "हमारी सेवाएँ देखें",

    storyEyebrow: "हम कौन हैं",
    storyTitle: "हर व्यक्ति की कहानी अलग होती है।",
    storyLead:
      "किसी की कुंडली में अवसर छिपे होते हैं, किसी की परिस्थितियों में चुनौतियाँ होती हैं और कई बार सही समय का इंतज़ार ही सबसे बड़ा उत्तर होता है।",
    storyText:
      "अक्षांश ज्योतिष में हमारा प्रयास केवल यह बताना नहीं है कि “क्या होगा?” बल्कि यह समझना है कि “क्यों हो रहा है, कब बदलाव की संभावना है और उपलब्ध परिस्थितियों में बेहतर दिशा क्या हो सकती है?”",

    approachEyebrow: "हमारा दृष्टिकोण",
    approachTitle: "ज्योतिष को डर नहीं, समझ और आत्मचिंतन का माध्यम मानना।",
    approachText:
      "हम ज्योतिष को अंधविश्वास या डर का माध्यम नहीं, बल्कि आत्मचिंतन, समय की समझ और सही निर्णय की दिशा में एक पारंपरिक मार्गदर्शन के रूप में देखते हैं।",
    principle: "अंधविश्वास नहीं। अनावश्यक भय नहीं। सार्थक मार्गदर्शन।",

    pillarsEyebrow: "हमारी प्रमुख विधाएँ",
    pillarsTitle: "एक प्रश्न को समझने के कई पारंपरिक तरीके हैं।",
    pillarsIntro:
      "परिस्थिति के अनुसार अलग-अलग विधाओं के संकेतों को समझने और उनके व्यावहारिक अर्थ पर विचार करने का प्रयास किया जाता है।",

    pillars: [
      {
        icon: "🔱",
        number: "01",
        title: "जन्मकुंडली",
        subtitle: "ग्रहों से आगे की कहानी",
        text:
          "कुंडली हमारे लिए केवल ग्रहों और भावों का चार्ट नहीं है। भाव, भावेश, ग्रहों की दृष्टि, योग, दशा-अन्तर्दशा, गोचर और उनके आपसी संबंधों का सूक्ष्म अध्ययन करके जीवन के अलग-अलग पहलुओं को समझने का प्रयास किया जाता है।",
        tags: "करियर • व्यवसाय • धन • विवाह • रिश्ते • शिक्षा • संतान • परिवार",
        footer:
          "हमारा उद्देश्य केवल योग बताना नहीं, बल्कि उसके व्यावहारिक अर्थ और जीवन में संभावित प्रभाव को समझाना है।",
      },
      {
        icon: "🔢",
        number: "02",
        title: "अंक ज्योतिष",
        subtitle: "जब अंकों की भी अपनी भाषा होती है",
        text:
          "हर संख्या केवल एक अंक नहीं होती। जन्मतिथि, मूलांक, भाग्यांक और नाम से जुड़े संकेतों का अध्ययन करके व्यक्ति के स्वभाव, सोच, निर्णय क्षमता और जीवन की प्रवृत्तियों को समझने का प्रयास किया जाता है।",
        tags: "व्यक्तिगत जीवन • करियर • व्यवसाय • महत्वपूर्ण निर्णय",
        footer:
          "हम अंक ज्योतिष को केवल “लकी नंबर” तक सीमित नहीं रखते, बल्कि अंकों के पीछे छिपे पैटर्न को समझने का प्रयास करते हैं।",
      },
      {
        icon: "🃏",
        number: "03",
        title: "टैरो",
        subtitle: "सवाल आपका, संकेत कार्ड्स के",
        text:
          "कई बार हमारे पास प्रश्न होता है, लेकिन उसका उत्तर स्पष्ट नहीं होता। टैरो वर्तमान परिस्थितियों, भावनाओं, विकल्पों और संभावित दिशाओं को एक अलग तरीके से देखने का माध्यम है।",
        tags: "करियर • रिश्ता • व्यवसाय • महत्वपूर्ण निर्णय",
        footer:
          "टैरो हमारे लिए भविष्य की गारंटी नहीं, बल्कि वर्तमान को समझने का एक दर्पण है।",
      },
    ],

    additionalEyebrow: "अतिरिक्त मार्गदर्शन",
    additionalTitle: "जहाँ परिस्थिति अलग हो, वहाँ तरीका भी अलग हो सकता है।",

    additional: [
      {
        icon: "🔮",
        title: "प्रश्न ज्योतिष",
        subtitle: "जब जन्म समय उपलब्ध न हो",
        text:
          "हर व्यक्ति को अपनी जन्मतिथि और जन्मसमय की सटीक जानकारी हो, यह आवश्यक नहीं। ऐसी स्थिति में प्रश्न ज्योतिष में प्रश्न पूछे जाने के समय की ज्योतिषीय स्थिति के आधार पर उससे जुड़े संकेतों का अध्ययन किया जाता है।",
      },
      {
        icon: "🏠",
        title: "वास्तु",
        subtitle: "घर बदले बिना ऊर्जा का संतुलन",
        text:
          "वास्तु का अर्थ हमेशा तोड़फोड़, निर्माण या बड़े खर्च से नहीं है। दिशा, मुख्य द्वार, कमरों की स्थिति, उपयोग और वस्तुओं की व्यवस्था का अध्ययन करके जहाँ संभव हो, सरल और व्यावहारिक सुधारों पर ध्यान दिया जाता है।",
      },
      {
        icon: "🪔",
        title: "उपाय",
        subtitle: "सरलता में ही सार",
        text:
          "हमारा जोर ऐसे सरल, सात्त्विक और व्यावहारिक उपायों पर रहता है जिन्हें व्यक्ति अपनी दिनचर्या और परिस्थितियों के अनुसार सहजता से कर सके—बिना अनावश्यक भय या दिखावे के।",
      },
    ],

    focusEyebrow: "जिन विषयों पर आप मार्गदर्शन ले सकते हैं",
    focusTitle: "आपके जीवन का प्रश्न, बातचीत का केंद्र।",
    focusText:
      "करियर से लेकर रिश्तों तक, महत्वपूर्ण निर्णयों से लेकर जीवन के बदलते चरणों तक—हमारा प्रयास आपके प्रश्न को उसके संदर्भ में समझना है।",
    focus: [
      "करियर",
      "व्यवसाय",
      "धन",
      "विवाह",
      "रिश्ते",
      "शिक्षा",
      "संतान",
      "परिवार",
      "महत्वपूर्ण निर्णय",
    ],

    philosophyEyebrow: "🌿 हमारी सोच",
    philosophyTitle: "हर कुंडली में संभावनाएँ होती हैं।",
    philosophyTitle2: "हर परिस्थिति में कोई न कोई संकेत होता है।",
    philosophyText:
      "हर निर्णय के पीछे सही समय का महत्व होता है। हमारा प्रयास है कि परामर्श के बाद आपको केवल भविष्य की बातें न मिलें, बल्कि अपनी वर्तमान स्थिति को समझने और आगे की दिशा को अधिक स्पष्टता से देखने का एक नया दृष्टिकोण मिले।",

    foundersEyebrow: "अक्षांश ज्योतिष",
    foundersTitle: "Deepak Kaemariya & Shweta Tyagi",
    foundersServices: "ज्योतिष • अंक ज्योतिष • टैरो • वास्तु",
    foundersQuote: "“भाग्य नहीं, संभावनाओं का मार्गदर्शन।”",

    ctaEyebrow: "अगला कदम आपका है",
    ctaTitle: "आपके प्रश्न को एक स्पष्ट दृष्टिकोण की आवश्यकता है।",
    ctaText:
      "अपनी परिस्थिति साझा करें और एक व्यक्तिगत परामर्श के माध्यम से उसे समझने की दिशा में पहला कदम उठाएँ।",
    ctaButton: "अपना परामर्श शुरू करें",
  },

  en: {
    heroEyebrow: "✨ AKSHAANSHH JYOTISH ✨",
    heroTitle: "Understand Possibilities. Find Your Direction.",
    heroQuote:
      "“Our purpose is not to predict the future, but to understand possibilities.”",
    heroIntro:
      "Every person's story is different. Our approach is to help you understand your questions, circumstances and possibilities ahead with clarity and a practical perspective.",
    primary: "Book a Consultation",
    secondary: "Explore Our Services",

    storyEyebrow: "WHO WE ARE",
    storyTitle: "Every person's story is different.",
    storyLead:
      "For some, a birth chart may reveal opportunities; for others, circumstances may bring challenges. Sometimes, waiting for the right time is itself an important part of the answer.",
    storyText:
      "At Akshaanshh Jyotish, our purpose is not simply to tell you “what will happen?” but to explore “why is this happening, when might change be possible, and what direction may be better within the circumstances available to you?”",

    approachEyebrow: "OUR APPROACH",
    approachTitle: "Astrology should create understanding — not fear.",
    approachText:
      "We view astrology not as a tool for superstition or fear, but as a traditional form of guidance for self-reflection, understanding timing and approaching important decisions with greater awareness.",
    principle: "No fear. No unnecessary dependence. Meaningful guidance.",

    pillarsEyebrow: "OUR CORE PRACTICES",
    pillarsTitle: "Different traditional perspectives can illuminate one question.",
    pillarsIntro:
      "Depending on the situation, we explore the relevant signals and consider what they may mean in a practical, personal context.",

    pillars: [
      {
        icon: "🔱",
        number: "01",
        title: "Birth Chart",
        subtitle: "A story beyond the planets",
        text:
          "A birth chart is more than a diagram of planets and houses. We consider houses, house lords, planetary aspects, yogas, dasha and antardasha periods, transits and their relationships to explore different areas of life.",
        tags:
          "Career • Business • Wealth • Marriage • Relationships • Education • Family",
        footer:
          "The aim is not only to identify combinations, but to explain their practical meaning and possible relevance in life.",
      },
      {
        icon: "🔢",
        number: "02",
        title: "Numerology",
        subtitle: "When numbers have a language of their own",
        text:
          "Numbers are not treated as mere digits. Birth date, Mulank, Bhagyank and name-related indicators can be explored to understand tendencies in personality, thinking, decision-making and life patterns.",
        tags: "Personal Life • Career • Business • Important Decisions",
        footer:
          "Numerology is not limited to “lucky numbers”; we look at the patterns and relationships behind the numbers.",
      },
      {
        icon: "🃏",
        number: "03",
        title: "Tarot",
        subtitle: "Your question. The cards' perspective.",
        text:
          "Sometimes we have a question but the answer does not feel clear. Tarot can offer another perspective on present circumstances, emotions, choices and possible directions.",
        tags: "Career • Relationships • Business • Important Decisions",
        footer:
          "For us, Tarot is not a guarantee of the future, but a mirror through which the present can be reflected upon.",
      },
    ],

    additionalEyebrow: "ADDITIONAL GUIDANCE",
    additionalTitle:
      "When the circumstance is different, the approach can be different too.",

    additional: [
      {
        icon: "🔮",
        title: "Prashna Jyotish",
        subtitle: "When an accurate birth time is unavailable",
        text:
          "Not everyone has precise birth-date and birth-time information. In such situations, Prashna Jyotish studies astrological indications associated with the moment a question is asked.",
      },
      {
        icon: "🏠",
        title: "Vastu",
        subtitle: "Balance without necessarily changing your space",
        text:
          "Vastu does not always mean demolition, construction or major expense. Direction, entrance, room placement, usage and arrangement can be considered, with simple and practical improvements where appropriate.",
      },
      {
        icon: "🪔",
        title: "Remedial Guidance",
        subtitle: "Simplicity is the essence",
        text:
          "We prefer simple, traditional and practical remedies that can fit naturally into a person's routine and circumstances—without unnecessary fear or display.",
      },
    ],

    focusEyebrow: "AREAS YOU CAN SEEK GUIDANCE ON",
    focusTitle: "Your life's question becomes the centre of the conversation.",
    focusText:
      "From career and relationships to important decisions and changing phases of life, our effort is to understand your question in its context.",
    focus: [
      "Career",
      "Business",
      "Wealth",
      "Marriage",
      "Relationships",
      "Education",
      "Children",
      "Family",
      "Important Decisions",
    ],

    philosophyEyebrow: "🌿 OUR PHILOSOPHY",
    philosophyTitle: "Every chart holds possibilities.",
    philosophyTitle2: "Every circumstance carries a signal.",
    philosophyText:
      "Timing matters behind every important decision. Our aim is that after a consultation you receive more than predictions—you gain a fresh perspective for understanding your present situation and seeing the direction ahead with greater clarity.",

    foundersEyebrow: "AKSHAANSHH JYOTISH",
    foundersTitle: "Deepak Kaemariya & Shweta Tyagi",
    foundersServices: "Astrology • Numerology • Tarot • Vastu",
    foundersQuote: "“Guidance for possibilities, not promises of fate.”",

    ctaEyebrow: "YOUR NEXT STEP",
    ctaTitle: "Your question deserves a clearer perspective.",
    ctaText:
      "Share your situation and take the first step toward understanding it through a personal consultation.",
    ctaButton: "Start Your Consultation",
  },
} as const;

export default function AboutPage() {
  const { language } = useLanguage();
  const t = content[language];

  return (
    <main className={`about-page about-lang-${language}`}>
      <section className="about-premium-hero">
        <div className="about-stars" aria-hidden="true" />
        <div className="about-orbit about-orbit-a" aria-hidden="true" />
        <div className="about-orbit about-orbit-b" aria-hidden="true" />
        <div className="about-orbit about-orbit-c" aria-hidden="true" />

        <div className="site-container about-hero-layout">
          <div className="about-hero-copy">
            <p className="about-hero-eyebrow">{t.heroEyebrow}</p>

            <div className="about-hero-kicker">
              <span />
              {language === "hi"
                ? "ज्योतिष • अंक ज्योतिष • टैरो • वास्तु"
                : "ASTROLOGY • NUMEROLOGY • TAROT • VASTU"}
              <span />
            </div>

            <h1>{t.heroTitle}</h1>

            <p className="about-hero-quote">{t.heroQuote}</p>

            <p className="about-hero-intro">{t.heroIntro}</p>

            <div className="about-hero-actions">
              <Link href="/book" className="btn btn-primary">
                {t.primary} <span>→</span>
              </Link>

              <Link href="/services" className="about-ghost-button">
                {t.secondary} <span>↗</span>
              </Link>
            </div>
          </div>

          <div className="about-hero-emblem" aria-hidden="true">
            <div className="about-emblem-outer">
              <div className="about-emblem-inner">
                <span className="about-emblem-star">✦</span>
                <span className="about-emblem-symbol">ॐ</span>

                <span className="about-emblem-brand">
                  अक्षांश
                  <br />
                  ज्योतिष
                </span>

                <span className="about-emblem-caption">
                  POSSIBILITY • TIMING • DIRECTION
                </span>
              </div>
            </div>

            <div className="about-floating-chip about-chip-one">
              🔱 {language === "hi" ? "ज्योतिष" : "Jyotish"}
            </div>

            <div className="about-floating-chip about-chip-two">
              🔢 {language === "hi" ? "अंक" : "Numbers"}
            </div>

            <div className="about-floating-chip about-chip-three">
              🃏 {language === "hi" ? "टैरो" : "Tarot"}
            </div>
          </div>
        </div>

        <div className="about-scroll-cue" aria-hidden="true">
          <span>
            {language === "hi" ? "आगे जानने के लिए स्क्रॉल करें" : "SCROLL TO EXPLORE"}
          </span>
          <i />
        </div>
      </section>

      <section className="section about-story-premium">
        <div className="site-container about-story-layout">
          <div className="about-story-heading">
            <p className="eyebrow">{t.storyEyebrow}</p>
            <h2>{t.storyTitle}</h2>
            <div className="about-gold-rule" />
          </div>

          <div className="about-story-content">
            <p className="about-story-lead">{t.storyLead}</p>
            <p>{t.storyText}</p>

            <div className="about-story-note">
              <span>✦</span>
              <strong>
                {language === "hi"
                  ? "प्रश्न से दिशा तक"
                  : "From question to direction"}
              </strong>
              <span>✦</span>
            </div>
          </div>
        </div>
      </section>

      <section className="about-approach">
        <div className="about-approach-glow" aria-hidden="true" />

        <div className="site-container about-approach-layout">
          <div>
            <p className="about-light-eyebrow">{t.approachEyebrow}</p>
            <h2>{t.approachTitle}</h2>
            <p>{t.approachText}</p>
          </div>

          <div className="about-principle">
            <span className="about-principle-small">
              {language === "hi" ? "हमारा सिद्धांत" : "OUR PRINCIPLE"}
            </span>

            <div className="about-principle-orbit">
              <span>✦</span>
            </div>

            <strong>{t.principle}</strong>
          </div>
        </div>
      </section>

      <section className="section about-pillars-premium">
        <div className="site-container">
          <div className="about-section-heading-center">
            <p className="eyebrow">{t.pillarsEyebrow}</p>
            <h2>{t.pillarsTitle}</h2>
            <p>{t.pillarsIntro}</p>
          </div>

          <div className="about-pillar-grid-premium">
            {t.pillars.map((pillar) => (
              <article
                className="about-pillar-premium"
                key={pillar.number}
              >
                <div className="about-pillar-top">
                  <span className="about-pillar-number">
                    {pillar.number}
                  </span>
                  <span className="about-pillar-icon">
                    {pillar.icon}
                  </span>
                </div>

                <h3>{pillar.title}</h3>
                <h4>{pillar.subtitle}</h4>
                <p>{pillar.text}</p>

                <div className="about-pillar-tags-premium">
                  {pillar.tags}
                </div>

                <div className="about-pillar-footer">
                  {pillar.footer}
                </div>

                <div className="about-card-corner" aria-hidden="true">
                  ✦
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section about-focus-premium">
        <div className="site-container">
          <div className="about-focus-panel">
            <div className="about-focus-copy">
              <p className="eyebrow">{t.focusEyebrow}</p>
              <h2>{t.focusTitle}</h2>
              <p>{t.focusText}</p>
            </div>

            <div className="about-focus-grid">
              {t.focus.map((item, index) => (
                <div className="about-focus-pill" key={item}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{item}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section about-additional-premium">
        <div className="site-container">
          <div className="about-section-heading-center about-additional-heading">
            <p className="eyebrow">{t.additionalEyebrow}</p>
            <h2>{t.additionalTitle}</h2>
          </div>

          <div className="about-additional-grid">
            {t.additional.map((item, index) => (
              <article
                className="about-additional-card"
                key={item.title}
              >
                <div className="about-additional-number">
                  0{index + 4}
                </div>

                <div className="about-additional-icon">
                  {item.icon}
                </div>

                <h3>{item.title}</h3>
                <h4>{item.subtitle}</h4>
                <p>{item.text}</p>

                <span className="about-card-arrow">↗</span>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section about-philosophy-premium">
        <div className="site-container">
          <div className="about-philosophy-card">
            <div
              className="about-philosophy-decoration"
              aria-hidden="true"
            >
              <span>✦</span>
              <i />
              <span>✦</span>
            </div>

            <p className="about-light-eyebrow">
              {t.philosophyEyebrow}
            </p>

            <h2>{t.philosophyTitle}</h2>
            <h3>{t.philosophyTitle2}</h3>

            <div className="about-philosophy-rule" />

            <p>{t.philosophyText}</p>
          </div>
        </div>
      </section>

      <section className="about-founders">
        <div
          className="about-founder-bg-orbit"
          aria-hidden="true"
        />

        <div className="site-container about-founders-layout">
          <div className="about-founder-image">
            <Image
              src="/images/consultants/main.jpg"
              alt="Akshaanshh Jyotish consultation"
              fill
              sizes="(max-width: 900px) 100vw, 46vw"
              loading="lazy"
            />

            <div className="about-founder-image-overlay" />

            <div className="about-founder-image-label">
              <span>AKSHAANSH</span>
              <strong>JYOTISH</strong>
            </div>
          </div>

          <div className="about-founder-copy">
            <p className="about-light-eyebrow">
              {t.foundersEyebrow}
            </p>

            <h2>{t.foundersTitle}</h2>

            <p className="about-founder-services">
              {t.foundersServices}
            </p>

            <div className="about-founder-rule" />

            <blockquote>{t.foundersQuote}</blockquote>

            <p className="about-founder-caption">
              {language === "hi"
                ? "एक ऐसा परामर्श जहाँ प्रश्न आपका है, संदर्भ आपका है और बातचीत भी आपके जीवन के इर्द-गिर्द है।"
                : "A consultation where the question is yours, the context is yours, and the conversation stays centred around your life."}
            </p>
          </div>
        </div>
      </section>

      <section className="about-final-cta">
        <div className="about-cta-stars" aria-hidden="true" />

        <div className="site-container about-cta-inner">
          <p className="about-light-eyebrow">{t.ctaEyebrow}</p>
          <h2>{t.ctaTitle}</h2>
          <p>{t.ctaText}</p>

          <Link
            href="/book"
            className="btn btn-primary about-cta-button"
          >
            {t.ctaButton} <span>→</span>
          </Link>
        </div>
      </section>
    </main>
  );
}