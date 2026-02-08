import ASCIIText from "../components/react-bits/ASCIIText";

export function WafComingSoonPage() {
  return (
    <div className="relative h-screen w-screen bg-black overflow-hidden">
      <div className="absolute inset-0 w-full h-full">
        <ASCIIText text="COMING SOON" enableWaves={true} asciiFontSize={8} textFontSize={20} />
      </div>
      
      <div className="absolute bottom-24 w-full flex justify-center z-10 pointer-events-none">
         <a href="/" className="pointer-events-auto px-8 py-3 rounded-full border border-white/20 text-white/70 hover:text-white hover:border-white/50 hover:bg-white/10 transition-all duration-300 font-mono text-sm group">
           <span className="group-hover:-translate-x-1 transition-transform inline-block duration-300">←</span> RETURN_TO_BASE
         </a>
      </div>
    </div>
  );
}

export function OsintComingSoonPage() {
  return (
    <div className="relative h-screen w-screen bg-black overflow-hidden">
      <div className="absolute inset-0 w-full h-full">
        <ASCIIText text="COMING SOON" enableWaves={true} asciiFontSize={8} textFontSize={20} />
      </div>
      
      <div className="absolute bottom-24 w-full flex justify-center z-10 pointer-events-none">
         <a href="/" className="pointer-events-auto px-8 py-3 rounded-full border border-white/20 text-white/70 hover:text-white hover:border-white/50 hover:bg-white/10 transition-all duration-300 font-mono text-sm group">
           <span className="group-hover:-translate-x-1 transition-transform inline-block duration-300">←</span> RETURN_TO_BASE
         </a>
      </div>
    </div>
  );
}
