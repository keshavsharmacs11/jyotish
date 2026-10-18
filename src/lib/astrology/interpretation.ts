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

function birthWarning(
  birthTimeKnown: boolean,
): BilingualText {
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
 * The daily paragraph changes according to the current Moon
 * position relative to the selected Rashi.
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

// =========================================================
// SATURN GUIDANCE RELATIVE TO THE SELECTED RASHI
// =========================================================

function dailySaturnGuidance(
  relativeSaturnHouse: number,
  retrograde: boolean,
): BilingualText {
  const themes: Record<number, BilingualText> = {
    1: {
      en:
        "The current Saturn position emphasizes patience with personal plans and responsibilities. Make progress steadily rather than judging yourself by immediate results.",
      hi:
        "शनि की वर्तमान स्थिति व्यक्तिगत योजनाओं और जिम्मेदारियों में धैर्य रखने पर जोर देती है। तुरंत परिणाम की अपेक्षा करने के बजाय लगातार प्रयास करें।",
    },

    2: {
      en:
        "A measured approach to spending, savings and important family conversations is the more useful theme now. Avoid commitments that depend on money you have not secured.",
      hi:
        "इस समय खर्च, बचत और परिवार की महत्वपूर्ण बातचीत में सोच-समझकर कदम उठाना उपयोगी रहेगा। ऐसी आर्थिक जिम्मेदारी न लें जिसके लिए धन अभी सुनिश्चित न हो।",
    },

    3: {
      en:
        "Consistent effort, communication and skill-building are emphasized. A small task completed properly may be more valuable than starting several things at once.",
      hi:
        "लगातार प्रयास, स्पष्ट बातचीत और कौशल बढ़ाने पर जोर रहेगा। एक साथ कई काम शुरू करने के बजाय किसी छोटे काम को अच्छी तरह पूरा करना अधिक उपयोगी हो सकता है।",
    },

    4: {
      en:
        "Home responsibilities and inner stability deserve a practical review. Set aside time for unfinished domestic or learning-related tasks instead of letting them linger.",
      hi:
        "घर की जिम्मेदारियों और मानसिक स्थिरता पर व्यावहारिक ध्यान देना उपयोगी रहेगा। घरेलू या पढ़ाई से जुड़े अधूरे काम टालते रहने के बजाय उनके लिए समय निकालें।",
    },

    5: {
      en:
        "Learning, creative work and matters of the heart benefit from maturity and consistency. Let promising ideas develop before making a large commitment.",
      hi:
        "सीखने, रचनात्मक काम और भावनात्मक मामलों में परिपक्वता व निरंतरता मददगार रहेगी। किसी अच्छे विचार पर बड़ी जिम्मेदारी लेने से पहले उसे विकसित होने का समय दें।",
    },

    6: {
      en:
        "Daily routines, service and problem-solving call for discipline. Deal with practical issues one by one and do not let a temporary setback define the whole day.",
      hi:
        "दिनचर्या, जिम्मेदारी और समस्याओं को सुलझाने में अनुशासन उपयोगी रहेगा। व्यावहारिक समस्याओं को एक-एक करके संभालें और किसी अस्थायी रुकावट को पूरे दिन पर हावी न होने दें।",
    },

    7: {
      en:
        "Partnerships and agreements call for clear expectations and dependable follow-through. A calm, specific conversation is more useful than assuming the other person understands your position.",
      hi:
        "साझेदारी और समझौतों में स्पष्ट अपेक्षाएँ तथा निभाए गए वादे महत्वपूर्ण रहेंगे। सामने वाला आपकी बात समझ गया होगा, ऐसा मानने के बजाय शांत और स्पष्ट बातचीत करें।",
    },

    8: {
      en:
        "Shared duties and complicated matters may need a slower, more thorough review. Check details before agreeing to financial or long-term obligations.",
      hi:
        "साझा जिम्मेदारियों और जटिल मामलों की धीरे-धीरे और ध्यान से समीक्षा करना उपयोगी रहेगा। आर्थिक या लंबे समय की जिम्मेदारी स्वीकार करने से पहले विवरण जाँचें।",
    },

    9: {
      en:
        "Study, guidance and long-term beliefs benefit from careful examination. Verify advice and keep plans realistic, especially when they involve a major change or journey.",
      hi:
        "पढ़ाई, मार्गदर्शन और लंबे समय की मान्यताओं पर सोच-समझकर विचार करना उपयोगी रहेगा। विशेषकर बड़े बदलाव या यात्रा से जुड़ी योजना में सलाह की पुष्टि करें और यथार्थवादी रहें।",
    },

    10: {
      en:
        "Professional responsibilities and reputation are the central themes. Focus on reliable work, clear priorities and the steps that build lasting credibility rather than chasing instant recognition.",
      hi:
        "काम की जिम्मेदारियाँ और प्रतिष्ठा प्रमुख विषय रहेंगे। तुरंत पहचान पाने के बजाय भरोसेमंद काम, स्पष्ट प्राथमिकताओं और दीर्घकालीन विश्वसनीयता बनाने वाले कदमों पर ध्यान दें।",
    },

    11: {
      en:
        "Long-term goals, networks and shared ambitions need realistic planning. Review which commitments genuinely support your goals before spreading your time too thin.",
      hi:
        "लंबे समय के लक्ष्य, संपर्क और साझा महत्वाकांक्षाओं के लिए व्यावहारिक योजना जरूरी रहेगी। समय बहुत अधिक बाँटने से पहले देखें कि कौन-सी जिम्मेदारियाँ वास्तव में आपके लक्ष्यों को सहारा देती हैं।",
    },

    12: {
      en:
        "Rest, private matters and expenses benefit from sensible limits. Protect time for recovery and review recurring costs instead of ignoring small drains on your energy or budget.",
      hi:
        "आराम, निजी मामलों और खर्चों में उचित सीमाएँ रखना उपयोगी रहेगा। स्वयं को तरोताज़ा होने का समय दें और ऊर्जा या बजट पर पड़ने वाले छोटे-छोटे बोझ की समीक्षा करें।",
    },
  };

  const base = themes[relativeSaturnHouse] ?? themes[1];

  if (!retrograde) {
    return base;
  }

  return {
    en:
      `${base.en} With Saturn retrograde, traditional practice also favors reviewing an existing plan or responsibility before pushing ahead.`,
    hi:
      `${base.hi} शनि की वक्री स्थिति में पारंपरिक दृष्टि से आगे बढ़ने से पहले किसी मौजूदा योजना या जिम्मेदारी की समीक्षा करना भी उपयोगी माना जाता है।`,
  };
}

// =========================================================
// DAILY WARNING
// =========================================================

function buildDailyWarning(
  relativeMoonHouse: number,
): BilingualText | null {
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
        "आज धैर्य और थोड़ी धीमी गति से चलना बेहतर रहेगा। अनावश्यक खर्च, जल्दबाज़ी के फैसलों और ऐसी परिस्थितियों से बचें जो आपकी ऊर्जा कम कर सकती हैं।",
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
   * Calculate the current Moon position relative to the selected Rashi.
   */
  const relativeMoonHouse =
    ((sky.moonRashiIndex - rashiIndex + 12) % 12) + 1;

  const moonGuidance =
    dailyMoonGuidance(relativeMoonHouse);

  /**
   * Calculate Saturn's position relative to the selected Rashi.
   * Combining both relative positions gives each Rashi a more
   * differentiated daily reading.
   */
  const relativeSaturnHouse =
    ((sky.saturnRashiIndex - rashiIndex + 12) % 12) + 1;

  const saturnGuidance =
    dailySaturnGuidance(
      relativeSaturnHouse,
      sky.saturnRetrograde,
    );

  const dailyText: BilingualText = {
    en: `${moonGuidance.en} ${saturnGuidance.en}`,
    hi: `${moonGuidance.hi} ${saturnGuidance.hi}`,
  };

  const warning =
    buildDailyWarning(relativeMoonHouse);

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