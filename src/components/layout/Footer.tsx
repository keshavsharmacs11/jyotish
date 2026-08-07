import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="footer">
      <div className="site-container">

        <div className="footer-grid">

          {/* Brand */}

          <div>

            <Image
              src="/images/brand/logo.png"
              alt="Akshaanshh Jyotish"
              width={180}
              height={70}
              className="footer-logo"
            />

            <p className="footer-description">
              Personalized Astrology, Numerology and Tarot
              consultations to help you make confident
              decisions in life.
            </p>

          </div>

          {/* Quick Links */}

          <div>

            <h3>Quick Links</h3>

            <ul>

              <li><Link href="/">Home</Link></li>

              <li><Link href="/about">About</Link></li>

              <li><Link href="/services">Services</Link></li>

              <li><Link href="/contact">Contact</Link></li>

            </ul>

          </div>

          {/* Services */}

          <div>

            <h3>Services</h3>

            <ul>

              <li>Vedic Astrology</li>

              <li>Numerology</li>

              <li>Tarot Reading</li>

              <li>Career Guidance</li>

            </ul>

          </div>

          {/* Contact */}

          <div>

            <h3>Contact</h3>

            <ul>

              <li>📞 +91 XXXXX XXXXX</li>

              <li>✉ contact@akshaanshhjyotish.com</li>

              <li>📍 India</li>

            </ul>

          </div>

        </div>

        <div className="footer-bottom">

          © {new Date().getFullYear()} Akshaanshh Jyotish.
          All Rights Reserved.

        </div>

      </div>
    </footer>
  );
}