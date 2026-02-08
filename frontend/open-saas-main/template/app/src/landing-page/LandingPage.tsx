
import FAQ from "./components/FAQ";
import FeaturesGrid from "./components/FeaturesGrid";
import Footer from "./components/Footer";
import Hero from "./components/Hero";
import Testimonials from "./components/Testimonials";
import Clients from "./components/Clients"; // Importación añadida
import LightPillar from "../client/components/react-bits/LightPillar";
import {
  faqs,
  features,
  footerNavigation,
  testimonials,
} from "./contentSections";
import DeepCodeVision from "./DeepCodeVision";

export default function LandingPage() {
  return (
    <div className="bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-200 min-h-screen relative overflow-hidden selection:bg-blue-100 selection:text-blue-900 dark:selection:bg-blue-500/30 dark:selection:text-blue-200 transition-colors duration-300">
      {/* LightPillar Global Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
          <LightPillar
            topColor="#5227FF"
            bottomColor="#FF9FFC"
            intensity={1.0}
            rotationSpeed={0.3}
            glowAmount={0.005}
            pillarWidth={3.0}
            pillarHeight={0.4}
            noiseIntensity={0.5}
            pillarRotation={0}
            interactive={false}
            mixBlendMode="normal"
          />
      </div>

      {/* Global Background Noise/Grid */}
      <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px)] bg-[size:100px_100px] opacity-40 dark:opacity-[0.03]" />
          <div className="absolute inset-0 dark:bg-[linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:100px_100px] opacity-40 dark:opacity-[0.03]" />
          
          {/* Global Overlay (Semi-transparent) */}
          <div className="absolute inset-0 bg-white/30 dark:bg-slate-950/30 pointer-events-none transition-colors duration-300" />
      </div>

      <main className="isolate relative z-10">
        <Hero />
        <Clients /> {/* Componente añadido */}
        <DeepCodeVision />
        <FeaturesGrid features={features} />
        <Testimonials testimonials={testimonials} />
        <FAQ faqs={faqs} />
      </main>
      <Footer footerNavigation={footerNavigation} />
    </div>
  );
}
