import PageHero from "@/components/shared/PageHero";
import Footer from "@/components/layout/Footer";

export default function ContactPage() {
  return (
    <>
      <PageHero
        eyebrow="CONTACT US"
        title="Let's Start Your Journey"
        description="We're here to answer your questions and help you choose the right consultation service."
      />

      <section className="section">
        <div className="site-container">

          <div className="trust-grid">

            <div className="trust-card">
              <h3>Phone</h3>
              <p>+91 XXXXX XXXXX</p>
            </div>

            <div className="trust-card">
              <h3>Email</h3>
              <p>contact@akshaanshhjyotish.com</p>
            </div>

            <div className="trust-card">
              <h3>Location</h3>
              <p>India</p>
            </div>

          </div>

        </div>
      </section>

      <Footer />
    </>
  );
}