// =========================================================
// AKSHAANSHH JYOTISH
// AI Astrologer Layer
// =========================================================

import type { CurrentSkyCalculation, BirthCalculation } from "./calculations";
import { QUESTION_AREAS, type QuestionArea } from "./constants";
import { buildAreaChartContext, type AreaChartContext } from "./chartFeatures";

export type PersonalizedReading = {
  en: {
    headline: string;
    directAnswer: string;
    keyPoints: string[];
    currentPoints: string[];
    practicalPoints: string[];
  };
  hi: {
    headline: string;
    directAnswer: string;
    keyPoints: string[];
    currentPoints: string[];
    practicalPoints: string[];
  };
};

function requireApiKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim();

  if (!key) {
    throw new Error(
      "Personalized astrology is not configured. Add OPENAI_API_KEY to the server environment.",
    );
  }

  return key;
}

function compactPlanet(planet: AreaChartContext["primaryHousePlanets"][number]) {
  return {
    planet: planet.planet,
    sign: planet.sign.en,
    house: planet.house,
    retrograde: planet.retrograde,
    themes: planet.themes,
    dignity: planet.dignity,
  };
}

function serializeContext(
  context: AreaChartContext,
  exactQuestion?: string,
  customerName?: string,
): string {
  return JSON.stringify(
    {
      questionArea: QUESTION_AREAS[context.area].en,
      customerName: customerName?.trim() || null,
      exactCustomerQuestion: exactQuestion?.trim() || null,
      birthTimeKnown: context.birthTimeKnown,
      lagna: context.lagna,
      selectedArea: {
        primaryHouse: context.primaryHouse,
        primaryHouseThemes: context.primaryHouseThemes,
        secondaryHouses: context.secondaryHouses,
        areaKeyPlanets: context.areaKeyPlanets,
        focusPlanets: context.focusPlanets.map(compactPlanet),
        primarySign: context.primarySign,
        houseLord: context.houseLord,
        houseLordPlacement: context.houseLordPlacement
          ? compactPlanet(context.houseLordPlacement)
          : null,
        primaryHousePlanets: context.primaryHousePlanets.map(compactPlanet),
        supportingHousePlanets: context.supportingHousePlanets.map(compactPlanet),
        relevantAspects: context.relevantAspects,
      },
      natalMoon: context.natalMoon,
      current: context.current,
    },
    null,
    2,
  );
}

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["en", "hi"],
  properties: {
    en: {
      type: "object",
      additionalProperties: false,
      required: ["headline", "directAnswer", "keyPoints", "currentPoints", "practicalPoints"],
      properties: {
        headline: { type: "string" },
        directAnswer: { type: "string" },
        keyPoints: {
          type: "array",
          minItems: 3,
          maxItems: 4,
          items: { type: "string" },
        },
        currentPoints: {
          type: "array",
          minItems: 1,
          maxItems: 2,
          items: { type: "string" },
        },
        practicalPoints: {
          type: "array",
          minItems: 1,
          maxItems: 2,
          items: { type: "string" },
        },
      },
    },
    hi: {
      type: "object",
      additionalProperties: false,
      required: ["headline", "directAnswer", "keyPoints", "currentPoints", "practicalPoints"],
      properties: {
        headline: { type: "string" },
        directAnswer: { type: "string" },
        keyPoints: {
          type: "array",
          minItems: 3,
          maxItems: 4,
          items: { type: "string" },
        },
        currentPoints: {
          type: "array",
          minItems: 1,
          maxItems: 2,
          items: { type: "string" },
        },
        practicalPoints: {
          type: "array",
          minItems: 1,
          maxItems: 2,
          items: { type: "string" },
        },
      },
    },
  },
} as const;

function parseResponsePayload(payload: unknown): PersonalizedReading {
  if (!payload || typeof payload !== "object") {
    throw new Error("AI astrology response was empty");
  }

  const record = payload as Record<string, unknown>;

  const outputText =
    typeof record.output_text === "string"
      ? record.output_text
      : Array.isArray(record.output)
        ? record.output
            .flatMap((item) => {
              if (!item || typeof item !== "object") return [];
              const contents = (item as Record<string, unknown>).content;
              if (!Array.isArray(contents)) return [];
              return contents
                .filter(
                  (content) =>
                    content &&
                    typeof content === "object" &&
                    (content as Record<string, unknown>).type === "output_text",
                )
                .map((content) => (content as Record<string, unknown>).text)
                .filter((text): text is string => typeof text === "string");
            })
            .join("")
        : "";

  if (!outputText) {
    throw new Error("AI astrology response contained no text output");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    throw new Error("AI astrology response was not valid structured JSON");
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("AI astrology response had an invalid structure");
  }

  return parsed as PersonalizedReading;
}

export async function generatePersonalizedReading(
  calculation: BirthCalculation,
  area: QuestionArea,
  currentSky?: CurrentSkyCalculation,
  exactQuestion?: string,
  customerName?: string,
): Promise<PersonalizedReading> {
  const context = buildAreaChartContext(
    calculation,
    area,
    currentSky,
  );

  const apiKey = requireApiKey();
  const model =
    process.env.OPENAI_ASTROLOGY_MODEL?.trim() ||
    "gpt-5.6-luna";

  const instructions = `You are the private interpretation engine for Akshaanshh Jyotish.

PURPOSE
Turn supplied Vedic chart calculations into a short, person-specific reading for the selected life area. The customer should feel that the wording describes recognizable patterns in THEIR life, not a generic horoscope or advice article.

NON-NEGOTIABLE SOURCE RULE
- The supplied calculated context is the only factual source.
- Never invent, assume, or import a chart fact that is not present.
- Do not use common astrology associations as evidence by themselves.
- The semantic theme lists are labels for relevance only. They are NOT evidence.
- The actual evidence is the supplied planetary position, house, sign, dignity, retrograde flag, house-lord placement, relevant aspect relationships, natal Moon context, and current context.
- Never claim an event, date, outcome, diagnosis, relationship event, promotion, marriage, financial gain/loss, or other concrete event unless the supplied context genuinely supports that level of claim.

PRIVATE EVIDENCE PASS
Before writing each point, silently create an evidence check:
1. What exact supplied chart facts support this point?
2. How do those facts work together?
3. Does the combination describe THIS PERSON rather than the topic in general?
4. Is the wording stronger than the evidence? If yes, soften it.
5. Would this point still sound true for a large majority of customers in this area? If yes, rewrite it or remove it.
Do not expose this evidence process or the technical facts to the customer.

EVIDENCE PRIORITY
Use evidence in this order:
1. Multiple relevant chart signals working together.
2. The selected area's primary-house/lord relationship plus supporting placements/aspects.
3. Area key planets when they are actually present and meaningfully connected to the selected area.
4. A single placement only when the inference is narrow and well-supported.
Never turn a theme label into a personality statement without an actual chart relationship behind it.

AREA PRECISION
The selected area must materially change the content.
- Marriage: describe relationship/attachment/commitment/communication patterns only when chart evidence supports them.
- Career: describe work style, responsibility, independence, recognition, decision-making, stability/change and pressure response only when supported.
- Finance/business: distinguish financial habits, risk approach, planning, ownership and decision style from generic success advice.
- Health: only describe non-medical tendencies such as routine, stress sensitivity, rest and energy management when supported. Never diagnose or predict disease.
- Children: describe supported tendencies around care, responsibility, expectations, learning or connection. Do not predict a child's sex, health, or specific future event.
- Education: describe supported learning style, concentration, structure, persistence and theory/practical preferences.

EXACT CUSTOMER QUESTION
If exactCustomerQuestion is present:
- It is the highest-priority part of the reading.
- The directAnswer must answer THAT question for THIS PERSON.
- Key points should explain the personal patterns that make that answer fit.
- Do not replace the question with a generic overview of the selected area.
If it is absent, give the strongest person-specific reading for the selected area.

PERSON-FIRST LANGUAGE
Write about the customer, not about textbook meanings.
Prefer natural phrasing such as:
- “In your case...”
- “You tend to...”
- “A pattern that stands out for you...”
- “You may be more comfortable when...”
- “You are more likely to...”
Do not repeat the same opening in every bullet.

MIRROR TEST
The core job is description, not coaching.
About 85–90% of the reading should be recognizable personal observations and about 10–15% practical reflection.
A useful bullet sounds like something the customer could recognize in their own behavior or experience.
A weak bullet sounds like a universal life lesson.
Do not pad the output merely to reach a count.

STABLE VS CURRENT
- keyPoints = relatively stable personal patterns in the selected area.
- currentPoints = patterns that are more noticeable in the present context.
Do not turn a temporary phase into a lifelong trait.
Do not turn a stable tendency into a claim about today.

BIRTH-TIME LIMITATION
If birthTimeKnown is false:
- Treat house/Lagna-dependent conclusions as lower confidence.
- Do not build the whole reading on precise house-based claims.
- Prefer patterns that remain supported by the available information.
- Keep the uncertainty wording compact and honest.

CONTRADICTIONS
If supplied signals support two different tendencies, preserve the tension instead of forcing one label.
Example: “You may value independence strongly, while still wanting reassurance before a major change.”

TECHNICAL TERMINOLOGY IS INTERNAL ONLY
Never mention in customer-facing strings:
planet, planetary, sign, house, house lord, Lagna, Rashi, Nakshatra, Bhava, Dasha, Transit, Retrograde, Sade Sati, Dhaiya, Aspect, Conjunction, Dignity, Placement, chart, astrology, astrological, celestial, or technical calculation terms.
Translate the supplied technical evidence into ordinary human language.

CERTAINTY CONTROL
Use “suggests”, “may”, “tends to”, “can”, “appears”, or “is more likely to” when appropriate.
Avoid “definitely”, “guaranteed”, “100%”, “certainly”, “you will”, or “this must happen”.
Do not make frightening, fatalistic, or irreversible claims.

BULLET QUALITY
- Short, clean, scannable bullets.
- Prefer one sentence per bullet.
- Rough target: 12–30 words.
- One main idea per bullet.
- No nested bullets.
- No Markdown bullets, numbering, quotation marks, or headings inside the string values.
- Never repeat the same finding in different words.

OUTPUT CONTRACT
Return exactly this JSON structure and nothing else:
- headline: a short personal heading, not a topic label.
- directAnswer: one concise, person-specific answer to the exact question, or the strongest overall conclusion when there is no exact question.
- keyPoints: exactly 3–4 highly specific personal observations.
- currentPoints: exactly 1–2 current-context observations.
- practicalPoints: exactly 1–2 practical reflections tied directly to the person's observed pattern.

FINAL INTERNAL CHECK
For every point ask:
1. Is it directly supported by supplied calculated data?
2. Is it specifically about THIS PERSON?
3. Does it materially relate to THIS AREA?
4. Is it different from the other points?
5. Is it primarily descriptive rather than generic advice?
6. Could almost anyone receive it? If yes, remove or rewrite it.
7. Does the exact question materially change the answer when present?
8. Does the wording avoid unsupported certainty?
9. Is it understandable to a customer with zero astrology knowledge?
10. Is it concise enough to scan on a phone?

Quality has priority over quantity. Never invent a stronger claim just to make the reading sound impressive.`

  const userInput = `Here is the exact calculated chart context. Treat it as authoritative input.

${serializeContext(context, exactQuestion, customerName)}`;

  const response = await fetch(
    "https://api.openai.com/v1/responses",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        instructions,
        input: userInput,
        text: {
          format: {
            type: "json_schema",
            name: "akshaanshh_astrology_reading",
            strict: true,
            schema: OUTPUT_SCHEMA,
          },
        },
        metadata: {
          purpose: "akshaanshh_astrology_personalized_reading",
          area,
        },
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OPENAI ASTROLOGY ERROR:", errorText);
    throw new Error("Unable to generate the personalized astrology reading right now.");
  }

  return parseResponsePayload(await response.json());
}

export function readingToIndication(
  reading: PersonalizedReading,
): { en: string; hi: string } {
  return {
    en: [
      reading.en.directAnswer,
      ...reading.en.keyPoints,
      ...reading.en.currentPoints,
      ...reading.en.practicalPoints,
    ].join("\n"),
    hi: [
      reading.hi.directAnswer,
      ...reading.hi.keyPoints,
      ...reading.hi.currentPoints,
      ...reading.hi.practicalPoints,
    ].join("\n"),
  };
}
