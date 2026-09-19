// =========================================================
// AKSHAANSHH JYOTISH
// Traditional astrology knowledge used as MODEL CONTEXT.
// This file intentionally contains semantic facts/themes,
// not finished customer-facing paragraphs.
// =========================================================

export const HOUSE_THEMES: Record<number, string[]> = {
  1: ["self", "identity", "body", "temperament", "personal direction"],
  2: ["wealth", "savings", "family resources", "speech", "values"],
  3: ["communication", "skills", "initiative", "effort", "siblings"],
  4: ["home", "emotional foundation", "education", "comfort", "inner stability"],
  5: ["creativity", "learning", "children", "romance", "self-expression"],
  6: ["work routine", "service", "competition", "discipline", "daily wellbeing"],
  7: ["marriage", "partnership", "one-to-one relationships", "agreements", "public dealing"],
  8: ["shared resources", "deep change", "uncertainty", "joint matters", "transformation"],
  9: ["higher learning", "beliefs", "mentors", "long journeys", "meaning"],
  10: ["career", "profession", "public role", "responsibility", "achievement"],
  11: ["gains", "networks", "friends", "long-term goals", "opportunities"],
  12: ["rest", "retreat", "foreign links", "release", "private life"],
};

export const AREA_FRAMEWORK = {
  marriage: {
    primaryHouse: 7,
    secondaryHouses: [2, 5, 8, 11],
    keyPlanets: ["Venus", "Jupiter", "Moon"],
  },
  career: {
    primaryHouse: 10,
    secondaryHouses: [6, 2, 11],
    keyPlanets: ["Sun", "Saturn", "Mercury", "Jupiter"],
  },
  finance: {
    primaryHouse: 2,
    secondaryHouses: [5, 9, 11, 8],
    keyPlanets: ["Jupiter", "Venus", "Mercury"],
  },
  health: {
    primaryHouse: 6,
    secondaryHouses: [1, 8, 12],
    keyPlanets: ["Sun", "Moon", "Mars", "Saturn"],
  },
  children: {
    primaryHouse: 5,
    secondaryHouses: [2, 9, 11],
    keyPlanets: ["Jupiter", "Moon", "Venus"],
  },
  education: {
    primaryHouse: 4,
    secondaryHouses: [5, 2, 9],
    keyPlanets: ["Mercury", "Jupiter", "Moon"],
  },
} as const;

export const PLANET_THEMES: Record<string, string[]> = {
  Sun: ["identity", "confidence", "leadership", "visibility", "authority"],
  Moon: ["mind", "emotional needs", "habits", "adaptability", "security"],
  Mars: ["drive", "initiative", "courage", "competition", "decisive action"],
  Mercury: ["thinking", "communication", "analysis", "trade", "learning"],
  Jupiter: ["wisdom", "growth", "guidance", "knowledge", "expansion"],
  Venus: ["relationships", "harmony", "attraction", "comfort", "values"],
  Saturn: ["discipline", "responsibility", "delay", "endurance", "structure"],
  Rahu: ["amplification", "ambition", "novelty", "unconventional paths", "restlessness"],
  Ketu: ["detachment", "introspection", "simplification", "unusual insight", "reassessment"],
};

export const EXALTATION_SIGN: Record<string, number> = {
  Sun: 0,
  Moon: 1,
  Mars: 9,
  Mercury: 5,
  Jupiter: 3,
  Venus: 11,
  Saturn: 6,
};

export const DEBILITATION_SIGN: Record<string, number> = {
  Sun: 6,
  Moon: 7,
  Mars: 3,
  Mercury: 11,
  Jupiter: 9,
  Venus: 5,
  Saturn: 0,
};

export const PLANET_ASPECT_HOUSES: Record<string, number[]> = {
  Sun: [7],
  Moon: [7],
  Mars: [4, 7, 8],
  Mercury: [7],
  Jupiter: [5, 7, 9],
  Venus: [7],
  Saturn: [3, 7, 10],
  Rahu: [7],
  Ketu: [7],
};
