// =========================================================
// AKSHAANSHH JYOTISH
// Astrology Interpretation
// =========================================================

import {
  RASHI_COLORS,
  RASHI_MANTRAS,
  RASHI_NUMBERS,
  RASHIS,
  type QuestionArea,
} from "./constants";

import type {
  BirthCalculation,
  CurrentSkyCalculation,
} from "./calculations";

import {
  generatePersonalizedReading,
  readingToIndication,
  type PersonalizedReading,
} from "./aiInterpretation";

// =========================================================
// TYPES
// =========================================================

export type BilingualText = {
  en: string;
  hi: string;
};

export type BirthIndication = {
  rashi: BilingualText;
  rashiLord: BilingualText;
  nakshatra: BilingualText;
  nakshatraLord: BilingualText;
  nakshatraPada: number;
  mulank: number;
  bhagyank: number;
  saturnRashi: BilingualText;
  saturnStatus:
    | "sade-sati"
    | "dhaiya"
    | "normal";
  saturnRetrograde: boolean;
  saturnText: BilingualText;
  area: QuestionArea;
  indication: BilingualText;
  personalizedReading: PersonalizedReading;
  numerology: BilingualText;
  luckyColor: BilingualText;
  luckyNumber: number;
  mantra: BilingualText;
  warning: BilingualText;
};

export type DailyRashifal = {
  rashi: BilingualText;
  warning: BilingualText | null;
  moonTransit: BilingualText;
  saturnTransit: BilingualText;
  dailyText: BilingualText;
  luckyColor: BilingualText;
  luckyNumber: number;
  mantra: BilingualText;
  disclaimer: BilingualText;
};

// =========================================================
// SMALL FACTUAL / STATUS TEXT
// These are not personality paragraphs.
// The actual personalized interpretation comes from the AI layer.
// =========================================================

function saturnText(
  status:
    | "sade-sati"
    | "dhaiya"
    | "normal",
): BilingualText {
  if (status === "sade-sati") {
    return {
      en:
        "This can be a more demanding phase, where patience, responsibility and steady progress may matter more than usual.",
      hi:
        "यह समय थोड़ा अधिक जिम्मेदारियों वाला महसूस हो सकता है, जहाँ धैर्य, जिम्मेदारी और लगातार आगे बढ़ना सामान्य से अधिक महत्वपूर्ण रह सकता है।",
    };
  }

  if (status === "dhaiya") {
    return {
      en:
        "This phase may call for careful planning and a little more patience with responsibilities and important decisions.",
      hi:
        "यह समय जिम्मेदारियों और महत्वपूर्ण फैसलों में थोड़ी अधिक सावधानी और धैर्य रखने की ओर संकेत कर सकता है।",
    };
  }

  return {
    en:
      "There is no strong indication here of an unusually demanding phase right now. Steady progress and clear priorities remain useful.",
    hi:
      "फिलहाल किसी असामान्य रूप से कठिन चरण का मजबूत संकेत नहीं दिखता। फिर भी लगातार प्रयास और स्पष्ट प्राथमिकताएँ उपयोगी रहेंगी।",
  };
}

function numerologyText(
  mulank: number,
  bhagyank: number,
): BilingualText {
  return {
    en:
      `Your birth date highlights two traditional number patterns: ${mulank} and ${bhagyank}. They are used as a reflective guide, not as a scientific measurement.`,
    hi:
      `आपकी जन्म तिथि से दो पारंपरिक अंक संकेत मिलते हैं: ${mulank} और ${bhagyank}। इन्हें पारंपरिक मार्गदर्शन की तरह देखें, वैज्ञानिक माप की तरह नहीं।`,
  };
}

function birthWarning(birthTimeKnown: boolean): BilingualText {
  return birthTimeKnown
    ? {
        en:
          "This reading uses your birth details and the current context to give a focused traditional interpretation. Use it as guidance and reflection rather than as a certain prediction.",
        hi:
          "यह reading आपकी जन्म जानकारी और वर्तमान संदर्भ के आधार पर पारंपरिक संकेत देती है। इसे निश्चित भविष्यवाणी के बजाय मार्गदर्शन और चिंतन की तरह देखें।",
      }
    : {
        en:
          "Because your exact birth time was not provided, some parts of the reading are approximate. A correct birth time can make the personal reading more specific.",
        hi:
          "क्योंकि आपका सही जन्म समय उपलब्ध नहीं है, इसलिए reading के कुछ हिस्से अनुमानित हैं। सही जन्म समय होने पर व्यक्तिगत संकेत अधिक विशिष्ट हो सकते हैं।",
      };
}

// =========================================================
// BIRTH INDICATION
// =========================================================

export async function buildBirthIndication(
  calculation: BirthCalculation,
  area: QuestionArea,
  currentSky?: CurrentSkyCalculation,
  exactQuestion?: string,
  customerName?: string,
): Promise<BirthIndication> {
  const rashi = RASHIS[calculation.moonRashiIndex];

  if (!rashi) {
    throw new Error("Rashi information unavailable");
  }

  const color = RASHI_COLORS[calculation.moonRashiIndex];
  const mantra = RASHI_MANTRAS[calculation.moonRashiIndex];
  const luckyNumber = RASHI_NUMBERS[calculation.moonRashiIndex];

  if (!color || !mantra) {
    throw new Error("Rashi guidance information unavailable");
  }

  const personalizedReading =
    await generatePersonalizedReading(
      calculation,
      area,
      currentSky,
      exactQuestion,
      customerName,
    );

  return {
    rashi: {
      en: calculation.moonRashiEn,
      hi: calculation.moonRashiHi,
    },
    rashiLord: {
      en: calculation.rashiLordEn,
      hi: calculation.rashiLordHi,
    },
    nakshatra: {
      en: calculation.nakshatraEn,
      hi: calculation.nakshatraHi,
    },
    nakshatraLord: {
      en: calculation.nakshatraLordEn,
      hi: calculation.nakshatraLordHi,
    },
    nakshatraPada: calculation.nakshatraPada,
    mulank: calculation.mulank,
    bhagyank: calculation.bhagyank,
    saturnRashi: {
      en: calculation.saturnRashiEn,
      hi: calculation.saturnRashiHi,
    },
    saturnStatus: calculation.saturnStatus,
    saturnRetrograde: calculation.saturnRetrograde,
    saturnText: saturnText(calculation.saturnStatus),
    area,
    indication: readingToIndication(personalizedReading),
    personalizedReading,
    numerology: numerologyText(
      calculation.mulank,
      calculation.bhagyank,
    ),
    luckyColor: {
      en: color[0],
      hi: color[1],
    },
    luckyNumber,
    mantra: {
      en: mantra[0],
      hi: mantra[1],
    },
    warning: birthWarning(
      calculation.birthTimeKnown,
    ),
  };
}


// =========================================================
// LIVE DAILY GUIDANCE
// =========================================================

/**
 * The daily paragraph is intentionally NOT fixed to a Rashi.
 * It changes according to the live Moon position relative
 * to the selected Rashi and the current Saturn condition.
 */
function dailyMoonGuidance(
  relativeMoonHouse: number,
): BilingualText {
  switch (relativeMoonHouse) {
    case 1:
      return {
        en:
          "Today can feel more personal and active. Trust your natural instincts, but give yourself a moment to think before reacting to important situations.",
        hi:
          "आज का दिन व्यक्तिगत मामलों और अपनी प्राथमिकताओं पर ध्यान देने वाला हो सकता है। अपनी सहज समझ पर भरोसा रखें, लेकिन महत्वपूर्ण बातों पर प्रतिक्रिया देने से पहले थोड़ा सोचें।",
      };

    case 2:
      return {
        en:
          "Today is useful for handling money, family matters and practical responsibilities. Keep conversations calm and think carefully before making a commitment.",
        hi:
          "आज धन, परिवार और जरूरी जिम्मेदारियों पर ध्यान देना उपयोगी रहेगा। बातचीत में शांति रखें और कोई नई जिम्मेदारी लेने से पहले अच्छी तरह सोचें।",
      };

    case 3:
      return {
        en:
          "Communication and short tasks can move more smoothly today. Use your energy for useful conversations, learning and completing pending work.",
        hi:
          "आज बातचीत और छोटे-छोटे जरूरी काम आसानी से आगे बढ़ सकते हैं। उपयोगी बातचीत, सीखने और रुके हुए काम पूरे करने में अपनी ऊर्जा लगाएँ।",
      };

    case 4:
      return {
        en:
          "Home and personal comfort may need more attention today. Keep your surroundings peaceful and avoid carrying unnecessary tension into important conversations.",
        hi:
          "आज घर और मन की शांति पर थोड़ा अधिक ध्यान देना उपयोगी रहेगा। आसपास का माहौल शांत रखें और अनावश्यक तनाव को जरूरी बातचीत में न आने दें।",
      };

    case 5:
      return {
        en:
          "Today can support creativity, learning and spending quality time with people you care about. Enjoy the positive side of the day without making impulsive choices.",
        hi:
          "आज रचनात्मकता, सीखने और अपने प्रिय लोगों के साथ अच्छा समय बिताने के लिए दिन उपयोगी हो सकता है। दिन का आनंद लें, लेकिन जल्दबाज़ी में कोई फैसला न लें।",
      };

    case 6:
      return {
        en:
          "A little extra care with routine, work and health can make the day easier. Finish important tasks one by one instead of letting small problems pile up.",
        hi:
          "आज दिनचर्या, काम और स्वास्थ्य पर थोड़ा अतिरिक्त ध्यान देना उपयोगी रहेगा। छोटी-छोटी परेशानियों को जमा होने देने के बजाय जरूरी काम एक-एक करके पूरा करें।",
      };

    case 7:
      return {
        en:
          "Relationships and important conversations need balance today. Listen carefully, avoid unnecessary arguments and give others enough space to express themselves.",
        hi:
          "आज रिश्तों और महत्वपूर्ण बातचीत में संतुलन बनाए रखना जरूरी रहेगा। ध्यान से सुनें, अनावश्यक बहस से बचें और सामने वाले को अपनी बात रखने का पर्याप्त अवसर दें।",
      };

    case 8:
      return {
        en:
          "Today may feel a little heavier or more emotional than usual. Avoid unnecessary risks and give important decisions more time. Take care of rest, food and routine.",
        hi:
          "आज का दिन सामान्य से थोड़ा अधिक भावनात्मक या भारी महसूस हो सकता है। अनावश्यक जोखिम से बचें और महत्वपूर्ण फैसलों के लिए थोड़ा अधिक समय लें। आराम, भोजन और दिनचर्या का ध्यान रखें।",
      };

    case 9:
      return {
        en:
          "Today can bring a stronger urge to explore, learn or look ahead. Keep your plans realistic and avoid promising more than you can comfortably complete.",
        hi:
          "आज कुछ नया सीखने, आगे की योजना बनाने या बदलाव के बारे में सोचने की इच्छा बढ़ सकती है। योजनाओं को व्यावहारिक रखें और अपनी क्षमता से अधिक वादे न करें।",
      };

    case 10:
      return {
        en:
          "Work, responsibility and long-term goals can take priority today. Stay disciplined, complete what matters most and do not expect every result immediately.",
        hi:
          "आज काम, जिम्मेदारियों और लंबे समय के लक्ष्यों पर ध्यान देना उपयोगी रहेगा। अनुशासन बनाए रखें, जरूरी काम पूरा करें और हर परिणाम तुरंत मिलने की अपेक्षा न रखें।",
      };

    case 11:
      return {
        en:
          "Friends, plans and future goals may need your attention today. Keep your expectations realistic and choose the people and commitments that genuinely matter to you.",
        hi:
          "आज मित्रों, योजनाओं और भविष्य के लक्ष्यों पर ध्यान जा सकता है। अपनी अपेक्षाएँ व्यावहारिक रखें और उन्हीं लोगों व जिम्मेदारियों को प्राथमिकता दें जो वास्तव में महत्वपूर्ण हैं।",
      };

    case 12:
      return {
        en:
          "Today is better suited to slowing down, resting and finishing unfinished matters. Avoid unnecessary travel, rushed decisions and spending energy on things you cannot control.",
        hi:
          "आज थोड़ा धीमा चलना, आराम करना और अधूरे काम पूरे करना बेहतर रहेगा। अनावश्यक यात्रा, जल्दबाज़ी के फैसलों और ऐसी चीजों पर ऊर्जा खर्च करने से बचें जिन्हें आप नियंत्रित नहीं कर सकते।",
      };

    default:
      return {
        en:
          "Keep the day simple, stay calm and give important matters enough time before making a decision.",
        hi:
          "आज दिन को सरल रखें, शांत रहें और महत्वपूर्ण निर्णय लेने से पहले पर्याप्त समय दें।",
      };
  }
}


function addSaturnGuidance(
  text: BilingualText,
  saturnRashiEn: string,
  saturnRashiHi: string,
  retrograde: boolean,
): BilingualText {
  const guidance = retrograde
    ? {
        en: `Saturn is currently in ${saturnRashiEn} and is retrograde. Traditionally, this is a good time to slow down, review old matters and avoid unnecessary haste.`,
        hi: `शनि अभी ${saturnRashiHi} राशि में वक्री चल रहे हैं। पारंपरिक ज्योतिषीय दृष्टि से इस समय पुराने मामलों की समीक्षा करना, धैर्य रखना और अनावश्यक जल्दबाज़ी से बचना उपयोगी माना जाता है।`,
      }
    : {
        en: `Saturn is currently in ${saturnRashiEn}. Traditionally, this supports a patient and disciplined approach to responsibilities.`,
        hi: `शनि अभी ${saturnRashiHi} राशि में हैं। पारंपरिक ज्योतिषीय दृष्टि से जिम्मेदारियों को धैर्य और अनुशासन के साथ संभालना उपयोगी माना जाता है।`,
      };

  return {
    en: `${text.en} ${guidance.en}`,
    hi: `${text.hi} ${guidance.hi}`,
  };
}


function buildDailyWarning(relativeMoonHouse: number): BilingualText | null {
  if (
    relativeMoonHouse !== 6 &&
    relativeMoonHouse !== 8 &&
    relativeMoonHouse !== 12
  ) {
    return null;
  }

  const houseText: Record<6 | 8 | 12, BilingualText> = {
    6: {
      en:
        "Today may need a little extra patience with work, routine and health. Avoid letting small problems become bigger through overthinking or rushing.",
      hi:
        "आज काम, दिनचर्या और स्वास्थ्य के मामलों में थोड़ा अतिरिक्त धैर्य रखना उपयोगी रहेगा। छोटी परेशानियों को अधिक सोचने या जल्दबाज़ी से बड़ा न बनने दें।",
    },
    8: {
      en:
        "Today may feel more sensitive than usual. Avoid unnecessary risks and give important decisions extra time. Take care of your routine and rest.",
      hi:
        "आज का दिन सामान्य से थोड़ा अधिक संवेदनशील महसूस हो सकता है। अनावश्यक जोखिम से बचें और महत्वपूर्ण फैसलों के लिए थोड़ा अतिरिक्त समय लें। अपनी दिनचर्या और आराम का ध्यान रखें।",
    },
    12: {
      en:
        "Today is better handled with patience and a slower pace. Avoid unnecessary expenses, rushed decisions and situations that drain your energy.",
      hi:
        "आज धैर्य और थोड़ी धीमी गति से चलना बेहतर रहेगा। अनावश्यक खर्च, जल्दबाज़ी के फैसले और ऐसी परिस्थितियों से बचें जो आपकी ऊर्जा कम कर सकती हैं।",
    },
  };

  return houseText[relativeMoonHouse];
}


// =========================================================
// DAILY RASHIFAL
// =========================================================

export function buildDailyRashifal(
  rashiIndex: number,
  sky: CurrentSkyCalculation,
): DailyRashifal {
  const rashi = RASHIS[rashiIndex];

  if (!rashi) {
    throw new Error("Invalid Rashi index");
  }

  const color = RASHI_COLORS[rashiIndex];
  const mantra = RASHI_MANTRAS[rashiIndex];
  const luckyNumber = RASHI_NUMBERS[rashiIndex];

  if (!color || !mantra) {
    throw new Error("Daily Rashi guidance unavailable");
  }

  /**
   * Live Moon position relative to the selected Rashi.
   *
   * This is one of the main inputs that makes the daily
   * guidance change as the Moon moves through the zodiac.
   */
  const relativeMoonHouse =
    ((sky.moonRashiIndex - rashiIndex + 12) % 12) + 1;

  const moonGuidance = dailyMoonGuidance(relativeMoonHouse);

  const dailyText = addSaturnGuidance(
    moonGuidance,
    sky.saturnRashiEn,
    sky.saturnRashiHi,
    sky.saturnRetrograde,
  );

  const warning = buildDailyWarning(relativeMoonHouse);

  return {
    rashi: {
      en: rashi.en,
      hi: rashi.hi,
    },

    warning,

    moonTransit: {
      en: `The Moon is currently in ${sky.moonRashiEn}.`,
      hi: `चन्द्रमा अभी ${sky.moonRashiHi} राशि में हैं।`,
    },

    saturnTransit: {
      en:
        `Saturn is currently in ${sky.saturnRashiEn}${sky.saturnRetrograde ? " and is retrograde." : "."}`,
      hi:
        `शनि अभी ${sky.saturnRashiHi} राशि में हैं${sky.saturnRetrograde ? " और वक्री चल रहे हैं।" : "।"}`,
    },

    dailyText,

    luckyColor: {
      en: color[0],
      hi: color[1],
    },

    luckyNumber,

    mantra: {
      en: mantra[0],
      hi: mantra[1],
    },

    disclaimer: {
      en:
        "This daily Rashifal is a traditional astrological indication based on current planetary positions. It is intended for general reflection and should not be treated as a certain prediction or a substitute for professional advice.",
      hi:
        "यह दैनिक राशिफल वर्तमान ग्रह स्थिति पर आधारित पारंपरिक ज्योतिषीय संकेत है। इसे सामान्य मार्गदर्शन और चिंतन के लिए देखें; इसे निश्चित भविष्यवाणी या किसी पेशेवर सलाह के विकल्प के रूप में न मानें।",
    },
  };
}
