import Image from "next/image";
import { siteContent } from "@/data/site";

export default function About() {
  const { about } = siteContent;

  return (
    <section className="section">
      <div className="site-container">

        <p className="eyebrow">
          {about.eyebrow}
        </p>

        <h2 className="section-heading">
          {about.title}
        </h2>

        <p className="section-description">
          {about.description}
        </p>

        <div className="about-grid">
          {about.consultants.map((consultant) => (
            <div
              key={consultant.name}
              className="about-card"
            >
              <Image
                src={consultant.image}
                alt={consultant.name}
                width={300}
                height={350}
                className="about-image"
              />

              <h3>{consultant.name}</h3>

              <p>{consultant.role}</p>

              <button className="btn btn-primary">
                Book Consultation
              </button>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}