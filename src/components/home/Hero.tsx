import Image from "next/image";
import Button from "@/components/ui/Button";
import Floating from "@/components/ui/Floating";
import SlideLeft from "@/components/ui/SlideLeft";
import SlideRight from "@/components/ui/SlideRight";
import { siteContent } from "@/data/site";

export default function Hero() {
  const { hero } = siteContent;

  return (
    <section className="hero">
      <div className="hero-orbit hero-orbit-one" />
      <div className="hero-orbit hero-orbit-two" />

      <div className="site-container hero-grid">

        {/* LEFT */}
        <SlideLeft>
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

              <Button href="/book">
                {hero.primaryButton}
              </Button>

              <Button
                href="/services"
                variant="secondary"
              >
                {hero.secondaryButton}
              </Button>

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
        </SlideLeft>

        {/* RIGHT */}
        <SlideRight>
          <div className="hero-visual">

            <div className="hero-zodiac">
              ✦
            </div>

            <Floating>
              <div className="hero-image-wrapper">

             <Image
              src="/images/consultants/main.jpg"
              alt="Deepak Ji and Shweta Ji"
              width={900}
              height={900}
              priority
              className="hero-image"
            />

              </div>
            </Floating>

            <div className="consultant-label">

              <strong>
                Personal Consultation
              </strong>

              <span>
                Astrology • Numerology • Tarot
              </span>

            </div>

          </div>
        </SlideRight>

      </div>
    </section>
  );
}