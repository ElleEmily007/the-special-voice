import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import TrustBar from "@/components/TrustBar";
import HowItWorks from "@/components/HowItWorks";
import PricingTable from "@/components/PricingTable";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import BottomCTA from "@/components/BottomCTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <TrustBar />
        <HowItWorks />
        <PricingTable />
        <Testimonials />
        <FAQ />
        <BottomCTA />
      </main>
      <Footer />
    </>
  );
}
