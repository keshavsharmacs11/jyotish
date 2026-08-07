import PageHero from "@/components/shared/PageHero";
import Footer from "@/components/layout/Footer";

export default function ServicesPage() {
  return (
    <>
      <PageHero
        eyebrow="OUR SERVICES"
        title="Professional Astrology & Numerology Services"
        description="Discover personalized consultation services designed for career, relationships, marriage, business and personal growth."
      />

      <section className="section">
        <div className="site-container">

          <h2 className="section-heading">
            Detailed Services Coming Next
          </h2>

          <p className="section-description">
            Every consultation service will have its
            own dedicated section with complete
            information and online booking.
          </p>

        </div>
      </section>

      <Footer />
    </>
  );
}