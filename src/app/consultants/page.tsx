import PageHero from "@/components/shared/PageHero";
import Footer from "@/components/layout/Footer";
import Image from "next/image";

export default function ConsultantsPage() {
  return (
    <>
      <PageHero
        eyebrow="OUR CONSULTANTS"
        title="Experienced Experts Dedicated to Your Success"
        description="Meet our experienced consultants who combine years of practical knowledge with traditional Vedic wisdom to provide personalized guidance."
      />

      <section className="section">
        <div className="site-container">

          <div className="about-grid">

            <div className="about-card">

              <Image
                src="/images/consultants/deepak.jpg"
                alt="Deepak Ji"
                width={500}
                height={600}
                className="about-image"
              />

              <h3>Deepak Ji</h3>

              <p>
                Vedic Astrology, Career Guidance,
                Business Consultation
              </p>

            </div>

            <div className="about-card">

              <Image
                src="/images/consultants/shweta.jpg"
                alt="Shweta Ji"
                width={500}
                height={600}
                className="about-image"
              />

              <h3>Shweta Ji</h3>

              <p>
                Numerology, Tarot Reading,
                Relationship Guidance
              </p>

            </div>

          </div>

        </div>
      </section>

      <Footer />
    </>
  );
}