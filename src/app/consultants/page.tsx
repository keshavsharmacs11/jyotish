"use client";

import { useEffect, useState } from "react";

import PageHero from "@/components/shared/PageHero";
import Footer from "@/components/layout/Footer";

type Consultant = {
  _id: string;
  name: string;
  photo?: string;
  specialization: string;
  availableModes: ("video" | "voice")[];
};

export default function ConsultantsPage() {
  const [consultants, setConsultants] = useState<Consultant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadConsultants() {
      try {
        const response = await fetch(
          "/api/consultants",
          {
            cache: "no-store",
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
              "Unable to load consultants."
          );
        }

        if (mounted) {
          setConsultants(
            data.consultants || []
          );
        }
      } catch (error) {
        console.error(
          "Consultants page error:",
          error
        );

        if (mounted) {
          setConsultants([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadConsultants();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <>
      <PageHero
        eyebrow="OUR CONSULTANTS"
        title="Experienced Experts Dedicated to Your Success"
        description="Meet our experienced consultants who combine years of practical knowledge with traditional Vedic wisdom to provide personalized guidance."
      />

      <section className="section">
        <div className="site-container">

          {loading ? (
            <div className="consultants-loading">
              <p>Loading consultants...</p>
            </div>
          ) : (
            <div className="about-grid">

              {consultants.map(
                (consultant) => (
                  <div
                    key={consultant._id}
                    className="about-card"
                  >

                    {consultant.photo ? (
                      <img
                        src={consultant.photo}
                        alt={consultant.name}
                        className="about-image"
                      />
                    ) : (
                      <div className="consultant-photo-placeholder">
                        <span>
                          {consultant.name
                            .charAt(0)
                            .toUpperCase()}
                        </span>
                      </div>
                    )}

                    <h3>
                      {consultant.name}
                    </h3>

                    <p>
                      {consultant.specialization}
                    </p>

                    <div className="consultant-modes">

                      {consultant.availableModes.includes(
                        "video"
                      ) && (
                        <span>
                          • Video
                        </span>
                      )}

                      {consultant.availableModes.includes(
                        "voice"
                      ) && (
                        <span>
                          • Voice
                        </span>
                      )}

                    </div>

                  </div>
                )
              )}

            </div>
          )}

        </div>
      </section>

      <Footer />
    </>
  );
}