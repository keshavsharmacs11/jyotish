// =========================================================
// AKSHAANSHH JYOTISH
// Astrology Calculation Engine
// =========================================================

import { kundali } from "@grahan/vedic";

import {
  NAKSHATRA_LORDS,
  RASHIS,
} from "./constants";

// =========================================================
// TYPES
// =========================================================

export type AstrologyLocation = {
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

export type BirthPlanetPlacement = {
  graha: string;
  rashiIndex: number;
  rashiEn: string;
  rashiHi: string;
  bhava: number;
  retrograde: boolean;
};

export type BirthCalculation = {
  // Natal Lagna
  lagnaRashiIndex: number;
  lagnaRashiEn: string;
  lagnaRashiHi: string;

  // Natal Moon
  moonRashiIndex: number;
  moonRashiEn: string;
  moonRashiHi: string;

  rashiLordEn: string;
  rashiLordHi: string;

  nakshatraIndex: number;
  nakshatraEn: string;
  nakshatraHi: string;
  nakshatraPada: number;
  nakshatraLordEn: string;
  nakshatraLordHi: string;

  // Numerology
  mulank: number;
  bhagyank: number;

  // Current Saturn
  saturnRashiIndex: number;
  saturnRashiEn: string;
  saturnRashiHi: string;

  saturnRetrograde: boolean;

  saturnStatus:
    | "sade-sati"
    | "dhaiya"
    | "normal";

  // Full natal planet placements
  grahaPlacements: BirthPlanetPlacement[];

  birthTimeKnown: boolean;
  birthInstant: string;

  location: AstrologyLocation;
};

// =========================================================
// HELPERS
// =========================================================

function normalizeIndex(
  value: number,
): number {
  return ((value % 12) + 12) % 12;
}

function reduceToSingleDigit(
  value: number,
): number {
  let result = Math.abs(
    Math.trunc(value),
  );

  while (result > 9) {
    result = String(result)
      .split("")
      .reduce(
        (sum, digit) =>
          sum + Number(digit),
        0,
      );
  }

  return result;
}

// =========================================================
// NUMEROLOGY
// =========================================================

export function calculateMulank(
  date: string,
): number {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      date,
    );

  if (!match) {
    throw new Error(
      "Invalid birth date",
    );
  }

  const day = Number(match[3]);

  return reduceToSingleDigit(
    day,
  );
}

export function calculateBhagyank(
  date: string,
): number {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      date,
    );

  if (!match) {
    throw new Error(
      "Invalid birth date",
    );
  }

  const digits = date
    .replace(/\D/g, "")
    .split("")
    .map(Number);

  const total =
    digits.reduce(
      (sum, digit) =>
        sum + digit,
      0,
    );

  return reduceToSingleDigit(
    total,
  );
}

// =========================================================
// TIMEZONE CONVERSION
// =========================================================

export function zonedWallClockToUtc(
  date: string,
  time: string,
  timezone: string,
): Date {
  const dateMatch =
    /^(\d{4})-(\d{2})-(\d{2})$/.exec(
      date,
    );

  const timeMatch =
    /^(\d{1,2}):(\d{2})$/.exec(
      time,
    );

  if (
    !dateMatch ||
    !timeMatch
  ) {
    throw new Error(
      "Invalid date or time",
    );
  }

  const year =
    Number(dateMatch[1]);

  const month =
    Number(dateMatch[2]);

  const day =
    Number(dateMatch[3]);

  const hour =
    Number(timeMatch[1]);

  const minute =
    Number(timeMatch[2]);

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error(
      "Invalid time",
    );
  }

  let utcMillis =
    Date.UTC(
      year,
      month - 1,
      day,
      hour,
      minute,
      0,
      0,
    );

  for (
    let iteration = 0;
    iteration < 3;
    iteration++
  ) {
    const formatter =
      new Intl.DateTimeFormat(
        "en-US",
        {
          timeZone:
            timezone,

          year: "numeric",
          month: "2-digit",
          day: "2-digit",

          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",

          hourCycle: "h23",
        },
      );

    const parts =
      formatter.formatToParts(
        new Date(
          utcMillis,
        ),
      );

    const values:
      Record<string, number> =
      {};

    for (const part of parts) {
      if (
        part.type !==
          "literal" &&
        part.type in {
          year: true,
          month: true,
          day: true,
          hour: true,
          minute: true,
          second: true,
        }
      ) {
        values[part.type] =
          Number(
            part.value,
          );
      }
    }

    const representedUtcMillis =
      Date.UTC(
        values.year,
        values.month - 1,
        values.day,
        values.hour,
        values.minute,
        values.second,
        0,
      );

    const desiredWallClockMillis =
      Date.UTC(
        year,
        month - 1,
        day,
        hour,
        minute,
        0,
        0,
      );

    const offset =
      representedUtcMillis -
      utcMillis;

    utcMillis =
      desiredWallClockMillis -
      offset;
  }

  return new Date(
    utcMillis,
  );
}

// =========================================================
// GRAHA HELPERS
// =========================================================

type GrahaLike = {
  graha?: string;
  longitude?: number;
  degree?: number;
  rashi?: number;
  sign?: number;
  bhava?: number;
  retrograde?: boolean;
  isRetrograde?: boolean;
};

function getGraha(
  chart: unknown,
  grahaName: string,
): GrahaLike | undefined {
  if (
    !chart ||
    typeof chart !== "object"
  ) {
    return undefined;
  }

  const possibleChart =
    chart as {
      grahas?: GrahaLike[];
    };

  if (
    !Array.isArray(
      possibleChart.grahas,
    )
  ) {
    return undefined;
  }

  return possibleChart.grahas.find(
    (item) =>
      String(
        item.graha ?? "",
      ).toLowerCase() ===
      grahaName.toLowerCase(),
  );
}

function getRashiIndex(
  graha:
    | GrahaLike
    | undefined,
): number {
  if (!graha) {
    throw new Error(
      "Required planetary position unavailable",
    );
  }

  if (
    typeof graha.rashi ===
      "number" &&
    Number.isFinite(
      graha.rashi,
    )
  ) {
    return normalizeIndex(
      Math.trunc(
        graha.rashi,
      ),
    );
  }

  if (
    typeof graha.sign ===
      "number" &&
    Number.isFinite(
      graha.sign,
    )
  ) {
    return normalizeIndex(
      Math.trunc(
        graha.sign,
      ),
    );
  }

  if (
    typeof graha.longitude ===
      "number" &&
    Number.isFinite(
      graha.longitude,
    )
  ) {
    return normalizeIndex(
      Math.floor(
        graha.longitude / 30,
      ),
    );
  }

  if (
    typeof graha.degree ===
      "number" &&
    Number.isFinite(
      graha.degree,
    )
  ) {
    return normalizeIndex(
      Math.floor(
        graha.degree / 30,
      ),
    );
  }

  throw new Error(
    "Planetary sign information unavailable",
  );
}

function getLongitude(
  graha:
    | GrahaLike
    | undefined,
): number {
  if (!graha) {
    throw new Error(
      "Planetary position unavailable",
    );
  }

  if (
    typeof graha.longitude ===
      "number" &&
    Number.isFinite(
      graha.longitude,
    )
  ) {
    return graha.longitude;
  }

  if (
    typeof graha.degree ===
      "number" &&
    Number.isFinite(
      graha.degree,
    )
  ) {
    return graha.degree;
  }

  throw new Error(
    "Planetary longitude unavailable",
  );
}

function getRetrograde(
  graha:
    | GrahaLike
    | undefined,
): boolean {
  if (!graha) {
    return false;
  }

  if (
    typeof graha.retrograde ===
      "boolean"
  ) {
    return graha.retrograde;
  }

  if (
    typeof graha.isRetrograde ===
      "boolean"
  ) {
    return graha.isRetrograde;
  }

  return false;
}

// =========================================================
// NAKSHATRA
// =========================================================

function getNakshatraFromLongitude(
  longitude: number,
) {
  const normalizedLongitude =
    ((longitude % 360) +
      360) %
    360;

  const nakshatraSize =
    360 / 27;

  const nakshatraIndex =
    Math.min(
      26,
      Math.floor(
        normalizedLongitude /
          nakshatraSize,
      ),
    );

  const positionInsideNakshatra =
    normalizedLongitude -
    nakshatraIndex *
      nakshatraSize;

  const pada =
    Math.min(
      4,
      Math.floor(
        positionInsideNakshatra /
          (nakshatraSize / 4),
      ) + 1,
    );

  const nakshatraNames = [
    ["Ashwini", "अश्विनी"],
    ["Bharani", "भरणी"],
    ["Krittika", "कृत्तिका"],
    ["Rohini", "रोहिणी"],
    ["Mrigashira", "मृगशिरा"],
    ["Ardra", "आर्द्रा"],
    [
      "Punarvasu",
      "पुनर्वसु",
    ],
    ["Pushya", "पुष्य"],
    [
      "Ashlesha",
      "आश्लेषा",
    ],
    ["Magha", "मघा"],
    [
      "Purva Phalguni",
      "पूर्वा फाल्गुनी",
    ],
    [
      "Uttara Phalguni",
      "उत्तर फाल्गुनी",
    ],
    ["Hasta", "हस्त"],
    ["Chitra", "चित्रा"],
    ["Swati", "स्वाती"],
    [
      "Vishakha",
      "विशाखा",
    ],
    [
      "Anuradha",
      "अनुराधा",
    ],
    [
      "Jyeshtha",
      "ज्येष्ठा",
    ],
    ["Mula", "मूल"],
    [
      "Purva Ashadha",
      "पूर्वाषाढ़ा",
    ],
    [
      "Uttara Ashadha",
      "उत्तराषाढ़ा",
    ],
    [
      "Shravana",
      "श्रवण",
    ],
    [
      "Dhanishtha",
      "धनिष्ठा",
    ],
    [
      "Shatabhisha",
      "शतभिषा",
    ],
    [
      "Purva Bhadrapada",
      "पूर्व भाद्रपदा",
    ],
    [
      "Uttara Bhadrapada",
      "उत्तर भाद्रपदा",
    ],
    ["Revati", "रेवती"],
  ] as const;

  const nakshatra =
    nakshatraNames[
      nakshatraIndex
    ];

  const lord =
    NAKSHATRA_LORDS[
      nakshatraIndex
    ];

  if (
    !nakshatra ||
    !lord
  ) {
    throw new Error(
      "Nakshatra information unavailable",
    );
  }

  return {
    index:
      nakshatraIndex,

    en:
      nakshatra[0],

    hi:
      nakshatra[1],

    pada,

    lordEn:
      lord.en,

    lordHi:
      lord.hi,
  };
}

// =========================================================
// SATURN RELATION TO NATAL MOON
// =========================================================

function saturnRelation(
  moonRashi: number,
  saturnRashi: number,
):
  | "sade-sati"
  | "dhaiya"
  | "normal" {
  const distance =
    normalizeIndex(
      saturnRashi -
        moonRashi,
    );

  if (
    distance === 11 ||
    distance === 0 ||
    distance === 1
  ) {
    return "sade-sati";
  }

  if (
    distance === 3 ||
    distance === 7
  ) {
    return "dhaiya";
  }

  return "normal";
}

// =========================================================
// BIRTH CHART CALCULATION
// =========================================================

export async function calculateBirthChart(
  date: string,
  time:
    | string
    | undefined,
  location: AstrologyLocation,
): Promise<BirthCalculation> {
  const birthTimeKnown =
    Boolean(
      time &&
        time.trim(),
    );

  /*
   * When birth time is unavailable, 12:00 is used only
   * as an approximate chart anchor. The result explicitly
   * records birthTimeKnown=false so the UI can explain this.
   */

  const effectiveTime =
    birthTimeKnown
      ? time!.trim()
      : "12:00";

  const birthInstant =
    zonedWallClockToUtc(
      date,
      effectiveTime,
      location.timezone,
    );

  // -------------------------------------------------------
  // NATAL KUNDALI
  // -------------------------------------------------------

  const birthChart =
    kundali({
      date:
        birthInstant,

      latitude:
        location.latitude,

      longitude:
        location.longitude,

      node: "mean",
    });

  // -------------------------------------------------------
  // LAGNA
  // -------------------------------------------------------

  /*
   * grahan/vedic gives Lagna as a zero-based Rashi index.
   * The first Bhava also carries the same Rashi, so we use
   * the Bhava value as a defensive fallback.
   */

  const rawLagnaRashi =
    birthChart.lagna?.rashi;

  const fallbackLagnaRashi =
    birthChart.bhavas?.[0]
      ?.rashi;

  const lagnaRashiSource =
    typeof rawLagnaRashi ===
      "number" &&
    Number.isFinite(
      rawLagnaRashi,
    )
      ? rawLagnaRashi
      : fallbackLagnaRashi;

  if (
    typeof lagnaRashiSource !==
      "number" ||
    !Number.isFinite(
      lagnaRashiSource,
    )
  ) {
    throw new Error(
      "Lagna Rashi could not be calculated",
    );
  }

  const lagnaRashiIndex =
    normalizeIndex(
      Math.trunc(
        lagnaRashiSource,
      ),
    );

  const lagnaRashi =
    RASHIS[
      lagnaRashiIndex
    ];

  if (!lagnaRashi) {
    throw new Error(
      "Lagna Rashi could not be resolved",
    );
  }

  // -------------------------------------------------------
  // NATAL MOON
  // -------------------------------------------------------

  const moon =
    getGraha(
      birthChart,
      "moon",
    );

  if (!moon) {
    throw new Error(
      "Moon position could not be calculated",
    );
  }

  const moonRashiIndex =
    getRashiIndex(
      moon,
    );

  const moonRashi =
    RASHIS[
      moonRashiIndex
    ];

  if (!moonRashi) {
    throw new Error(
      "Moon Rashi could not be resolved",
    );
  }

  const moonLongitude =
    getLongitude(
      moon,
    );

  const nakshatra =
    getNakshatraFromLongitude(
      moonLongitude,
    );

  // -------------------------------------------------------
  // FULL PLANETARY HOUSE MAP
  // -------------------------------------------------------

  const grahaPlacements:
    BirthPlanetPlacement[] =
    birthChart.grahas.map(
      (graha) => {
        const rashiIndex =
          normalizeIndex(
            Math.trunc(
              graha.rashi,
            ),
          );

        const rashiInfo =
          RASHIS[
            rashiIndex
          ];

        if (!rashiInfo) {
          throw new Error(
            "Planetary Rashi could not be resolved",
          );
        }

        /*
         * grahan/vedic already calculates whole-sign
         * Bhava from the natal Lagna. Preserve that exact
         * value rather than calculating a second house system.
         */

        const bhava =
          Number.isFinite(
            graha.bhava,
          )
            ? Math.trunc(
                graha.bhava,
              )
            : (
                (
                  rashiIndex -
                  lagnaRashiIndex +
                  12
                ) % 12
              ) + 1;

        if (
          bhava < 1 ||
          bhava > 12
        ) {
          throw new Error(
            "Planetary house placement could not be resolved",
          );
        }

        return {
          graha:
            String(
              graha.graha,
            ),

          rashiIndex,

          rashiEn:
            rashiInfo.en,

          rashiHi:
            rashiInfo.hi,

          bhava,

          retrograde:
            Boolean(
              graha.retrograde,
            ),
        };
      },
    );

  // -------------------------------------------------------
  // CURRENT SKY
  // -------------------------------------------------------

  const currentChart =
    kundali({
      date:
        new Date(),

      latitude:
        location.latitude,

      longitude:
        location.longitude,

      node: "mean",
    });

  const currentSaturn =
    getGraha(
      currentChart,
      "saturn",
    );

  if (!currentSaturn) {
    throw new Error(
      "Current Saturn position could not be calculated",
    );
  }

  const saturnRashiIndex =
    getRashiIndex(
      currentSaturn,
    );

  const saturnRashi =
    RASHIS[
      saturnRashiIndex
    ];

  if (!saturnRashi) {
    throw new Error(
      "Current Saturn Rashi could not be resolved",
    );
  }

  const saturnStatus =
    saturnRelation(
      moonRashiIndex,
      saturnRashiIndex,
    );

  // -------------------------------------------------------
  // RETURN
  // -------------------------------------------------------

  return {
    lagnaRashiIndex,

    lagnaRashiEn:
      lagnaRashi.en,

    lagnaRashiHi:
      lagnaRashi.hi,

    moonRashiIndex,

    moonRashiEn:
      moonRashi.en,

    moonRashiHi:
      moonRashi.hi,

    rashiLordEn:
      moonRashi.lordEn,

    rashiLordHi:
      moonRashi.lordHi,

    nakshatraIndex:
      nakshatra.index,

    nakshatraEn:
      nakshatra.en,

    nakshatraHi:
      nakshatra.hi,

    nakshatraPada:
      nakshatra.pada,

    nakshatraLordEn:
      nakshatra.lordEn,

    nakshatraLordHi:
      nakshatra.lordHi,

    mulank:
      calculateMulank(
        date,
      ),

    bhagyank:
      calculateBhagyank(
        date,
      ),

    saturnRashiIndex,

    saturnRashiEn:
      saturnRashi.en,

    saturnRashiHi:
      saturnRashi.hi,

    saturnRetrograde:
      getRetrograde(
        currentSaturn,
      ),

    saturnStatus,

    grahaPlacements,

    birthTimeKnown,

    birthInstant:
      birthInstant.toISOString(),

    location,
  };
}

// =========================================================
// CURRENT SKY
// =========================================================

export type CurrentSkyCalculation = {
  moonRashiIndex: number;

  moonRashiEn: string;

  moonRashiHi: string;

  saturnRashiIndex: number;

  saturnRashiEn: string;

  saturnRashiHi: string;

  saturnRetrograde: boolean;
};

export async function calculateCurrentSky(
  location: AstrologyLocation,
): Promise<CurrentSkyCalculation> {
  const chart =
    kundali({
      date:
        new Date(),

      latitude:
        location.latitude,

      longitude:
        location.longitude,

      node: "mean",
    });

  const moon =
    getGraha(
      chart,
      "moon",
    );

  const saturn =
    getGraha(
      chart,
      "saturn",
    );

  if (
    !moon ||
    !saturn
  ) {
    throw new Error(
      "Current planetary positions could not be calculated",
    );
  }

  const moonRashiIndex =
    getRashiIndex(
      moon,
    );

  const saturnRashiIndex =
    getRashiIndex(
      saturn,
    );

  const moonRashi =
    RASHIS[
      moonRashiIndex
    ];

  const saturnRashi =
    RASHIS[
      saturnRashiIndex
    ];

  if (
    !moonRashi ||
    !saturnRashi
  ) {
    throw new Error(
      "Current Rashi information unavailable",
    );
  }

  return {
    moonRashiIndex,

    moonRashiEn:
      moonRashi.en,

    moonRashiHi:
      moonRashi.hi,

    saturnRashiIndex,

    saturnRashiEn:
      saturnRashi.en,

    saturnRashiHi:
      saturnRashi.hi,

    saturnRetrograde:
      getRetrograde(
        saturn,
      ),
  };
}