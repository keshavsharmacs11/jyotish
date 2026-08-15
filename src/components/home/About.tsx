import { siteContent } from "@/data/site";
import FadeIn from "@/components/ui/FadeIn";

export default function About() {
  const { about } = siteContent;

  return (
    <FadeIn>
      <section className="section">
        <div className="site-container">

          <div className="about-content">

            <p className="eyebrow">
              {about.eyebrow}
            </p>

            <h2 className="section-heading">
              {about.title}
            </h2>

            <p className="about-description">
              {about.description}
            </p>

          </div>

        </div>
      </section>
    </FadeIn>
  );
}