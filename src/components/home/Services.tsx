import { siteContent } from "@/data/site";

export default function Services() {
  const { services } = siteContent;

  return (
    <section className="section">
      <div className="site-container">

        <p className="eyebrow">
          {services.eyebrow}
        </p>

        <h2 className="section-heading">
          {services.title}
        </h2>

        <div className="services-grid">

          {services.items.map((service) => (
            <div
              key={service.title}
              className="service-card"
            >
              <h3>{service.title}</h3>

              <p>{service.description}</p>

              <button className="btn btn-primary">
                Learn More
              </button>
            </div>
          ))}

        </div>

      </div>
    </section>
  );
}