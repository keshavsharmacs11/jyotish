import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  calculateBirthChart,
  calculateCurrentSky,
  type AstrologyLocation,
} from "@/lib/astrology/calculations";

import {
  buildBirthIndication,
} from "@/lib/astrology/interpretation";

import {
  QUESTION_AREAS,
  type QuestionArea,
} from "@/lib/astrology/constants";

import {
  checkRateLimit,
} from "@/lib/rateLimit";

import {
  getClientIp,
} from "@/lib/requestSecurity";

const MAX_NAME_LENGTH = 120;
const MAX_CITY_LENGTH = 120;

type GeocodingResult = {
  name?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
  country?: string;
  country_code?: string;
  admin1?: string;
  feature_code?: string;
  population?: number;
};

const REGION_ALIASES: Record<string, string[]> = {
  Delhi: [
    "Delhi",
    "National Capital Territory of Delhi",
    "NCT of Delhi",
  ],
  "Jammu and Kashmir": [
    "Jammu and Kashmir",
    "Jammu & Kashmir",
    "Jammu and Kashmīr",
  ],
  Ladakh: [
    "Ladakh",
  ],
  Chandigarh: [
    "Chandigarh",
  ],
  Puducherry: [
    "Puducherry",
    "Pondicherry",
  ],
  "Andaman and Nicobar Islands": [
    "Andaman and Nicobar Islands",
  ],
  Lakshadweep: [
    "Lakshadweep",
  ],
  "Dadra and Nagar Haveli and Daman and Diu": [
    "Dadra and Nagar Haveli and Daman and Diu",
    "Dadra and Nagar Haveli",
    "Daman and Diu",
  ],
};

function normalizePlaceText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function regionMatches(
  requestedRegion: string,
  actualRegion: string,
): boolean {
  const requested = normalizePlaceText(requestedRegion);
  const actual = normalizePlaceText(actualRegion);

  if (!requested || !actual) {
    return false;
  }

  if (requested === actual) {
    return true;
  }

  const aliases = REGION_ALIASES[requestedRegion] ?? [requestedRegion];
  return aliases.some(
    (alias) => normalizePlaceText(alias) === actual,
  );
}

function cityMatches(
  requestedCity: string,
  actualCity: string,
): boolean {
  return normalizePlaceText(requestedCity) === normalizePlaceText(actualCity);
}

function scoreGeocodingResult(
  result: GeocodingResult,
  requestedCity: string,
  requestedRegion: string,
): number {
  let score = 0;

  const actualCity = String(result.name ?? "");
  const actualRegion = String(result.admin1 ?? "");
  const actualCountry = normalizePlaceText(String(result.country ?? ""));
  const countryCode = String(result.country_code ?? "").toUpperCase();

  if (countryCode === "IN") {
    score += 1000;
  } else if (actualCountry === "india") {
    score += 900;
  }

  if (cityMatches(requestedCity, actualCity)) {
    score += 500;
  }

  if (requestedRegion && regionMatches(requestedRegion, actualRegion)) {
    score += 400;
  }

  // Prefer actual populated places over tiny administrative matches.
  if (result.feature_code === "PPLC") {
    score += 120;
  } else if (result.feature_code?.startsWith("PPL")) {
    score += 60;
  }

  if (typeof result.population === "number") {
    score += Math.min(50, Math.log10(Math.max(result.population, 1)) * 5);
  }

  return score;
}

async function searchGeocoding(
  query: string,
): Promise<GeocodingResult[]> {
  const url = new URL(
    "https://geocoding-api.open-meteo.com/v1/search",
  );

  url.searchParams.set("name", query);
  url.searchParams.set("count", "10");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");
  url.searchParams.set("countryCode", "IN");

  const response = await fetch(url, {
    method: "GET",
    cache: "force-cache",
    next: { revalidate: 86400 },
  });

  if (!response.ok) {
    throw new Error("Unable to resolve birth place.");
  }

  const data = await response.json();
  return Array.isArray(data?.results)
    ? (data.results as GeocodingResult[])
    : [];
}

async function resolveCity(
  birthPlace: string,
): Promise<AstrologyLocation> {
  const raw = birthPlace
    .trim()
    .slice(0, MAX_CITY_LENGTH);

  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const requestedCity = parts[0] ?? raw;
  const requestedRegion = parts.slice(1).join(", ");

  if (!requestedCity) {
    throw new Error(
      "Birth city is required.",
    );
  }

  const queries = [
    requestedRegion
      ? `${requestedCity}, ${requestedRegion}`
      : requestedCity,
    requestedCity,
  ].filter(
    (query, index, all) => query && all.indexOf(query) === index,
  );

  let results: GeocodingResult[] = [];

  for (const query of queries) {
    const found = await searchGeocoding(query);
    results = [...results, ...found];

    // A city + region query is preferred, but a plain city query is an
    // important fallback for Indian UTs such as Delhi where the API may
    // expose a fuller administrative name such as NCT of Delhi.
    if (found.length > 0 && requestedRegion) {
      const strongMatch = found.some(
        (item) =>
          cityMatches(requestedCity, String(item.name ?? "")) &&
          regionMatches(requestedRegion, String(item.admin1 ?? "")),
      );

      if (strongMatch) {
        break;
      }
    } else if (found.length > 0) {
      break;
    }
  }

  const unique = new Map<string, GeocodingResult>();

  for (const item of results) {
    const key = [
      item.name,
      item.latitude,
      item.longitude,
      item.timezone,
    ]
      .map((value) => String(value ?? ""))
      .join("|");

    if (!unique.has(key)) {
      unique.set(key, item);
    }
  }

  const location = [...unique.values()]
    .sort(
      (a, b) =>
        scoreGeocodingResult(b, requestedCity, requestedRegion) -
        scoreGeocodingResult(a, requestedCity, requestedRegion),
    )
    .find(
      (item) =>
        Number.isFinite(item.latitude) &&
        Number.isFinite(item.longitude) &&
        Boolean(item.timezone) &&
        String(item.country_code ?? "").toUpperCase() === "IN",
    );

  if (
    !location ||
    !Number.isFinite(location.latitude) ||
    !Number.isFinite(location.longitude) ||
    !location.timezone
  ) {
    throw new Error(
      `Birth place could not be found for "${requestedCity}${requestedRegion ? `, ${requestedRegion}` : ""}". Please check the city and State / Union Territory.`,
    );
  }

  return {
    name: [
      location.name,
      location.admin1,
      location.country,
    ]
      .filter(Boolean)
      .join(", "),
    latitude: Number(location.latitude),
    longitude: Number(location.longitude),
    timezone: String(location.timezone),
  };
}

export async function POST(
  request: NextRequest,
) {
  try {
    const clientIp =
      getClientIp(request);

    const rateLimit =
      await checkRateLimit({
        key:
          `astrology-indication:${clientIp}`,
              limit: 20,
              windowMs: 15 * 60 * 1000,
      });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Too many requests. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After":
              String(
                rateLimit.retryAfterSeconds,
              ),
          },
        },
      );
    }

    const contentType =
      request.headers.get(
        "content-type",
      );

    if (
      !contentType
        ?.toLowerCase()
        .includes(
          "application/json",
        )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "JSON request required.",
        },
        {
          status: 415,
        },
      );
    }

    const body =
      await request.json();

    const name =
      typeof body?.name ===
      "string"
        ? body.name.trim().slice(0, MAX_NAME_LENGTH)
        : "";

    const date =
      typeof body?.birthDate ===
      "string"
        ? body.birthDate.trim()
        : "";

    const time =
      typeof body?.birthTime ===
      "string"
        ? body.birthTime.trim()
        : "";

    const birthPlace =
      typeof body?.birthPlace ===
      "string"
        ? body.birthPlace
            .trim()
            .slice(
              0,
              MAX_CITY_LENGTH,
            )
        : "";

    const area =
      typeof body?.questionArea ===
      "string"
        ? body.questionArea.trim()
        : "";

    const exactQuestion =
      typeof body?.exactQuestion ===
      "string"
        ? body.exactQuestion.trim().slice(0, 600)
        : "";

    if (!name) {
      return NextResponse.json(
        {
          ok: false,
          error: "Name is required.",
        },
        { status: 400 },
      );
    }

    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(
        date,
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "A valid birth date is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      time &&
      !/^\d{2}:\d{2}$/.test(
        time,
      )
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Birth time is invalid.",
        },
        {
          status: 400,
        },
      );
    }

    if (!birthPlace) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Birth city is required.",
        },
        {
          status: 400,
        },
      );
    }

    if (
      !(area in QUESTION_AREAS)
    ) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Question area is invalid.",
        },
        {
          status: 400,
        },
      );
    }

    const location =
      await resolveCity(
        birthPlace,
      );

    const calculation =
      await calculateBirthChart(
        date,
        time || undefined,
        location,
      );

    const currentSky =
      await calculateCurrentSky(
        location,
      );

    const result =
      await buildBirthIndication(
        calculation,
        area as QuestionArea,
        currentSky,
        exactQuestion || undefined,
        name,
      );

    return NextResponse.json({
      ok: true,
      data: {
        ...result,
        name,
        location,
        birthTimeKnown:
          calculation.birthTimeKnown,
        exactQuestion: exactQuestion || null,
      },
    });
  } catch (error) {
    console.error(
      "ASTROLOGY INDICATION ERROR:",
      error,
    );

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to prepare the astrology indication.",
      },
      {
        status: 500,
      },
    );
  }
}
