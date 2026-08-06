import Image from "next/image";
import Link from "next/link";
import { siteContent } from "@/data/site";

export default function Hero() {
    const { hero } = siteContent;
  return (
    <section className="hero">
      <div className="hero-orbit hero-orbit-one" />
      <div className="hero-orbit hero-orbit-two" />

      <div className="site-container hero-grid">

        {/* LEFT */}

        <div className="hero-content">

          <p className="eyebrow hero-eyebrow">
           {hero.eyebrow}
          </p>

          <h1 className="display-heading hero-title">
            {hero.title}
          </h1>

          <p className="hero-description">
            {hero.description}
          </p>

          <div className="hero-actions">

            <Link href="/book" className="btn btn-primary">
             {hero.primaryButton}
            </Link>

            <Link href="/services" className="btn hero-secondary">
              {hero.secondaryButton}
            </Link>

          </div>

          <div className="hero-trust">

            <div>
              <strong>Personal Guidance</strong>
              <span>One-to-One Sessions</span>
            </div>

            <div>
              <strong>Confidential</strong>
              <span>Private Consultation</span>
            </div>

            <div>
              <strong>Online</strong>
              <span>Anywhere in India</span>
            </div>

          </div>

        </div>

        {/* RIGHT */}

        <div className="hero-visual">

          <div className="hero-zodiac">
            ✦
          </div>

          <div className="hero-image-wrapper">

            <Image
              src="/images/consultants/consultants.png"
              alt="Consultant"
              width={650}
              height={700}
              priority
              className="hero-image"
            />

          </div>

          <div className="consultant-label">

            <strong>
              Personal Consultation
            </strong>

            <span>
              Astrology • Numerology • Tarot
            </span>

          </div>

        </div>

      </div>
    </section>
  );
}