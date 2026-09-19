/* src/components/services/ServiceFinderModal.tsx */
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type ServiceFinderModalProps = {
  open: boolean;
  onClose: () => void;
};

type Service = {
  serviceId?: string;
  name?: string;
  category?: string;
  description?: string;
  duration?: number | null;
  currency?: string;
  price?: number;
  availableModes?: string[];
  active?: boolean;
};

const concernOptions = [
  { id: "relationships", icon: "♡", label: "Love & relationships" },
  { id: "career", icon: "✦", label: "Career & studies" },
  { id: "business", icon: "◈", label: "Business & money" },
  { id: "family", icon: "⌂", label: "Family & home" },
  { id: "direction", icon: "☽", label: "Life direction" },
  { id: "clarity", icon: "◇", label: "Something else" },
] as const;

function normalize(value?: string) {
  return String(value || "").toLowerCase().trim();
}

function scoreService(service: Service, concern: string, question: string) {
  const text = normalize(`${service.name} ${service.category} ${service.description}`);
  const words = normalize(question).split(/[^a-z0-9]+/).filter((word) => word.length > 2);
  let score = 0;

  words.forEach((word) => {
    if (text.includes(word)) score += 4;
  });

  // The concern itself is used only as a lightweight signal; the actual
  // service recommendation always comes from the live /api/services data.
  const concernWords: Record<string, string[]> = {
    relationships: ["love", "relationship", "marriage", "compatibility", "partner"],
    career: ["career", "profession", "job", "study", "education", "exam"],
    business: ["business", "money", "finance", "wealth", "investment"],
    family: ["family", "home", "house", "parents"],
    direction: ["life", "future", "direction", "decision", "growth"],
    clarity: ["clarity", "guidance", "question", "choice", "decision"],
  };

  (concernWords[concern] || []).forEach((word) => {
    if (text.includes(word)) score += 2;
  });

  return score;
}

function formatPrice(price?: number, currency = "INR") {
  if (typeof price !== "number" || Number.isNaN(price)) return "";
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 0 }).format(price);
  } catch {
    return `${currency} ${price.toLocaleString("en-IN")}`;
  }
}

function categoryLabel(category?: string) {
  const value = String(category || "").trim();
  if (!value) return "Consultation";
  return value.replace(/[-_]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function ServiceFinderModal({
  open,
  onClose,
}: ServiceFinderModalProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [problem, setProblem] = useState("");
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);

  useEffect(() => {
    if (!open) return;

    setSelected(null);
    setProblem("");

    let cancelled = false;

    async function loadServices() {
      try {
        setLoadingServices(true);

        const response = await fetch("/api/services", {
          method: "GET",
          cache: "no-store",
        });

        const data = await response.json();

        if (!cancelled && response.ok && data.success) {
          setServices(
            Array.isArray(data.services)
              ? data.services.filter((service: any) => service.active !== false)
              : []
          );
        }
      } catch (error) {
        console.error("SERVICE FINDER ERROR:", error);
      } finally {
        if (!cancelled) setLoadingServices(false);
      }
    }

    loadServices();

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const selectedOption = concernOptions.find((option) => option.id === selected);

  const rankedServices = selectedOption
    ? [...services].sort(
        (a, b) => scoreService(b, selectedOption.id, problem) - scoreService(a, selectedOption.id, problem)
      )
    : [];

  const recommendedService = rankedServices[0] || null;
  const recommendationLabel = selectedOption
    ? `Based on what you shared about ${selectedOption.label.toLowerCase()}.`
    : "A consultation selected around your question.";

  return (
    <div
      className="service-finder-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        id="service-finder-dialog"
        className="service-finder-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="service-finder-title"
      >
        <button
          type="button"
          className="service-finder-close"
          onClick={onClose}
          aria-label="Close service finder"
        >
          ×
        </button>

        {!selectedOption ? (
          <>
            <div className="service-finder-heading">
              <span className="eyebrow">FIND YOUR GUIDANCE</span>
              <h2 id="service-finder-title">
                Let&apos;s find what fits you.
              </h2>
              <p>
                Pick what is on your mind, then tell us briefly what you want
                clarity on. We&apos;ll match you with the best active consultation.
              </p>
            </div>

            <div className="service-finder-options">
              {concernOptions.map((option) => (
                <button
                  type="button"
                  className="service-finder-option"
                  key={option.id}
                  onClick={() => setSelected(option.id)}
                >
                  <span className="service-finder-option-icon" aria-hidden="true">
                    {option.icon}
                  </span>
                  <span className="service-finder-option-copy">
                    <strong>{option.label}</strong>
                    <small>Explore guidance around this area</small>
                  </span>
                  <span className="service-finder-option-arrow" aria-hidden="true">
                    →
                  </span>
                </button>
              ))}
            </div>

            <div className="service-finder-footer-note">
              <span aria-hidden="true">✦</span>
              Your choice is only used to guide the recommendation.
            </div>
          </>
        ) : (
          <>
            <div className="service-finder-heading service-finder-heading-result">
              <span className="eyebrow">YOUR QUESTION</span>
              <h2 id="service-finder-title">
                A good place to begin.
              </h2>
              <p>{recommendationLabel}</p>
            </div>

            <label className="service-finder-problem">
              <span>Tell us what is on your mind</span>
              <textarea
                value={problem}
                onChange={(event) => setProblem(event.target.value)}
                placeholder="For example: I am thinking about changing jobs and want some direction..."
                rows={3}
              />
            </label>

            {loadingServices ? (
              <div className="service-finder-result-state">
                <span className="services-page-spinner" />
                <p>Finding the best available consultation...</p>
              </div>
            ) : recommendedService ? (
              <div className="service-finder-result">
                <div className="service-finder-result-icon" aria-hidden="true">
{selectedOption?.icon || "✦"}
                </div>

                <div className="service-finder-result-copy">
                  <span>
{categoryLabel(recommendedService.category)}
                  </span>

                  <h3>{recommendedService.name}</h3>

                  <p>
                    {recommendedService.description ||
                      "A personalised consultation designed around your question."}
                  </p>

                  <div className="service-finder-result-meta">
                    {recommendedService.duration ? (
                      <span>{recommendedService.duration} min</span>
                    ) : null}
                    {formatPrice(recommendedService.price, recommendedService.currency) ? (
                      <span>{formatPrice(recommendedService.price, recommendedService.currency)}</span>
                    ) : null}
                    {Array.isArray(recommendedService.availableModes) &&
                    recommendedService.availableModes.length > 0 ? (
                      <span>
                        {recommendedService.availableModes
                          .map((mode: string) =>
                            mode === "video" ? "Video" : "Voice"
                          )
                          .join(" / ")}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <div className="service-finder-result-state">
                <strong>We couldn&apos;t match an active service.</strong>
                <p>
                  You can view all available consultations or contact us for
                  help choosing.
                </p>
              </div>
            )}

            <div className="service-finder-result-actions">
              {recommendedService?.serviceId ? (
                <Link
                  href={`/book?service=${encodeURIComponent(
                    recommendedService.serviceId
                  )}`}
                  className="btn btn-primary"
                  onClick={onClose}
                >
                  Book This Consultation →
                </Link>
              ) : (
                <Link
                  href="/book"
                  className="btn btn-primary"
                  onClick={onClose}
                >
                  View All Services →
                </Link>
              )}

              <button
                type="button"
                className="service-finder-back"
                onClick={() => {
                  setSelected(null);
                  setProblem("");
                }}
              >
                ← Choose another
              </button>
            </div>

            <div className="service-finder-disclaimer">
              This is a guidance tool, not a diagnosis or a guarantee of
              outcomes. The recommendation is based on the area you selected.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
