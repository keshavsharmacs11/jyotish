// =========================================================
// AKSHAANSHH JYOTISH
// Astrology Constants
// =========================================================

export const RASHIS = [
  {
    index: 0,
    en: "Aries",
    hi: "मेष",
    lordEn: "Mars",
    lordHi: "मंगल",
  },
  {
    index: 1,
    en: "Taurus",
    hi: "वृषभ",
    lordEn: "Venus",
    lordHi: "शुक्र",
  },
  {
    index: 2,
    en: "Gemini",
    hi: "मिथुन",
    lordEn: "Mercury",
    lordHi: "बुध",
  },
  {
    index: 3,
    en: "Cancer",
    hi: "कर्क",
    lordEn: "Moon",
    lordHi: "चन्द्र",
  },
  {
    index: 4,
    en: "Leo",
    hi: "सिंह",
    lordEn: "Sun",
    lordHi: "सूर्य",
  },
  {
    index: 5,
    en: "Virgo",
    hi: "कन्या",
    lordEn: "Mercury",
    lordHi: "बुध",
  },
  {
    index: 6,
    en: "Libra",
    hi: "तुला",
    lordEn: "Venus",
    lordHi: "शुक्र",
  },
  {
    index: 7,
    en: "Scorpio",
    hi: "वृश्चिक",
    lordEn: "Mars",
    lordHi: "मंगल",
  },
  {
    index: 8,
    en: "Sagittarius",
    hi: "धनु",
    lordEn: "Jupiter",
    lordHi: "गुरु",
  },
  {
    index: 9,
    en: "Capricorn",
    hi: "मकर",
    lordEn: "Saturn",
    lordHi: "शनि",
  },
  {
    index: 10,
    en: "Aquarius",
    hi: "कुंभ",
    lordEn: "Saturn",
    lordHi: "शनि",
  },
  {
    index: 11,
    en: "Pisces",
    hi: "मीन",
    lordEn: "Jupiter",
    lordHi: "गुरु",
  },
] as const;

// =========================================================
// 27 NAKSHATRAS
// =========================================================

export const NAKSHATRA_LORDS: Record<
  number,
  {
    en: string;
    hi: string;
  }
> = {
  0: {
    en: "Ketu",
    hi: "केतु",
  },
  1: {
    en: "Venus",
    hi: "शुक्र",
  },
  2: {
    en: "Sun",
    hi: "सूर्य",
  },
  3: {
    en: "Moon",
    hi: "चन्द्र",
  },
  4: {
    en: "Mars",
    hi: "मंगल",
  },
  5: {
    en: "Rahu",
    hi: "राहु",
  },
  6: {
    en: "Jupiter",
    hi: "गुरु",
  },
  7: {
    en: "Saturn",
    hi: "शनि",
  },
  8: {
    en: "Mercury",
    hi: "बुध",
  },

  9: {
    en: "Ketu",
    hi: "केतु",
  },
  10: {
    en: "Venus",
    hi: "शुक्र",
  },
  11: {
    en: "Sun",
    hi: "सूर्य",
  },
  12: {
    en: "Moon",
    hi: "चन्द्र",
  },
  13: {
    en: "Mars",
    hi: "मंगल",
  },
  14: {
    en: "Rahu",
    hi: "राहु",
  },
  15: {
    en: "Jupiter",
    hi: "गुरु",
  },
  16: {
    en: "Saturn",
    hi: "शनि",
  },
  17: {
    en: "Mercury",
    hi: "बुध",
  },

  18: {
    en: "Ketu",
    hi: "केतु",
  },
  19: {
    en: "Venus",
    hi: "शुक्र",
  },
  20: {
    en: "Sun",
    hi: "सूर्य",
  },
  21: {
    en: "Moon",
    hi: "चन्द्र",
  },
  22: {
    en: "Mars",
    hi: "मंगल",
  },
  23: {
    en: "Rahu",
    hi: "राहु",
  },
  24: {
    en: "Jupiter",
    hi: "गुरु",
  },
  25: {
    en: "Saturn",
    hi: "शनि",
  },
  26: {
    en: "Mercury",
    hi: "बुध",
  },
};

// =========================================================
// LUCKY COLORS
// =========================================================

export const RASHI_COLORS = [
  ["Red", "लाल"],
  ["Cream", "क्रीम"],
  ["Green", "हरा"],
  ["White", "सफेद"],
  ["Gold", "सुनहरा"],
  ["Green", "हरा"],
  ["White", "सफेद"],
  ["Maroon", "मैरून"],
  ["Yellow", "पीला"],
  ["Blue", "नीला"],
  ["Sky Blue", "आसमानी"],
  ["Yellow", "पीला"],
] as const;

// =========================================================
// LUCKY NUMBERS
// =========================================================

export const RASHI_NUMBERS = [
  9,  // Aries
  6,  // Taurus
  5,  // Gemini
  2,  // Cancer
  1,  // Leo
  5,  // Virgo
  6,  // Libra
  9,  // Scorpio
  3,  // Sagittarius
  8,  // Capricorn
  8,  // Aquarius
  3,  // Pisces
] as const;

// =========================================================
// RASHI MANTRAS
// =========================================================

export const RASHI_MANTRAS = [
  [
    "Om Mangalaya Namah",
    "ॐ मंगलाय नमः",
  ],
  [
    "Om Shukraya Namah",
    "ॐ शुक्राय नमः",
  ],
  [
    "Om Budhaya Namah",
    "ॐ बुधाय नमः",
  ],
  [
    "Om Somaya Namah",
    "ॐ सोमाय नमः",
  ],
  [
    "Om Suryaya Namah",
    "ॐ सूर्याय नमः",
  ],
  [
    "Om Budhaya Namah",
    "ॐ बुधाय नमः",
  ],
  [
    "Om Shukraya Namah",
    "ॐ शुक्राय नमः",
  ],
  [
    "Om Angarakaya Namah",
    "ॐ अंगारकाय नमः",
  ],
  [
    "Om Gurave Namah",
    "ॐ गुरवे नमः",
  ],
  [
    "Om Sham Shanicharaya Namah",
    "ॐ शं शनैश्चराय नमः",
  ],
  [
    "Om Sham Shanicharaya Namah",
    "ॐ शं शनैश्चराय नमः",
  ],
  [
    "Om Gurave Namah",
    "ॐ गुरवे नमः",
  ],
] as const;

// =========================================================
// QUESTION AREAS
// =========================================================

export const QUESTION_AREAS = {
  marriage: {
    en: "Marriage & Relationships",
    hi: "विवाह एवं सम्बन्ध",
  },

  career: {
    en: "Career & Job",
    hi: "करियर एवं नौकरी",
  },

  finance: {
    en: "Wealth & Business",
    hi: "धन एवं व्यापार",
  },

  health: {
    en: "Health",
    hi: "स्वास्थ्य",
  },

  children: {
    en: "Children",
    hi: "सन्तान",
  },

  education: {
    en: "Education",
    hi: "शिक्षा",
  },
} as const;

export type QuestionArea =
  keyof typeof QUESTION_AREAS;