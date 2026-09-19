"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { Service } from "@/types/booking";
import { useLanguage } from "@/context/LanguageContext";

type ServiceSelectorProps = {
  services: Service[];
  selectedServiceId: string | null;
  onSelect: (serviceId: string) => void;
};

type ServiceVisual = "astrology" | "numerology" | "tarot" | "generic";

function getServiceVisual(category?: string): ServiceVisual {
  const value = String(category || "").toLowerCase().trim();

  if (value.includes("astrolog")) return "astrology";
  if (value.includes("numerolog")) return "numerology";
  if (value.includes("tarot")) return "tarot";

  return "generic";
}

function ServiceArtwork({
  category,
  language,
}: {
  category?: string;
  language: "en" | "hi";
}) {
  const visual = getServiceVisual(category);

  if (visual === "astrology") {
    return (
      <svg
        className="booking-service-artwork-svg"
        viewBox="0 0 520 360"
        role="img"
        aria-label={language === "hi" ? "ज्योतिष संबंधी चित्र" : "Celestial astrology artwork"}
      >
        <defs>
          <radialGradient id="astrologyBg" cx="50%" cy="45%" r="70%">
            <stop offset="0%" stopColor="#5a3b0d" />
            <stop offset="55%" stopColor="#241507" />
            <stop offset="100%" stopColor="#090806" />
          </radialGradient>
          <radialGradient id="astrologySun" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="#fff8d6" />
            <stop offset="35%" stopColor="#f3c65b" />
            <stop offset="100%" stopColor="#9d6814" />
          </radialGradient>
          <filter id="astrologyGlow">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="520" height="360" rx="28" fill="url(#astrologyBg)" />

        <g opacity="0.5" fill="#e9c56b">
          <circle cx="70" cy="66" r="2" />
          <circle cx="120" cy="105" r="3" />
          <circle cx="430" cy="75" r="2" />
          <circle cx="470" cy="150" r="3" />
          <circle cx="75" cy="275" r="2" />
          <circle cx="410" cy="285" r="2" />
        </g>

        <g transform="translate(260 180)" fill="none" stroke="#d9aa43">
          <circle r="128" strokeWidth="2" opacity="0.65" />
          <circle r="103" strokeWidth="1.5" opacity="0.6" />
          <circle r="76" strokeWidth="1" opacity="0.55" />
          <path d="M0-128V128M-128 0H128M-91-91L91 91M91-91L-91 91" opacity="0.45" />
        </g>

        <g transform="translate(260 180)" fill="#f0cb69" fontFamily="Georgia, serif" fontSize="24" textAnchor="middle">
          <text y="-105">♈</text>
          <text x="52" y="-91">♉</text>
          <text x="91" y="-42">♊</text>
          <text x="105" y="8">♋</text>
          <text x="80" y="62">♌</text>
          <text x="35" y="99">♍</text>
          <text x="-35" y="99">♎</text>
          <text x="-80" y="62">♏</text>
          <text x="-105" y="8">♐</text>
          <text x="-91" y="-42">♑</text>
          <text x="-52" y="-91">♒</text>
          <text y="-105">♓</text>
        </g>

        <circle cx="260" cy="180" r="31" fill="url(#astrologySun)" filter="url(#astrologyGlow)" />
        <g stroke="#f6d98a" strokeWidth="3" opacity="0.8">
          <path d="M260 132V111M260 249V228M212 180H191M329 180H308" />
          <path d="M226 146L211 131M314 231L299 216M299 146L314 131M211 229L226 214" />
        </g>

        <g fill="#d6a83f" opacity="0.9">
          <circle cx="102" cy="250" r="10" />
          <circle cx="407" cy="112" r="13" />
          <circle cx="390" cy="266" r="8" />
        </g>
      </svg>
    );
  }

  if (visual === "numerology") {
    return (
      <svg
        className="booking-service-artwork-svg"
        viewBox="0 0 520 360"
        role="img"
        aria-label={language === "hi" ? "अंक ज्योतिष संबंधी चित्र" : "Mystical numerology artwork"}
      >
        <defs>
          <radialGradient id="numerologyBg" cx="50%" cy="45%" r="75%">
            <stop offset="0%" stopColor="#5c4313" />
            <stop offset="60%" stopColor="#201707" />
            <stop offset="100%" stopColor="#090806" />
          </radialGradient>
          <linearGradient id="numerologyLine" x1="0" x2="1">
            <stop offset="0%" stopColor="#a8751c" />
            <stop offset="50%" stopColor="#ffe08a" />
            <stop offset="100%" stopColor="#a8751c" />
          </linearGradient>
          <filter id="numerologyGlow">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="520" height="360" rx="28" fill="url(#numerologyBg)" />
        <g fill="none" stroke="url(#numerologyLine)" opacity="0.75">
          <circle cx="260" cy="180" r="126" strokeWidth="2" />
          <circle cx="260" cy="180" r="94" strokeWidth="1.5" />
          <path d="M260 54L369 243H151Z" strokeWidth="2" />
          <path d="M151 117H369L260 306Z" strokeWidth="1.5" />
        </g>

        <g fill="#e8c66d" opacity="0.85" fontFamily="Georgia, serif" fontSize="28" textAnchor="middle">
          <text x="260" y="86">1</text>
          <text x="350" y="140">3</text>
          <text x="350" y="238">5</text>
          <text x="260" y="288">7</text>
          <text x="170" y="238">9</text>
          <text x="170" y="140">2</text>
        </g>

        <circle cx="260" cy="180" r="58" fill="#120d06" stroke="#efc85f" strokeWidth="2" filter="url(#numerologyGlow)" />
        <text x="260" y="207" fill="#ffe59a" fontFamily="Georgia, serif" fontSize="92" textAnchor="middle">7</text>

        <g fill="#e5bd55">
          <circle cx="90" cy="82" r="4" />
          <circle cx="432" cy="90" r="3" />
          <circle cx="432" cy="280" r="4" />
          <circle cx="88" cy="286" r="3" />
        </g>
      </svg>
    );
  }

  if (visual === "tarot") {
    return (
      <svg
        className="booking-service-artwork-svg"
        viewBox="0 0 520 360"
        role="img"
        aria-label={language === "hi" ? "टैरो संबंधी चित्र" : "Mystical tarot artwork"}
      >
        <defs>
          <radialGradient id="tarotBg" cx="50%" cy="50%" r="75%">
            <stop offset="0%" stopColor="#634b18" />
            <stop offset="58%" stopColor="#251807" />
            <stop offset="100%" stopColor="#090806" />
          </radialGradient>
          <linearGradient id="tarotCard" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#30220d" />
            <stop offset="100%" stopColor="#0d0a05" />
          </linearGradient>
          <filter id="tarotGlow">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="520" height="360" rx="28" fill="url(#tarotBg)" />

        <g transform="translate(260 182)">
          <rect x="-94" y="-132" width="188" height="264" rx="16" fill="url(#tarotCard)" stroke="#e0b84f" strokeWidth="4" transform="rotate(-13)" />
          <rect x="-94" y="-132" width="188" height="264" rx="16" fill="url(#tarotCard)" stroke="#f1cb6b" strokeWidth="4" transform="rotate(13)" />
          <rect x="-94" y="-132" width="188" height="264" rx="16" fill="url(#tarotCard)" stroke="#ffe19a" strokeWidth="4" filter="url(#tarotGlow)" />

          <circle r="55" fill="none" stroke="#e3bc59" strokeWidth="2" />
          <path d="M0-72L17-22L69-22L27 9L43 59L0 29L-43 59L-27 9L-69-22L-17-22Z" fill="none" stroke="#e8c766" strokeWidth="2" />
          <circle r="17" fill="#e5c15c" />
          <path d="M0-43V43M-43 0H43" stroke="#fff0b5" strokeWidth="2" opacity="0.75" />
        </g>

        <g fill="#f0cf78">
          <circle cx="95" cy="92" r="4" />
          <circle cx="430" cy="78" r="3" />
          <circle cx="95" cy="276" r="3" />
          <circle cx="430" cy="274" r="4" />
        </g>
      </svg>
    );
  }

  return (
    <svg
      className="booking-service-artwork-svg"
      viewBox="0 0 520 360"
      role="img"
      aria-label={language === "hi" ? "रहस्यमय परामर्श चित्र" : "Mystical consultation artwork"}
    >
      <defs>
        <radialGradient id="genericBg" cx="50%" cy="50%" r="75%">
          <stop offset="0%" stopColor="#604615" />
          <stop offset="60%" stopColor="#211606" />
          <stop offset="100%" stopColor="#090806" />
        </radialGradient>
      </defs>
      <rect width="520" height="360" rx="28" fill="url(#genericBg)" />
      <circle cx="260" cy="180" r="112" fill="none" stroke="#e2bc59" strokeWidth="2" />
      <circle cx="260" cy="180" r="72" fill="none" stroke="#f0cf7a" strokeWidth="1.5" />
      <path d="M260 68L292 148L378 148L309 198L335 282L260 232L185 282L211 198L142 148L228 148Z" fill="none" stroke="#e5c05e" strokeWidth="2" />
      <circle cx="260" cy="180" r="24" fill="#f1cc67" />
    </svg>
  );
}

export default function ServiceSelector({
  services,
  selectedServiceId,
  onSelect,
}: ServiceSelectorProps) {
  const { language } = useLanguage();
  const isHindi = language === "hi";

  const [selectingServiceId, setSelectingServiceId] =
    useState<string | null>(null);

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleSelect = (serviceId: string) => {
    if (selectingServiceId) return;
    if (selectedServiceId === serviceId) return;

    setSelectingServiceId(serviceId);
    onSelect(serviceId);

    timeoutRef.current = setTimeout(() => {
      setSelectingServiceId(null);
    }, 350);
  };

  const activeServices = services.filter(
    (service) => service.active
  );

  return (
    <div
      className="booking-services"
      role="list"
      aria-label={isHindi ? "उपलब्ध परामर्श सेवाएँ" : "Available consultation services"}
    >
      {activeServices.map((service) => {
        const isSelected = selectedServiceId === service.id;
        const isSelecting = selectingServiceId === service.id;

        return (
          <button
            key={service.id}
            type="button"
            role="listitem"
            className={`booking-service-card ${
              isSelected ? "booking-service-card-selected" : ""
            } ${isSelecting ? "booking-service-card-selecting" : ""}`}
            onClick={() => handleSelect(service.id)}
            disabled={Boolean(selectingServiceId) && !isSelecting}
            aria-pressed={isSelected}
            aria-label={isHindi ? `${service.name} चुनें` : `Select ${service.name}`}
          >
            <span className="booking-service-artwork" aria-hidden="true">
              <span className="booking-service-artwork-shadow" />
              <span className="booking-service-artwork-frame">
                <ServiceArtwork
                  category={service.category}
                  language={language}
                />
              </span>
            </span>

            <span className="booking-service-holder">
              <span className="booking-service-holder-emblem" aria-hidden="true">
                ✦
              </span>

              <span className="booking-service-content">
                <span className="booking-service-category">
                  {service.category}
                </span>

                <span className="booking-service-title">
                  {service.name}
                </span>

                <span className="booking-service-description">
                  {service.description}
                </span>
              </span>

              <span className="booking-service-select" aria-hidden="true">
                {isSelected
                  ? isHindi
                    ? "चयनित ✓"
                    : "Selected ✓"
                  : isSelecting
                    ? isHindi
                      ? "चयन हो रहा है..."
                      : "Selecting..."
                    : isHindi
                      ? "चुनें →"
                      : "Select →"}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
