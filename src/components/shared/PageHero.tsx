import Link from "next/link";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export default function PageHero({
  eyebrow,
  title,
  description,
}: PageHeroProps) {
  return (
    <section className="page-hero">
      <div className="site-container">

        <p className="eyebrow">
          {eyebrow}
        </p>

        <h1 className="display-heading">
          {title}
        </h1>

        <p className="page-description">
          {description}
        </p>

        <div className="page-actions">

          <Link
            href="/book"
            className="btn btn-primary"
          >
            Book Consultation
          </Link>

          <Link
            href="/contact"
            className="btn btn-outline"
          >
            Contact Us
          </Link>

        </div>

      </div>
    </section>
  );
}