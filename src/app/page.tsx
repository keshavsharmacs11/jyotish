import Hero from "@/components/home/Hero";
import Trust from "@/components/home/Trust";
import Services from "@/components/home/Services";
import Process from "@/components/home/Process";
import Consultants from "@/components/home/Consultants";
import Testimonials from "@/components/home/Testimonials";
import FAQ from "@/components/home/FAQ";
import CTA from "@/components/home/CTA";
import Footer from "@/components/layout/Footer";

export default function Home() {
  return (
    <main>
      <Hero />

      <Trust />

      <Services />

      <Consultants />

      <Process />

      <Testimonials />

      <FAQ />

      <CTA />

      <Footer />
    </main>
  );
}