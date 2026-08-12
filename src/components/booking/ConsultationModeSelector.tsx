"use client";

import { BookingMode } from "@/types/booking";

type ConsultationModeSelectorProps = {
  selectedMode: BookingMode | null;
  availableModes: BookingMode[];
  onSelect: (mode: BookingMode) => void;
};

const modeDetails: Record<
  BookingMode,
  {
    icon: string;
    title: string;
    description: string;
    methods: string;
  }
> = {
  video: {
    icon: "◉",
    title: "Video Call",
    description:
      "A personal live consultation through video.",
    methods: "Google Meet / WhatsApp Video",
  },

  voice: {
    icon: "◌",
    title: "Voice Call",
    description:
      "A private consultation through a voice call.",
    methods: "Phone / WhatsApp Call",
  },
};

export default function ConsultationModeSelector({
  selectedMode,
  availableModes,
  onSelect,
}: ConsultationModeSelectorProps) {
  return (
    <div className="booking-modes">
      {availableModes.map((mode) => {
        const details = modeDetails[mode];

        const isSelected = selectedMode === mode;

        return (
          <button
            key={mode}
            type="button"
            className={`booking-mode-card ${
              isSelected
                ? "booking-mode-card-selected"
                : ""
            }`}
            onClick={() => onSelect(mode)}
          >
            <div className="booking-mode-icon">
              {details.icon}
            </div>

            <div className="booking-mode-content">
              <h3>{details.title}</h3>

              <p>{details.description}</p>

              <span>{details.methods}</span>
            </div>

            <div className="booking-mode-check">
              {isSelected ? "✓" : ""}
            </div>
          </button>
        );
      })}
    </div>
  );
}