import Hero from "@/components/home/Hero";
import Trust from "@/components/home/Trust";
import Services from "@/components/home/Services";
import About from "@/components/home/About";
import Process from "@/components/home/Process";
import Testimonials from "@/components/home/Testimonials";
import FAQ from "@/components/home/FAQ";
import CTA from "@/components/home/CTA";

export default function Home() {
  return (
    <main>
      <Hero />
      <Trust />
      <Services />
      <About />
      <Process />
      <Testimonials />
      <FAQ />
      <CTA />
    </main>
  );
}