import Hero from "@/components/home/Hero";
import Trust from "@/components/home/Trust";
import Achievements from "@/components/home/Achievements";
import Services from "@/components/home/Services";
import Process from "@/components/home/Process";
import Testimonials from "@/components/home/Testimonials";
import FAQ from "@/components/home/FAQ";
import CTA from "@/components/home/CTA";
import DeferredAstrologyWelcomePopup from "@/components/home/DeferredAstrologyWelcomePopup";

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

      <DeferredAstrologyWelcomePopup />
    </main>
  );
}