import Hero from "@/components/home/Hero";
import Trust from "@/components/home/Trust";
import Achievements from "@/components/home/Achievements";
import Services from "@/components/home/Services";
import Process from "@/components/home/Process";
import Testimonials from "@/components/home/Testimonials";
import FAQ from "@/components/home/FAQ";
import CTA from "@/components/home/CTA";
import AstrologyWelcomePopup from "@/components/home/AstrologyWelcomePopup";

export default function Home() {
  return (
    <main>
      <Hero />

      <Trust />

      <Achievements />

      <Services />

      <Process />

      <Testimonials />

      <FAQ />

      <CTA />

      <AstrologyWelcomePopup />
    </main>
  );
}