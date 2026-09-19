import type { Metadata } from "next";
import {
  Cormorant_Garamond,
  Manrope,
} from "next/font/google";

import ScrollToTop from "@/components/utils/ScrollToTop";
import SiteChrome from "@/components/layout/SiteChrome";
import { LanguageProvider } from "@/context/LanguageContext";

import "./globals.css";

const headingFont = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const bodyFont = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title:
    "Akshaanshh Jyotish | Astrology Consultation",

  description:
    "Personalized astrology, numerology and tarot consultations for clarity in life, career and relationships.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body
        className={`${headingFont.variable} ${bodyFont.variable}`}
      >
        <LanguageProvider>
          <ScrollToTop />

          <SiteChrome>
            {children}
          </SiteChrome>
        </LanguageProvider>
      </body>
    </html>
  );
}