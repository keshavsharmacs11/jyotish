import Button from "@/components/ui/Button";

export default function CTA() {
  return (
    <section className="section">
      <div className="site-container">

        <div className="cta-box">

          <p className="eyebrow">
            BEGIN YOUR JOURNEY
          </p>

          <h2 className="section-heading">
            Receive Personal Guidance For Life's Important Decisions
          </h2>

          <p className="cta-description">
            Whether it is career, marriage, business or personal growth,
            schedule a one-to-one consultation and receive guidance tailored
            specifically for you.
          </p>

          <div className="cta-actions">

            <Button href="/book">
              Book Consultation
            </Button>

            <Button
              href="/services"
              variant="secondary"
            >
              Explore Services
            </Button>

          </div>

        </div>

      </div>
    </section>
  );
}