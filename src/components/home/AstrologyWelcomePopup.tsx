"use client";

import "./astrology-welcome-popup.css";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  QUESTION_AREAS,
  RASHIS,
  type QuestionArea,
} from "@/lib/astrology/constants";

import { useLanguage } from "@/context/LanguageContext";

// =========================================================
// TYPES
// =========================================================

type Mode =
  | "menu"
  | "birth"
  | "birth-result"
  | "rashifal"
  | "rashifal-result";

type QuestionPath = {
  area: { en: string; hi: string };
  primaryHouse: number;
  primaryHouseName: { en: string; hi: string };
  primarySign: { en: string; hi: string };
  houseLord: { en: string; hi: string };
  houseLordPlacement: { en: string; hi: string };
  planetsInPrimaryHouse: { en: string; hi: string }[];
  signal: { en: string; hi: string };
  path: { en: string; hi: string }[];
  watch: { en: string; hi: string };
};

type BilingualText = {
  en: string;
  hi: string;
};

type ReadingSection = {
  headline: string;
  directAnswer: string;
  keyPoints: string[];
  currentPoints: string[];
  practicalPoints: string[];
};

type PersonalizedReading = {
  en: ReadingSection;
  hi: ReadingSection;
};

type BirthResult = {
  rashi: BilingualText;
  rashiLord: BilingualText;
  nakshatra: BilingualText;
  nakshatraLord: BilingualText;
  nakshatraPada: number;
  mulank: number;
  bhagyank: number;
  saturnRashi: BilingualText;
  saturnStatus: "sade-sati" | "dhaiya" | "normal";
  saturnRetrograde: boolean;
  saturnText: BilingualText;
  area: QuestionArea;
  indication: BilingualText | ReadingSection | PersonalizedReading;
  personalizedReading?: PersonalizedReading;
  numerology: BilingualText;
  luckyColor: BilingualText;
  luckyNumber: number;
  mantra: BilingualText;
  warning: BilingualText;
  location?: {
    name: string;
    timezone: string;
  };
  birthTimeKnown?: boolean;
  exactQuestion?: string | null;
  name?: string;
};

function isReadingSection(value: unknown): value is ReadingSection {
  if (!value || typeof value !== "object") return false;

  const item = value as Record<string, unknown>;

  return (
    typeof item.headline === "string" &&
    typeof item.directAnswer === "string" &&
    Array.isArray(item.keyPoints) &&
    Array.isArray(item.currentPoints) &&
    Array.isArray(item.practicalPoints) &&
    item.keyPoints.every((point) => typeof point === "string") &&
    item.currentPoints.every((point) => typeof point === "string") &&
    item.practicalPoints.every((point) => typeof point === "string")
  );
}

function isPersonalizedReading(
  value: unknown,
): value is PersonalizedReading {
  if (!value || typeof value !== "object") return false;

  const item = value as Record<string, unknown>;

  return (
    isReadingSection(item.en) &&
    isReadingSection(item.hi)
  );
}

type RashifalResult = {
  rashi: {
    en: string;
    hi: string;
  };

  warning: {
    en: string;
    hi: string;
  } | null;

  moonTransit: {
    en: string;
    hi: string;
  };

  saturnTransit: {
    en: string;
    hi: string;
  };

  dailyText: {
    en: string;
    hi: string;
  };

  luckyColor: {
    en: string;
    hi: string;
  };

  luckyNumber: number;

  mantra: {
    en: string;
    hi: string;
  };

  disclaimer: {
    en: string;
    hi: string;
  };

  date?: string;
};

type ApiResponse<T> = {
  ok?: boolean;
  data?: T;
  error?: string;
};

// =========================================================
// INDIA STATE / CITY OPTIONS
// =========================================================

const INDIA_LOCATIONS: Record<string, string[]> = {
  "Andhra Pradesh": ["Amaravati", "Visakhapatnam", "Vijayawada", "Tirupati", "Guntur", "Nellore", "Kurnool", "Rajahmundry", "Kakinada", "Kadapa"],
  "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Tawang", "Pasighat", "Ziro", "Bomdila", "Along", "Tezu"],
  "Assam": ["Guwahati", "Dibrugarh", "Jorhat", "Silchar", "Tezpur", "Nagaon", "Tinsukia", "Sivasagar", "Dhubri"],
  "Bihar": ["Patna", "Gaya", "Muzaffarpur", "Bhagalpur", "Darbhanga", "Purnia", "Ara", "Begusarai", "Katihar", "Chapra"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Durg", "Bilaspur", "Korba", "Raigarh", "Jagdalpur", "Ambikapur"],
  "Goa": ["Panaji", "Vasco da Gama", "Margao", "Mapusa", "Ponda"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Gandhinagar", "Bhavnagar", "Jamnagar", "Junagadh", "Anand", "Bharuch", "Bhuj", "Mehsana", "Navsari", "Vapi"],
  "Haryana": ["Chandigarh", "Gurugram", "Faridabad", "Panipat", "Ambala", "Hisar", "Karnal", "Rohtak", "Sonipat", "Yamunanagar", "Panchkula", "Bhiwani", "Rewari"],
  "Himachal Pradesh": ["Shimla", "Dharamshala", "Manali", "Solan", "Mandi", "Kullu", "Hamirpur", "Una", "Chamba", "Nahan"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Deoghar", "Hazaribagh", "Giridih", "Ramgarh", "Dumka", "Chaibasa"],
  "Karnataka": ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi", "Dharwad", "Belagavi", "Kalaburagi", "Shivamogga", "Tumakuru", "Davangere", "Ballari", "Udupi", "Hassan", "Mandya", "Bidar"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Kannur", "Alappuzha", "Kottayam", "Palakkad", "Malappuram", "Kasaragod"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Rewa", "Satna", "Ratlam", "Dewas", "Burhanpur", "Khandwa", "Chhindwara"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane", "Navi Mumbai", "Aurangabad", "Kolhapur", "Solapur", "Amravati", "Sangli", "Satara", "Jalgaon", "Akola", "Latur", "Nanded"],
  "Manipur": ["Imphal", "Thoubal", "Bishnupur", "Churachandpur", "Ukhrul"],
  "Meghalaya": ["Shillong", "Tura", "Jowai", "Nongpoh", "Nongstoin"],
  "Mizoram": ["Aizawl", "Lunglei", "Champhai", "Kolasib", "Serchhip"],
  "Nagaland": ["Kohima", "Dimapur", "Mokokchung", "Tuensang", "Wokha", "Mon"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Puri", "Sambalpur", "Balasore", "Baripada", "Jharsuguda", "Koraput"],
  "Punjab": ["Chandigarh", "Amritsar", "Ludhiana", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Pathankot", "Hoshiarpur", "Moga", "Firozpur", "Sangrur"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer", "Bikaner", "Alwar", "Bharatpur", "Sikar", "Bhilwara", "Sri Ganganagar", "Chittorgarh", "Jaisalmer", "Barmer"],
  "Sikkim": ["Gangtok", "Namchi", "Gyalshing", "Mangan", "Ravangla"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Erode", "Vellore", "Thoothukudi", "Thanjavur", "Dindigul", "Hosur", "Nagercoil", "Kanchipuram"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam", "Ramagundam", "Nalgonda", "Mahbubnagar", "Adilabad", "Siddipet"],
  "Tripura": ["Agartala", "Udaipur", "Dharmanagar", "Kailasahar", "Belonia"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Ghaziabad", "Noida", "Greater Noida", "Agra", "Varanasi", "Prayagraj", "Meerut", "Bareilly", "Aligarh", "Moradabad", "Saharanpur", "Gorakhpur", "Mathura", "Firozabad", "Jhansi", "Ayodhya", "Muzaffarnagar", "Rampur", "Hapur", "Bulandshahr", "Sitapur", "Unnao", "Etawah", "Basti", "Mirzapur"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Rishikesh", "Haldwani", "Nainital", "Roorkee", "Rudrapur", "Almora", "Mussoorie", "Pithoragarh"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Darjeeling", "Kharagpur", "Malda", "Bardhaman", "Haldia", "Berhampore"],
  "Andaman and Nicobar Islands": ["Port Blair", "Diglipur", "Mayabunder", "Rangat"],
  "Chandigarh": ["Chandigarh"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Diu", "Silvassa"],
  "Delhi": ["New Delhi", "Delhi"],
  "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla", "Kathua", "Udhampur", "Kupwara", "Pulwama"],
  "Ladakh": ["Leh", "Kargil"],
  "Lakshadweep": ["Kavaratti", "Agatti", "Andrott", "Amini"],
  "Puducherry": ["Puducherry", "Karaikal", "Mahe", "Yanam"],
};

const INDIA_STATES = Object.keys(INDIA_LOCATIONS);

// =========================================================
// COMPONENT
// =========================================================

export default function AstrologyWelcomePopup() {
  const { language, setLanguage } = useLanguage();

  const [open, setOpen] = useState(false);

  const [mode, setMode] =
    useState<Mode>("menu");

  const [selectedRashi, setSelectedRashi] =
    useState<number | null>(null);

  const [name, setName] =
    useState("");

  const [birthDate, setBirthDate] =
    useState("");

  const [birthTime, setBirthTime] =
    useState("");

  const [birthCity, setBirthCity] =
    useState("");

  const [birthState, setBirthState] =
    useState("");

  const availableCities =
    birthState ? INDIA_LOCATIONS[birthState] ?? [] : [];

  const [questionArea, setQuestionArea] =
    useState<QuestionArea>("marriage");

  const [exactQuestion, setExactQuestion] =
    useState("");

  const [birthResult, setBirthResult] =
    useState<BirthResult | null>(null);

  const [rashifalResult, setRashifalResult] =
    useState<RashifalResult | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  // Keep successful daily Rashifal results in the current browser session.
  // This prevents repeated clicks/navigation from consuming the API rate limit
  // while still refreshing automatically on a new calendar day.
  const rashifalCacheRef =
    useRef<Record<string, RashifalResult>>({});

  const rashifalRequestRef =
    useRef<Promise<RashifalResult> | null>(null);

  // ---------------------------------------------------------
  // First visit
  // ---------------------------------------------------------

  useEffect(() => {
    try {
      const alreadySeen =
        window.localStorage.getItem(
          "akshaanshh-astrology-welcome-seen",
        );

      if (!alreadySeen) {
        const timer =
          window.setTimeout(() => {
            setOpen(true);

            window.localStorage.setItem(
              "akshaanshh-astrology-welcome-seen",
              "1",
            );
          }, 750);

        return () => {
          window.clearTimeout(timer);
        };
      }
    } catch {
      // localStorage can be unavailable in
      // privacy-restricted browser environments.

      const timer =
        window.setTimeout(() => {
          setOpen(true);
        }, 750);

      return () => {
        window.clearTimeout(timer);
      };
    }
  }, []);

  // ---------------------------------------------------------
  // Body scroll lock
  // ---------------------------------------------------------

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, [open]);

  // ---------------------------------------------------------
  // Close
  // ---------------------------------------------------------

  const closePopup =
    useCallback(() => {
      setOpen(false);
    }, []);

  // ---------------------------------------------------------
  // ESC key
  // ---------------------------------------------------------

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown =
      (event: KeyboardEvent) => {
        if (event.key === "Escape") {
          closePopup();
        }
      };

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [open, closePopup]);

  // ---------------------------------------------------------
  // Reset current state
  // ---------------------------------------------------------

  const resetState =
    useCallback(() => {
      setMode("menu");

      setSelectedRashi(null);

      setName("");

      setExactQuestion("");

      setBirthResult(null);

      setRashifalResult(null);

      setError("");

      setLoading(false);
    }, []);

  // ---------------------------------------------------------
  // Navigate to mode
  // ---------------------------------------------------------

  function selectMode(
    nextMode: "birth" | "rashifal",
  ) {
    setError("");

    setBirthResult(null);

    setRashifalResult(null);

    if (nextMode === "birth") {
      setMode("birth");
    } else {
      setMode("rashifal");
    }
  }

  // ---------------------------------------------------------
  // Birth indication submit
  // ---------------------------------------------------------

  async function submitBirthIndication(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");

    if (!name.trim()) {
      setError(
        language === "hi"
          ? "कृपया अपना नाम दर्ज करें।"
          : "Please enter your name.",
      );

      return;
    }

    if (!birthDate) {
      setError(
        language === "hi"
          ? "कृपया जन्म तिथि चुनें।"
          : "Please select your birth date.",
      );

      return;
    }

    if (!birthCity.trim()) {
      setError(
        language === "hi"
          ? "कृपया जन्म का नगर दर्ज करें।"
          : "Please enter your birth city.",
      );

      return;
    }

    if (!birthState.trim()) {
      setError(
        language === "hi"
          ? "कृपया जन्म का राज्य दर्ज करें।"
          : "Please enter your birth state.",
      );

      return;
    }

    // Keep the existing API architecture.
    // The API still receives one birthPlace string,
    // but now it is built from separately validated
    // City + State fields for better geocoding.
    const birthPlace =
      `${birthCity.trim()}, ${birthState.trim()}`;

    setLoading(true);

    try {
      const response =
        await fetch(
          "/api/astrology/indication",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              name: name.trim(),
              birthDate,

              birthTime:
                birthTime || undefined,

              birthPlace,

              questionArea,

              exactQuestion:
                exactQuestion.trim() || undefined,
            }),
          },
        );

      const result =
        (await response.json()) as ApiResponse<BirthResult>;

      if (
        !response.ok ||
        !result.ok ||
        !result.data
      ) {
        throw new Error(
          result.error ||
            (language === "hi"
              ? "संकेत तैयार नहीं हो सका।"
              : "Unable to calculate the indication."),
        );
      }

      setBirthResult(
        result.data,
      );

      setMode(
        "birth-result",
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : language === "hi"
            ? "कुछ गलत हो गया। कृपया पुनः प्रयास करें।"
            : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  // ---------------------------------------------------------
  // Rashifal submit
  // ---------------------------------------------------------

  async function submitRashifal() {
    if (
      loading ||
      selectedRashi === null
    ) {
      return;
    }

    setError("");

    const today =
      new Date().toLocaleDateString(
        "en-CA",
      );

    const cacheKey =
      `${today}:${selectedRashi}`;

    const cached =
      rashifalCacheRef.current[cacheKey];

    if (cached) {
      setRashifalResult(cached);
      setMode("rashifal-result");
      return;
    }

    // Guard against duplicate requests from rapid interaction.
    if (rashifalRequestRef.current) {
      return;
    }

    setLoading(true);

    const request = (async () => {
      const response =
        await fetch(
          `/api/astrology/rashifal?rashi=${selectedRashi}`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          },
        );

      const result =
        (await response.json()) as ApiResponse<RashifalResult>;

      if (
        !response.ok ||
        !result.ok ||
        !result.data
      ) {
        if (response.status === 429) {
          throw new Error(
            language === "hi"
              ? "अभी अनुरोधों की सीमा पूरी हो गई है। कृपया थोड़ी देर बाद पुनः प्रयास करें।"
              : "The request limit has been reached for now. Please try again a little later.",
          );
        }

        throw new Error(
          result.error ||
            (language === "hi"
              ? "आज का राशिफल तैयार नहीं हो सका।"
              : "Unable to calculate today's Rashifal."),
        );
      }

      return result.data;
    })();

    rashifalRequestRef.current = request;

    try {
      const data = await request;

      rashifalCacheRef.current[cacheKey] = data;
      setRashifalResult(data);
      setMode("rashifal-result");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : language === "hi"
            ? "कुछ गलत हो गया। कृपया पुनः प्रयास करें।"
            : "Something went wrong. Please try again.",
      );
    } finally {
      rashifalRequestRef.current = null;
      setLoading(false);
    }
  }

  // ---------------------------------------------------------
  // Don't render
  // ---------------------------------------------------------

  if (!open) {
    return null;
  }

  // ---------------------------------------------------------
  // Language helper
  // ---------------------------------------------------------

  const text = (
    value: {
      en: string;
      hi: string;
    },
  ) =>
    language === "hi"
      ? value.hi
      : value.en;

  const localizedReading =
    birthResult
      ? isPersonalizedReading(
          birthResult.personalizedReading,
        )
        ? birthResult.personalizedReading[language]
        : isPersonalizedReading(birthResult.indication)
          ? birthResult.indication[language]
          : isReadingSection(birthResult.indication)
            ? birthResult.indication
            : null
      : null;

  const displayedExactQuestion =
    birthResult?.exactQuestion?.trim() ||
    exactQuestion.trim();

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------

  return (
    <div
      className="astrology-welcome-overlay"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          closePopup();
        }
      }}
    >
      <section
        className="astrology-welcome-modal"
        role="dialog"
        aria-modal="true"
        aria-label={
          language === "hi"
            ? "ज्योतिष स्वागत"
            : "Astrology welcome"
        }
      >
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="astrology-welcome-header">
          <div>
            <span className="astrology-welcome-eyebrow">
              {language === "hi"
                ? "वैदिक ज्योतिष"
                : "VEDIC ASTROLOGY"}
            </span>

            <h2>
              {language === "hi"
                ? "अपने सितारों के संकेत जानें"
                : "Discover your astrological indications"}
            </h2>

            <p>
              {language === "hi"
                ? "जन्म तिथि या अपनी राशि के आधार पर एक संक्षिप्त पारंपरिक ज्योतिषीय संकेत देखें।"
                : "Explore a brief traditional astrological indication using your birth details or Rashi."}
            </p>
          </div>

          <div className="astrology-welcome-header-actions">
            <div
              className="astrology-welcome-language-control"
              role="group"
              aria-label={
                language === "hi"
                  ? "भाषा चुनें"
                  : "Choose language"
              }
            >
              <span className="astrology-welcome-language-label">
                {language === "hi" ? "भाषा" : "Language"}
              </span>

              <div className="astrology-welcome-language" role="presentation">
                <button
                  type="button"
                  className={
                    language === "en"
                      ? "active"
                      : ""
                  }
                  aria-pressed={language === "en"}
                  aria-label="Switch to English"
                  title="English"
                  onClick={() => setLanguage("en")}
                >
                  EN
                </button>

                <span aria-hidden="true">|</span>

                <button
                  type="button"
                  className={
                    language === "hi"
                      ? "active"
                      : ""
                  }
                  aria-pressed={language === "hi"}
                  aria-label="हिन्दी में बदलें"
                  title="हिन्दी"
                  onClick={() => setLanguage("hi")}
                >
                  हिन्दी
                </button>
              </div>
            </div>

            <button
              type="button"
              className="astrology-welcome-close"
              aria-label={
                language === "hi"
                  ? "बंद करें"
                  : "Close"
              }
              onClick={closePopup}
            >
              ×
            </button>
          </div>
        </div>

        {/* =================================================
            MENU
        ================================================= */}

        {mode === "menu" && (
          <div className="astrology-welcome-menu">
            <button
              type="button"
              className="astrology-welcome-option"
              onClick={() =>
                selectMode("birth")
              }
            >
              <span className="astrology-welcome-option-icon">
                ✦
              </span>

              <span>
                <strong>
                  {language === "hi"
                    ? "जन्म तिथि से संकेत"
                    : "Birth-Date Indication"}
                </strong>

                <small>
                  {language === "hi"
                    ? "राशि, नक्षत्र, मूलांक और शनि की वर्तमान स्थिति"
                    : "Rashi, Nakshatra, numerology and current Saturn status"}
                </small>
              </span>

              <span className="astrology-welcome-arrow">
                →
              </span>
            </button>

            <button
              type="button"
              className="astrology-welcome-option"
              onClick={() =>
                selectMode("rashifal")
              }
            >
              <span className="astrology-welcome-option-icon">
                ☾
              </span>

              <span>
                <strong>
                  {language === "hi"
                    ? "12 राशियों का दैनिक फल"
                    : "Daily Rashifal for 12 Rashis"}
                </strong>

                <small>
                  {language === "hi"
                    ? "अपनी राशि चुनें और आज का संकेत देखें"
                    : "Choose your Rashi and explore today's indication"}
                </small>
              </span>

              <span className="astrology-welcome-arrow">
                →
              </span>
            </button>
          </div>
        )}

        {/* =================================================
            BIRTH FORM
        ================================================= */}

        {mode === "birth" && (
          <form
            className="astrology-welcome-form"
            onSubmit={
              submitBirthIndication
            }
          >
            <button
              type="button"
              className="astrology-welcome-back"
              onClick={resetState}
            >
              ←{" "}
              {language === "hi"
                ? "वापस"
                : "Back"}
            </button>

            <div className="astrology-welcome-section-title">
              <span>
                ✦
              </span>

              <div>
                <h3>
                  {language === "hi"
                    ? "जन्म विवरण"
                    : "Birth Details"}
                </h3>

                <p>
                  {language === "hi"
                    ? "अपनी जन्म जानकारी भरें।"
                    : "Enter your birth information."}
                </p>
              </div>
            </div>

            {/* =================================================
                NAME
            ================================================= */}
            <label className="astrology-welcome-field">
              <span>
                {language === "hi"
                  ? "आपका नाम *"
                  : "Your Name *"}
              </span>

              <input
                type="text"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder={
                  language === "hi"
                    ? "जैसे: राहुल शर्मा"
                    : "e.g. Rahul Sharma"
                }
                maxLength={120}
                autoComplete="name"
                required
                aria-required="true"
              />
            </label>

            {/* =================================================
                BIRTH DATE
            ================================================= */}

            <label className="astrology-welcome-field">
              <span>
                {language === "hi"
                  ? "जन्म तिथि *"
                  : "Birth Date *"}
              </span>

              <input
                type="date"
                value={birthDate}
                onChange={(event) =>
                  setBirthDate(
                    event.target.value,
                  )
                }
                required
                aria-required="true"
                max={
                  new Date()
                    .toISOString()
                    .split("T")[0]
                }
              />
            </label>

            {/* =================================================
                BIRTH TIME
            ================================================= */}

            <label className="astrology-welcome-field">
              <span>
                {language === "hi"
                  ? "जन्म समय"
                  : "Birth Time"}

                <em>
                  {" "}
                  {language === "hi"
                    ? "(यदि ज्ञात हो)"
                    : "(if known)"}
                </em>
              </span>

              <input
                type="time"
                value={birthTime}
                onChange={(event) =>
                  setBirthTime(
                    event.target.value,
                  )
                }
              />
            </label>

            {/* =================================================
                BIRTH PLACE
            ================================================= */}

            <div className="astrology-welcome-location-group">
              <div className="astrology-welcome-location-heading">
                <span>
                  {language === "hi"
                    ? "जन्म स्थान"
                    : "Birth Place"}
                </span>

                <small>
                  {language === "hi"
                    ? "पहले राज्य चुनें, फिर नगर चुनें"
                    : "Select your state first, then your city"}
                </small>
              </div>

              <div className="astrology-welcome-location-grid">
                {/* State */}
                <label className="astrology-welcome-field">
                  <span>
                    {language === "hi"
                      ? "राज्य / केंद्र शासित प्रदेश *"
                      : "State / Union Territory *"}
                  </span>

                  <select
                    value={birthState}
                    onChange={(event) => {
                      setBirthState(event.target.value);
                      setBirthCity("");
                    }}
                    required
                    aria-required="true"
                    autoComplete="address-level1"
                  >
                    <option value="">
                      {language === "hi"
                        ? "राज्य / केंद्र शासित प्रदेश चुनें"
                        : "Select state / Union Territory"}
                    </option>

                    {INDIA_STATES.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </label>

                {/* City */}
                <label className="astrology-welcome-field">
                  <span>
                    {language === "hi"
                      ? "नगर *"
                      : "City *"}
                  </span>

                  <select
                    value={birthCity}
                    onChange={(event) =>
                      setBirthCity(event.target.value)
                    }
                    required
                    aria-required="true"
                    autoComplete="address-level2"
                    disabled={!birthState}
                  >
                    <option value="">
                      {!birthState
                        ? language === "hi"
                          ? "पहले राज्य चुनें"
                          : "Select state first"
                        : language === "hi"
                          ? "नगर चुनें"
                          : "Select city"}
                    </option>

                    {availableCities.map((city) => (
                      <option key={city} value={city}>
                        {city}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {(birthCity.trim() ||
                birthState.trim()) && (
                <div
                  className="astrology-welcome-location-preview"
                  aria-live="polite"
                >
                  <span aria-hidden="true">
                    📍
                  </span>

                  <span>
                    {birthCity.trim() ||
                      (language === "hi"
                        ? "नगर"
                        : "City")}
                    {birthCity.trim() &&
                    birthState.trim()
                      ? ", "
                      : ""}
                    {birthState.trim() ||
                      (language === "hi"
                        ? "राज्य"
                        : "State")}
                  </span>
                </div>
              )}
            </div>

            {/* =================================================
                QUESTION AREA
            ================================================= */}

            <label className="astrology-welcome-field">
              <span>
                {language === "hi"
                  ? "प्रश्न-क्षेत्र (वैकल्पिक)"
                  : "Question Area (Optional)"}
              </span>

              <select
                value={questionArea}
                onChange={(event) =>
                  setQuestionArea(
                    event.target
                      .value as QuestionArea,
                  )
                }
              >
                {(
                  Object.keys(
                    QUESTION_AREAS,
                  ) as QuestionArea[]
                ).map((area) => (
                  <option
                    key={area}
                    value={area}
                  >
                    {text(
                      QUESTION_AREAS[
                        area
                      ],
                    )}
                  </option>
                ))}
              </select>
            </label>

            {/* =================================================
                SPECIFIC QUESTION
            ================================================= */}

            <label className="astrology-welcome-field">
              <span>
                {language === "hi"
                  ? "आपका खास सवाल (वैकल्पिक)"
                  : "Your specific question (Optional)"}
              </span>

              <textarea
                value={exactQuestion}
                onChange={(event) =>
                  setExactQuestion(
                    event.target.value,
                  )
                }
                maxLength={600}
                placeholder={
                  language === "hi"
                    ? "जैसे: क्या मेरे लिए नौकरी बदलना सही रहेगा? या मेरे रिश्तों में मैं आमतौर पर कैसा व्यवहार करता हूँ?"
                    : "e.g. Should I change jobs? Or what pattern do I tend to show in relationships?"
                }
                rows={4}
              />

              <small className="astrology-welcome-field-help">
                {language === "hi"
                  ? "अपना असली सवाल लिखें। रीडिंग में इसी सवाल को सबसे पहले देखा जाएगा।"
                  : "Write your real question. Your reading will prioritize this question first."}
              </small>
            </label>

            {/* =================================================
                NOTE
            ================================================= */}

            <div className="astrology-welcome-note">
              <span>i</span>

              <p>
                {language === "hi"
                  ? "सही जन्म समय मिलने पर रीडिंग अधिक व्यक्तिगत हो सकती है। शहर और राज्य सही चुनने से जन्म स्थान की गणना भी अधिक सटीक रहती है।"
                  : "A known birth time can make the reading more specific. Selecting the correct city and state also improves the birth-location calculation."}
              </p>
            </div>

            {/* =================================================
                ERROR
            ================================================= */}

            {error && (
              <div
                className="astrology-welcome-error"
                role="alert"
              >
                {error}
              </div>
            )}

            {/* =================================================
                SUBMIT
            ================================================= */}

            <button
              type="submit"
              className="astrology-welcome-primary"
              disabled={loading}
            >
              {loading
                ? language === "hi"
                  ? "गणना हो रही है..."
                  : "Calculating..."
                : language === "hi"
                  ? "मेरी रीडिंग देखें"
                  : "See My Reading"}
            </button>
          </form>
        )}

        {/* =================================================
            BIRTH RESULT
        ================================================= */}

        {mode === "birth-result" &&
          birthResult && (
            <div className="astrology-welcome-result">
              <button
                type="button"
                className="astrology-welcome-back"
                onClick={() => setMode("birth")}
              >
                ←{" "}
                {language === "hi"
                  ? "विवरण बदलें"
                  : "Change details"}
              </button>

              <div className="astrology-welcome-result-heading astrology-welcome-result-heading--premium">
                <span className="astrology-welcome-result-mark">
                  ✦
                </span>

                <div>
                  <span className="astrology-welcome-result-eyebrow">
                    {language === "hi"
                      ? "आपकी व्यक्तिगत रीडिंग"
                      : "YOUR PERSONAL READING"}
                  </span>

                  <h3>
                    {birthResult.name?.trim()
                      ? language === "hi"
                        ? `${birthResult.name.trim()}, यह आपके बारे में क्या उभरकर आता है`
                        : `${birthResult.name.trim()}, what stands out about you`
                      : language === "hi"
                        ? "आपके बारे में क्या उभरकर आता है"
                        : "What stands out about you"}
                  </h3>

                  <p>
                    {text(
                      QUESTION_AREAS[birthResult.area],
                    )}
                    {birthResult.location?.name
                      ? ` · ${birthResult.location.name}`
                      : ""}
                  </p>
                </div>
              </div>

              {displayedExactQuestion && (
                <div className="astrology-welcome-question-card">
                  <span>
                    {language === "hi"
                      ? "आपका सवाल"
                      : "YOUR QUESTION"}
                  </span>

                  <p>“{displayedExactQuestion}”</p>
                </div>
              )}

              {localizedReading ? (
                <div className="astrology-welcome-reading">
                  <section className="astrology-welcome-reading-main">
                    <div className="astrology-welcome-reading-kicker">
                      <span>01</span>
                      <span>
                        {language === "hi"
                          ? "मुख्य पैटर्न"
                          : "THE MAIN PATTERN"}
                      </span>
                    </div>

                    <h4>
                      {localizedReading.headline}
                    </h4>

                    <ul className="astrology-welcome-reading-list astrology-welcome-reading-list--lead">
                      <li>
                        {localizedReading.directAnswer}
                      </li>
                    </ul>
                  </section>

                  {localizedReading.keyPoints.length > 0 && (
                    <section className="astrology-welcome-reading-section">
                      <div className="astrology-welcome-reading-section-heading">
                        <span>02</span>
                        <div>
                          <h4>
                            {language === "hi"
                              ? "आपके बारे में सबसे साफ संकेत"
                              : "What stands out most about you"}
                          </h4>
                          <p>
                            {language === "hi"
                              ? "ये बातें आपके दिए गए जन्म-विश्लेषण से निकले सबसे व्यक्तिगत पैटर्न हैं।"
                              : "These are the most person-specific patterns supported by your supplied birth analysis."}
                          </p>
                        </div>
                      </div>

                      <ul className="astrology-welcome-reading-list">
                        {localizedReading.keyPoints.map(
                          (point, index) => (
                            <li key={`key-${index}`}>
                              <span className="astrology-welcome-reading-dot" />
                              <span>{point}</span>
                            </li>
                          ),
                        )}
                      </ul>
                    </section>
                  )}

                  {localizedReading.currentPoints.length > 0 && (
                    <section className="astrology-welcome-reading-section astrology-welcome-reading-section--current">
                      <div className="astrology-welcome-reading-section-heading">
                        <span>03</span>
                        <div>
                          <h4>
                            {language === "hi"
                              ? "अभी आपके लिए क्या ज्यादा उभर रहा है"
                              : "What is more noticeable for you right now"}
                          </h4>
                        </div>
                      </div>

                      <ul className="astrology-welcome-reading-list">
                        {localizedReading.currentPoints.map(
                          (point, index) => (
                            <li key={`current-${index}`}>
                              <span className="astrology-welcome-reading-dot" />
                              <span>{point}</span>
                            </li>
                          ),
                        )}
                      </ul>
                    </section>
                  )}

                  {localizedReading.practicalPoints.length > 0 && (
                    <section className="astrology-welcome-reading-section astrology-welcome-reading-section--takeaway">
                      <div className="astrology-welcome-reading-section-heading">
                        <span>04</span>
                        <div>
                          <h4>
                            {language === "hi"
                              ? "आपके लिए ध्यान रखने योग्य बातें"
                              : "What to keep in mind for yourself"}
                          </h4>
                        </div>
                      </div>

                      <ul className="astrology-welcome-reading-list">
                        {localizedReading.practicalPoints.map(
                          (point, index) => (
                            <li key={`practical-${index}`}>
                              <span className="astrology-welcome-reading-dot" />
                              <span>{point}</span>
                            </li>
                          ),
                        )}
                      </ul>
                    </section>
                  )}
                </div>
              ) : (
                <section className="astrology-welcome-reading astrology-welcome-reading--fallback">
                  <div className="astrology-welcome-reading-kicker">
                    <span>01</span>
                    <span>
                      {language === "hi"
                        ? "सरल निष्कर्ष"
                        : "PLAIN-LANGUAGE SUMMARY"}
                    </span>
                  </div>

                  <ul className="astrology-welcome-reading-list astrology-welcome-reading-list--lead">
                    <li>{text(birthResult.indication as BilingualText)}</li>
                  </ul>
                </section>
              )}

              <div className="astrology-welcome-result-footnote">
                <span aria-hidden="true">i</span>
                <p>
                  {language === "hi"
                    ? birthResult.birthTimeKnown === false
                      ? "जन्म समय उपलब्ध नहीं था, इसलिए समय पर निर्भर कुछ निष्कर्ष अनुमानित हैं।"
                      : "यह रीडिंग आपके दिए गए जन्म-विश्लेषण पर आधारित पारंपरिक व्याख्या है, निश्चित भविष्यवाणी नहीं।"
                    : birthResult.birthTimeKnown === false
                      ? "Your birth time was not provided, so conclusions that depend strongly on time are approximate."
                      : "This reading is a traditional interpretation of your supplied birth analysis, not a certain prediction."}
                </p>
              </div>

              <button
                type="button"
                className="astrology-welcome-primary"
                onClick={closePopup}
              >
                {language === "hi"
                  ? "समझ गया"
                  : "Continue"}
              </button>
            </div>
          )}

        {/* =================================================
            RASHIFAL SELECTOR
        ================================================= */}

        {mode === "rashifal" && (
          <div className="astrology-welcome-rashifal">
            <button
              type="button"
              className="astrology-welcome-back"
              onClick={resetState}
            >
              ←{" "}
              {language === "hi"
                ? "वापस"
                : "Back"}
            </button>

            <div className="astrology-welcome-section-title">
              <span>
                ☾
              </span>

              <div>
                <h3>
                  {language === "hi"
                    ? "अपनी राशि चुनें"
                    : "Choose Your Rashi"}
                </h3>

                <p>
                  {language === "hi"
                    ? "आज का दैनिक फल देखने के लिए अपनी चन्द्र राशि चुनें।"
                    : "Select your Moon Rashi to view today's daily indication."}
                </p>
              </div>
            </div>

            <div className="astrology-welcome-rashi-grid">
              {RASHIS.map(
                (rashi) => (
                  <button
                    key={rashi.index}
                    type="button"
                    className={
                      selectedRashi ===
                      rashi.index
                        ? "selected"
                        : ""
                    }
                    onClick={() => {
                      setSelectedRashi(rashi.index);
                      setError("");
                    }}
                    aria-pressed={
                      selectedRashi === rashi.index
                    }
                  >
                    <span>
                      {language === "hi"
                        ? rashi.hi
                        : rashi.en}
                    </span>

                    <small>
                      {language === "hi"
                        ? rashi.en
                        : rashi.hi}
                    </small>
                  </button>
                ),
              )}
            </div>

            {error && (
              <div
                className="astrology-welcome-error"
                role="alert"
              >
                {error}
              </div>
            )}

            <button
              type="button"
              className="astrology-welcome-primary"
              disabled={
                loading ||
                selectedRashi === null
              }
              onClick={
                submitRashifal
              }
            >
              {loading
                ? language === "hi"
                  ? "गणना हो रही है..."
                  : "Calculating..."
                : language === "hi"
                  ? "आज का फल देखें"
                  : "View Today's Rashifal"}
            </button>
          </div>
        )}

        {/* =================================================
            RASHIFAL RESULT
        ================================================= */}

        {mode ===
          "rashifal-result" &&
          rashifalResult && (
            <div className="astrology-welcome-result">
              <button
                type="button"
                className="astrology-welcome-back"
                onClick={() =>
                  setMode("rashifal")
                }
              >
                ←{" "}
                {language === "hi"
                  ? "राशि बदलें"
                  : "Change Rashi"}
              </button>

              <div className="astrology-welcome-result-heading">
                <span>
                  ☾
                </span>

                <div>
                  <h3>
                    {language === "hi"
                      ? `${text(rashifalResult.rashi)} का दैनिक फल`
                      : `Daily Rashifal for ${text(rashifalResult.rashi)}`}
                  </h3>

                  {rashifalResult.date && (
                    <p>
                      {rashifalResult.date}
                    </p>
                  )}
                </div>
              </div>

              {/* =================================================
                  WARNING
              ================================================= */}

              {rashifalResult.warning && (
                <div className="astrology-welcome-warning">
                  <span>!</span>

                  <p>
                    {text(
                      rashifalResult.warning,
                    )}
                  </p>
                </div>
              )}

              {/* =================================================
                  DAILY TEXT
              ================================================= */}

              <div className="astrology-welcome-card astrology-welcome-highlight">
                <div className="astrology-welcome-card-heading">
                  <span>01</span>

                  <h4>
                    {language === "hi"
                      ? "आज का फल"
                      : "Today's Indication"}
                  </h4>
                </div>

                <p>
                  {text(
                    rashifalResult.dailyText,
                  )}
                </p>
              </div>

              {/* =================================================
                  PLANETARY MOVEMENT
              ================================================= */}

              <div className="astrology-welcome-card">
                <div className="astrology-welcome-card-heading">
                  <span>02</span>

                  <h4>
                    {language === "hi"
                      ? "वर्तमान गोचर"
                      : "Current Transit"}
                  </h4>
                </div>

                <p>
                  {text(
                    rashifalResult.moonTransit,
                  )}
                </p>

                <p>
                  {text(
                    rashifalResult.saturnTransit,
                  )}
                </p>
              </div>

              {/* =================================================
                  LUCKY GUIDANCE
              ================================================= */}

              <div className="astrology-welcome-lucky-grid">
                <div>
                  <small>
                    {language === "hi"
                      ? "शुभ रंग:"
                      : "Lucky Color:"}
                  </small>

                  <strong>
                    {text(
                      rashifalResult.luckyColor,
                    )}
                  </strong>
                </div>

                <div>
                  <small>
                    {language === "hi"
                      ? "शुभ अंक:"
                      : "Lucky Number:"}
                  </small>

                  <strong>
                    {rashifalResult.luckyNumber}
                  </strong>
                </div>

                <div>
                  <small>
                    {language === "hi"
                      ? "आज का मंत्र:"
                      : "Today's Mantra:"}
                  </small>

                  <strong>
                    {text(
                      rashifalResult.mantra,
                    )}
                  </strong>
                </div>
              </div>

              {/* =================================================
                  DISCLAIMER
              ================================================= */}

              <div className="astrology-welcome-disclaimer">
                {text(
                  rashifalResult.disclaimer,
                )}
              </div>

              <button
                type="button"
                className="astrology-welcome-primary"
                onClick={closePopup}
              >
                {language === "hi"
                  ? "समझ गया"
                  : "Continue"}
              </button>
            </div>
          )}
      </section>
    </div>
  );
}