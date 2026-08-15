"use client";

import {
  useEffect,
  useState,
} from "react";

import FadeIn from "@/components/ui/FadeIn";

type Consultant = {
  _id: string;
  name: string;
  photo?: string;
  specialization: string;
  availableModes: (
    | "video"
    | "voice"
  )[];
};

export default function Consultants() {
  const [
    consultants,
    setConsultants,
  ] = useState<Consultant[]>([]);

  const [loading, setLoading] =
    useState(true);

  /*
   * ============================================
   * LOAD CONSULTANTS
   * ============================================
   */

  useEffect(() => {
    let mounted = true;

    async function loadConsultants() {
      try {
        const response =
          await fetch(
            "/api/consultants",
            {
              cache: "no-store",
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
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
          "Homepage consultants error:",
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

  /*
   * ============================================
   * DON'T SHOW EMPTY SECTION
   * ============================================
   */

  if (
    !loading &&
    consultants.length === 0
  ) {
    return null;
  }

  return (
    <FadeIn>
      <section
        className="section consultants-section"
        id="consultants"
      >
        <div className="site-container">

          {/* ==================================
              HEADER
          ================================== */}

          <div className="consultants-intro">

            <p className="eyebrow">
              OUR CONSULTANTS
            </p>

            <h2 className="section-heading">
              Meet Your Trusted
              Consultants
            </h2>

            <p>
              Meet our experienced
              consultants who combine
              practical knowledge with
              personalized guidance to
              help you find clarity and
              direction.
            </p>

          </div>


          {/* ==================================
              LOADING
          ================================== */}

          {loading ? (

            <div className="consultants-loading">

              <span />

              <p>
                Loading consultants...
              </p>

            </div>

          ) : (

            /* ==================================
               CONSULTANT GRID
            ================================== */

            <div className="consultants-grid">

              {consultants.map(
                (consultant) => (

                  <article
                    key={
                      consultant._id
                    }
                    className="consultant-card"
                  >

                    {/* ==========================
                        PHOTO
                    ========================== */}

                    <div className="consultant-photo-wrapper">

                      {consultant.photo ? (

                        <img
                          src={
                            consultant.photo
                          }
                          alt={`${consultant.name} - ${consultant.specialization}`}
                          className="consultant-photo"
                          loading="lazy"
                        />

                      ) : (

                        <div
                          className="consultant-photo-placeholder"
                          aria-label={`${consultant.name} profile`}
                        >

                          <span>
                            {consultant.name
                              .charAt(0)
                              .toUpperCase()}
                          </span>

                        </div>

                      )}

                      <div className="consultant-photo-glow" />

                    </div>


                    {/* ==========================
                        INFORMATION
                    ========================== */}

                    <div className="consultant-content">

                      <h3>
                        {
                          consultant.name
                        }
                      </h3>

                      <p className="consultant-specialization">
                        {
                          consultant.specialization
                        }
                      </p>


                      {/* ========================
                          CONSULTATION MODES
                      ======================== */}

                      <div className="consultant-modes">

                        {consultant.availableModes.includes(
                          "video"
                        ) && (

                          <span>
                            <i />
                            Video Consultation
                          </span>

                        )}

                        {consultant.availableModes.includes(
                          "voice"
                        ) && (

                          <span>
                            <i />
                            Voice Consultation
                          </span>

                        )}

                      </div>


                      {/* ========================
                          ACTION
                      ======================== */}

            <a
            href="/book"
            className="btn btn-primary consultant-book-button"
            >
            Book Consultation
            </a>

                    </div>

                  </article>

                )
              )}

            </div>

          )}

        </div>
      </section>
    </FadeIn>
  );
}