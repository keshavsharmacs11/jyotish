"use client";

import Link from "next/link";
import Image from "next/image";
import { useLanguage } from "@/context/LanguageContext";

export default function Footer() {
  const { language, t } = useLanguage();

  const quickLinks =
    language === "hi"
      ? [
          {
            label: "होम",
            href: "/",
          },
          {
            label: "हमारे बारे में",
            href: "/about",
          },
          {
            label: "सेवाएँ",
            href: "/services",
          },
          {
            label: "शॉप",
            href: "/shop",
          },
          {
            label: "संपर्क करें",
            href: "/contact",
          },
        ]
      : [
          {
            label: "Home",
            href: "/",
          },
          {
            label: "About",
            href: "/about",
          },
          {
            label: "Services",
            href: "/services",
          },
          {
            label: "Shop",
            href: "/shop",
          },
          {
            label: "Contact",
            href: "/contact",
          },
        ];

  const services =
    language === "hi"
      ? [
          "वैदिक ज्योतिष",
          "अंक ज्योतिष",
          "टैरो रीडिंग",
          "करियर मार्गदर्शन",
        ]
      : [
          "Vedic Astrology",
          "Numerology",
          "Tarot Reading",
          "Career Guidance",
        ];

  return (
    <footer className="footer">
      <div className="site-container">

        <div className="footer-grid">

          {/* ======================================
              BRAND
          ====================================== */}

          <div>
            <div className="footer-logo-wrapper">
              <Image
                src="/images/brand/logo-navbar.png"
                alt="Akshaanshh Jyotish"
                width={180}
                height={70}
                className="footer-logo"
              />
            </div>

            <p className="footer-description">
              {t("footer.description")}
            </p>
          </div>

          {/* ======================================
              QUICK LINKS
          ====================================== */}

          <div>
            <h3>
              {t("footer.quickLinks")}
            </h3>

            <ul>
              {quickLinks.map((item) => (
                <li key={item.href}>
                  <Link href={item.href}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* ======================================
              SERVICES
          ====================================== */}

          <div>
            <h3>
              {t("footer.services")}
            </h3>

            <ul>
              {services.map((service) => (
                <li key={service}>
                  {service}
                </li>
              ))}
            </ul>
          </div>

          {/* ======================================
              CONTACT
          ====================================== */}

          <div>
            <h3>
              {t("footer.contact")}
            </h3>

            <ul>
              <li>
                📞 +91 XXXXX XXXXX
              </li>

              <li>
                ✉{" "}
                <a
                  href="mailto:info.akshaanshhjyotish@gmail.com"
                >
                  info.akshaanshhjyotish@gmail.com
                </a>
              </li>

              <li>
                📍{" "}
                {language === "hi"
                  ? "भारत"
                  : "India"}
              </li>
            </ul>
          </div>

        </div>

        {/* ======================================
            FOOTER BOTTOM
        ====================================== */}

        <div className="footer-bottom">
          © {new Date().getFullYear()}{" "}
          Akshaanshh Jyotish.{" "}
          {t("footer.copyright")}
        </div>

      </div>
    </footer>
  );
}