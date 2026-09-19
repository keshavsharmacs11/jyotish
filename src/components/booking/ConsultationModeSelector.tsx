"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import { BookingMode } from "@/types/booking";
import { useLanguage } from "@/context/LanguageContext";

type ConsultationModeSelectorProps = {
  selectedMode: BookingMode | null;
  availableModes: BookingMode[];
  onSelect: (
    mode: BookingMode
  ) => void;
};

const modeDetails: Record<
  BookingMode,
  {
    icon: string;
    title: {
      en: string;
      hi: string;
    };
    description: {
      en: string;
      hi: string;
    };
    methods: string;
  }
> = {
  video: {
    icon: "◉",
    title: {
      en: "Video Call",
      hi: "वीडियो कॉल",
    },
    description: {
      en: "A personal live consultation through video.",
      hi: "वीडियो के माध्यम से व्यक्तिगत लाइव परामर्श।",
    },
    methods:
      "Google Meet / WhatsApp Video",
  },

  voice: {
    icon: "◌",
    title: {
      en: "Voice Call",
      hi: "वॉइस कॉल",
    },
    description: {
      en: "A private consultation through a voice call.",
      hi: "वॉइस कॉल के माध्यम से निजी परामर्श।",
    },
    methods:
      "Phone / WhatsApp Call",
  },
};

export default function ConsultationModeSelector({
  selectedMode,
  availableModes,
  onSelect,
}: ConsultationModeSelectorProps) {
  const { language } = useLanguage();
  const isHindi = language === "hi";

  const [
    selectingMode,
    setSelectingMode,
  ] =
    useState<BookingMode | null>(
      null
    );

  const timeoutRef =
    useRef<ReturnType<
      typeof setTimeout
    > | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(
          timeoutRef.current
        );
      }
    };
  }, []);

  const handleSelect = (
    mode: BookingMode
  ) => {
    /*
     * Prevent rapid repeated clicks while
     * the selection transition is running.
     */

    if (selectingMode) {
      return;
    }

    /*
     * Clicking the already selected mode
     * should not trigger another transition.
     */

    if (selectedMode === mode) {
      return;
    }

    setSelectingMode(mode);

    onSelect(mode);

    /*
     * Brief interaction lock.
     *
     * The parent page is responsible for
     * moving the user to the next section.
     */

    timeoutRef.current =
      setTimeout(() => {
        setSelectingMode(null);
      }, 350);
  };

  return (
    <div
      className="booking-modes"
      role="list"
      aria-label={
        isHindi
          ? "परामर्श के माध्यम"
          : "Consultation modes"
      }
    >
      {availableModes.map(
        (mode) => {
          const details =
            modeDetails[mode];

          const title = isHindi
            ? details.title.hi
            : details.title.en;

          const description = isHindi
            ? details.description.hi
            : details.description.en;

          const isSelected =
            selectedMode === mode;

          const isSelecting =
            selectingMode === mode;

          return (
            <button
              key={mode}
              type="button"
              role="listitem"
              className={`booking-mode-card ${
                isSelected
                  ? "booking-mode-card-selected"
                  : ""
              } ${
                isSelecting
                  ? "booking-mode-card-selecting"
                  : ""
              }`}
              onClick={() =>
                handleSelect(mode)
              }
              disabled={
                Boolean(
                  selectingMode
                ) &&
                !isSelecting
              }
              aria-pressed={
                isSelected
              }
              aria-label={
                isHindi
                  ? `${title} चुनें`
                  : `Select ${title}`
              }
            >
              <div
                className="booking-mode-icon"
                aria-hidden="true"
              >
                {details.icon}
              </div>

              <div className="booking-mode-content">
                <h3>
                  {title}
                </h3>

                <p>
                  {description}
                </p>

                <span>
                  {details.methods}
                </span>
              </div>

              <div
                className="booking-mode-check"
                aria-hidden="true"
              >
                {isSelected
                  ? "✓"
                  : isSelecting
                  ? "…"
                  : ""}
              </div>
            </button>
          );
        }
      )}
    </div>
  );
}
