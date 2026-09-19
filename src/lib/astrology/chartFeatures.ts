// =========================================================
// AKSHAANSHH JYOTISH
// Chart Intelligence Layer
// Turns calculated chart positions into structured facts.
// It does NOT write customer-facing prose.
// =========================================================

import type {
  BirthCalculation,
  BirthPlanetPlacement,
  CurrentSkyCalculation,
} from "./calculations";

import {
  AREA_FRAMEWORK,
  DEBILITATION_SIGN,
  EXALTATION_SIGN,
  HOUSE_THEMES,
  PLANET_ASPECT_HOUSES,
  PLANET_THEMES,
} from "./astrologyKnowledge";

import {
  RASHIS,
  type QuestionArea,
} from "./constants";

export type PlanetFact = {
  planet: string;
  sign: { index: number; en: string; hi: string };
  house: number;
  retrograde: boolean;
  themes: string[];
  dignity: "exalted" | "debilitated" | "own-sign" | "neutral";
};

export type AspectFact = {
  planet: string;
  fromHouse: number;
  toHouse: number;
};

export type AreaChartContext = {
  area: QuestionArea;
  primaryHouse: number;
  primaryHouseThemes: string[];
  secondaryHouses: number[];
  primarySign: { index: number; en: string; hi: string; lordEn: string; lordHi: string };
  houseLord: { en: string; hi: string };
  houseLordPlacement: PlanetFact | null;
  primaryHousePlanets: PlanetFact[];
  supportingHousePlanets: PlanetFact[];
  relevantAspects: AspectFact[];
  natalMoon: {
    sign: { index: number; en: string; hi: string };
    nakshatra: string;
    nakshatraLord: string;
    pada: number;
    house: number | null;
  };
  current: {
    moonSign: { index: number; en: string; hi: string };
    relativeMoonHouse: number;
    saturnSign: { index: number; en: string; hi: string };
    saturnRetrograde: boolean;
    saturnStatus: BirthCalculation["saturnStatus"];
  };
  birthTimeKnown: boolean;
  lagna: { index: number; en: string; hi: string };
  areaKeyPlanets: string[];
  focusPlanets: PlanetFact[];
};

function normalizePlanetName(value: string): string {
  const raw = value.trim().toLowerCase();
  const aliases: Record<string, string> = {
    sun: "Sun",
    moon: "Moon",
    mars: "Mars",
    mercury: "Mercury",
    jupiter: "Jupiter",
    venus: "Venus",
    saturn: "Saturn",
    rahu: "Rahu",
    ketu: "Ketu",
  };
  return aliases[raw] ?? value.trim();
}

function houseFromLagna(lagnaRashi: number, signIndex: number): number {
  return ((signIndex - lagnaRashi + 12) % 12) + 1;
}

function getDignity(planet: string, signIndex: number): PlanetFact["dignity"] {
  const normalized = normalizePlanetName(planet);
  const exalted = EXALTATION_SIGN[normalized];
  const debilitated = DEBILITATION_SIGN[normalized];

  if (exalted === signIndex) return "exalted";
  if (debilitated === signIndex) return "debilitated";

  const ownSign = RASHIS.find(
    (rashi) => rashi.index === signIndex && rashi.lordEn === normalized,
  );

  return ownSign ? "own-sign" : "neutral";
}

function toPlanetFact(
  placement: BirthPlanetPlacement,
): PlanetFact {
  const planet = normalizePlanetName(placement.graha);
  const sign = RASHIS[placement.rashiIndex];

  if (!sign) {
    throw new Error("Planet sign could not be resolved");
  }

  return {
    planet,
    sign: {
      index: sign.index,
      en: sign.en,
      hi: sign.hi,
    },
    house: placement.bhava,
    retrograde: placement.retrograde,
    themes: PLANET_THEMES[planet] ?? [],
    dignity: getDignity(planet, sign.index),
  };
}

function buildAspects(placements: PlanetFact[]): AspectFact[] {
  const facts: AspectFact[] = [];

  for (const placement of placements) {
    const offsets = PLANET_ASPECT_HOUSES[placement.planet] ?? [7];

    for (const offset of offsets) {
      const targetHouse = ((placement.house + offset - 2) % 12) + 1;
      facts.push({
        planet: placement.planet,
        fromHouse: placement.house,
        toHouse: targetHouse,
      });
    }
  }

  return facts;
}

export function buildAreaChartContext(
  calculation: BirthCalculation,
  area: QuestionArea,
  currentSky?: CurrentSkyCalculation,
): AreaChartContext {
  if (!calculation.grahaPlacements?.length) {
    throw new Error("Full natal planetary placements are required for personalized interpretation");
  }

  const framework = AREA_FRAMEWORK[area];
  const areaKeyPlanets = framework.keyPlanets.map(normalizePlanetName);

  const secondaryHouses: number[] = [
    ...framework.secondaryHouses,
  ];
  const primarySignIndex =
    ((calculation.lagnaRashiIndex + framework.primaryHouse - 1) % 12 + 12) % 12;

  const primarySign = RASHIS[primarySignIndex];

  if (!primarySign) {
    throw new Error("Primary house sign could not be resolved");
  }

  const planetFacts = calculation.grahaPlacements.map(toPlanetFact);
  const primaryHousePlanets = planetFacts.filter(
    (planet) => planet.house === framework.primaryHouse,
  );
  const supportingHousePlanets = planetFacts.filter(
    (planet) => secondaryHouses.includes(planet.house),
  );

  const lordName = normalizePlanetName(primarySign.lordEn);
  const houseLordPlacement =
    planetFacts.find((planet) => planet.planet === lordName) ?? null;

  const aspects = buildAspects(planetFacts).filter(
    (aspect) =>
      aspect.toHouse === framework.primaryHouse ||
      secondaryHouses.includes(aspect.toHouse),
  );

  // Priority evidence for the selected area. These are not the only facts
  // available to the interpreter; they are the facts that should be inspected
  // first so topic selection does not accidentally become generic prose.
  const focusPlanetMap = new Map<string, PlanetFact>();

  for (const planet of planetFacts) {
    if (areaKeyPlanets.includes(planet.planet)) {
      focusPlanetMap.set(planet.planet, planet);
    }
  }

  for (const planet of primaryHousePlanets) {
    focusPlanetMap.set(planet.planet, planet);
  }

  for (const planet of supportingHousePlanets) {
    focusPlanetMap.set(planet.planet, planet);
  }

  for (const aspect of aspects) {
    const planet = planetFacts.find(
      (item) => item.planet === aspect.planet,
    );

    if (planet) {
      focusPlanetMap.set(planet.planet, planet);
    }
  }

  const focusPlanets = [
    ...focusPlanetMap.values(),
  ];

  const natalMoonPlacement =
    planetFacts.find((planet) => planet.planet === "Moon") ?? null;

  const natalMoonHouse = natalMoonPlacement?.house ??
    houseFromLagna(
      calculation.lagnaRashiIndex,
      calculation.moonRashiIndex,
    );

  const sky = currentSky ?? {
    moonRashiIndex: calculation.moonRashiIndex,
    moonRashiEn: calculation.moonRashiEn,
    moonRashiHi: calculation.moonRashiHi,
    saturnRashiIndex: calculation.saturnRashiIndex,
    saturnRashiEn: calculation.saturnRashiEn,
    saturnRashiHi: calculation.saturnRashiHi,
    saturnRetrograde: calculation.saturnRetrograde,
  };

  const relativeMoonHouse =
    ((sky.moonRashiIndex - calculation.moonRashiIndex + 12) % 12) + 1;

  const currentMoonRashi = RASHIS[sky.moonRashiIndex];
  const currentSaturnRashi = RASHIS[sky.saturnRashiIndex];

  if (!currentMoonRashi || !currentSaturnRashi) {
    throw new Error("Current transit signs could not be resolved");
  }

  const lagna = RASHIS[calculation.lagnaRashiIndex];

  if (!lagna) {
    throw new Error("Lagna could not be resolved");
  }

  return {
    area,
    primaryHouse: framework.primaryHouse,
    primaryHouseThemes: HOUSE_THEMES[framework.primaryHouse] ?? [],
    secondaryHouses,
    primarySign: {
      index: primarySign.index,
      en: primarySign.en,
      hi: primarySign.hi,
      lordEn: primarySign.lordEn,
      lordHi: primarySign.lordHi,
    },
    houseLord: {
      en: primarySign.lordEn,
      hi: primarySign.lordHi,
    },
    houseLordPlacement,
    primaryHousePlanets,
    supportingHousePlanets,
    relevantAspects: aspects,
    natalMoon: {
      sign: {
        index: calculation.moonRashiIndex,
        en: calculation.moonRashiEn,
        hi: calculation.moonRashiHi,
      },
      nakshatra: calculation.nakshatraEn,
      nakshatraLord: calculation.nakshatraLordEn,
      pada: calculation.nakshatraPada,
      house: natalMoonHouse,
    },
    current: {
      moonSign: {
        index: sky.moonRashiIndex,
        en: currentMoonRashi.en,
        hi: currentMoonRashi.hi,
      },
      relativeMoonHouse,
      saturnSign: {
        index: sky.saturnRashiIndex,
        en: currentSaturnRashi.en,
        hi: currentSaturnRashi.hi,
      },
      saturnRetrograde: sky.saturnRetrograde,
      saturnStatus: calculation.saturnStatus,
    },
    birthTimeKnown: calculation.birthTimeKnown,
    lagna: {
      index: lagna.index,
      en: lagna.en,
      hi: lagna.hi,
    },
    areaKeyPlanets,
    focusPlanets,
  };
}
