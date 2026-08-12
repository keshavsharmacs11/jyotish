"use client";

import { useState } from "react";

import PageHero from "@/components/shared/PageHero";
import Footer from "@/components/layout/Footer";
import ServiceSelector from "@/components/booking/ServiceSelector";
import ConsultationModeSelector from "@/components/booking/ConsultationModeSelector";
import { BookingMode } from "@/types/booking";
import { services } from "@/data/services";

export default function BookPage() {
  const [selectedServiceId, setSelectedServiceId] =
    useState<string | null>(null);

    const [selectedMode, setSelectedMode] =
  useState<BookingMode | null>(null);

  return (
    <>
      <PageHero
        eyebrow="BOOK CONSULTATION"
        title="Choose Your Consultation"
        description="Select the consultation that best matches your needs. You will be able to choose your consultation mode, date and available time slot in the next steps."
      />

      <section className="section">
        <div className="site-container">

          <div className="booking-header">

            <p className="eyebrow">
              STEP 1
            </p>

            <h2 className="section-heading">
              Select a Service
            </h2>

            <p className="section-description">
              Choose the consultation you would like
              to book.
            </p>

          </div>

          <ServiceSelector
            services={services}
            selectedServiceId={selectedServiceId}
            onSelect={setSelectedServiceId}
          />

          {selectedServiceId && (
  <div className="booking-step">

    <div className="booking-header">

      <p className="eyebrow">
        STEP 2
      </p>

      <h2 className="section-heading">
        Choose Consultation Mode
      </h2>

      <p className="section-description">
        Select how you would like to have your
        consultation.
      </p>

    </div>

    <ConsultationModeSelector
      selectedMode={selectedMode}
            availableModes={
        services
          .find(
            (service) =>
              service.id === selectedServiceId
          )
          ?.availableModes?.filter(
            (mode): mode is BookingMode =>
              mode === "video" ||
              mode === "voice"
          ) ?? []
      }
      onSelect={setSelectedMode}
    />

  </div>
)}

          {selectedServiceId && (
            <div className="booking-next">

              <button
                type="button"
                className="btn btn-primary"
              >
                Continue →
              </button>

            </div>
          )}

        </div>
      </section>

      <Footer />
    </>
  );
}