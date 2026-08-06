import FadeIn from "@/components/ui/FadeIn";

export default function Process() {
  const steps = [
    {
      number: "01",
      title: "Choose Your Service",
      description:
        "Select the consultation service that best matches your requirements.",
    },
    {
      number: "02",
      title: "Book Your Slot",
      description:
        "Choose a convenient date and time for your consultation.",
    },
    {
      number: "03",
      title: "Connect With Our Expert",
      description:
        "Join your consultation through your preferred communication method.",
    },
    {
      number: "04",
      title: "Receive Personalized Guidance",
      description:
        "Get practical insights and recommendations tailored to your situation.",
    },
  ];

  return (
    <FadeIn>
      <section className="section">
        <div className="site-container">
          <p className="eyebrow">HOW IT WORKS</p>

          <h2 className="section-heading">
            Book Your Consultation in Four Simple Steps
          </h2>

          <div className="process-grid">
            {steps.map((step) => (
              <div key={step.number} className="process-card">
                <div className="process-number">
                  {step.number}
                </div>

                <h3>{step.title}</h3>

                <p>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </FadeIn>
  );
}