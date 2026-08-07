import Link from "next/link";
import PageHero from "@/components/shared/PageHero";
import Footer from "@/components/layout/Footer";

export default function BookPage() {
  return (
    <>
      <PageHero
        eyebrow="BOOK CONSULTATION"
        title="Book Your Consultation"
        description="Choose your preferred consultation and we'll guide you through the booking process."
      />

      <section className="section">
        <div className="site-container">

          <div className="surface-card"
            style={{
              padding: "60px",
              textAlign: "center",
            }}
          >

            <h2 className="section-heading">
              Booking System Coming Next
            </h2>

            <p
              style={{
                maxWidth: "650px",
                margin: "24px auto",
                color: "var(--color-muted)",
              }}
            >
              In the next phase you'll be able to
              choose a consultant, select a service,
              pick an available date and time, and
              confirm your booking online.
            </p>

            <Link
              href="/services"
              className="btn btn-primary"
            >
              Explore Services
            </Link>

          </div>

        </div>
      </section>

      <Footer />
    </>
  );
}