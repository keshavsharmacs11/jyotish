import PageHero from "@/components/shared/PageHero";
import Footer from "@/components/layout/Footer";

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="ABOUT US"
        title="Meet the People Behind Akshaanshh Jyotish"
        description="We combine traditional Vedic Astrology, Numerology and Tarot to provide practical guidance for life's most important decisions."
      />

      <section className="section">
        <div className="site-container">

          <h2 className="section-heading">
            About This Page
          </h2>

          <p className="section-description">
            This page will soon include our story,
            philosophy, mission, experience,
            certifications and the journey behind
            Akshaanshh Jyotish.
          </p>

        </div>
      </section>

      <Footer />
    </>
  );
}