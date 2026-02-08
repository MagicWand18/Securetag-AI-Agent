
import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "../../client/components/ui/card";
import { cn } from "../../client/utils";
import SectionTitle from "./SectionTitle";

const EXAMPLES_CAROUSEL_INTERVAL = 4000; // Un poco más lento para apreciar detalles
const EXAMPLES_CAROUSEL_SCROLL_TIMEOUT = 200;

interface ExampleApp {
  name: string;
  description: string;
  imageSrc: string;
  href: string;
}

const ExamplesCarousel = ({ examples }: { examples: ExampleApp[] }) => {
  const [currentExample, setCurrentExample] = useState(0);
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      {
        threshold: 0.5,
        rootMargin: "-200px 0px -100px 0px",
      },
    );

    if (containerRef.current) {
      observerRef.current.observe(containerRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (isInView && examples.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentExample((prev) => (prev + 1) % examples.length);
      }, EXAMPLES_CAROUSEL_INTERVAL);
    }

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      if (scrollContainerRef.current) {
        const scrollContainer = scrollContainerRef.current;
        const targetCard = scrollContainer.children[currentExample] as
          | HTMLElement
          | undefined;

        if (targetCard) {
          const containerRect = scrollContainer.getBoundingClientRect();
          const cardRect = targetCard.getBoundingClientRect();
          const scrollLeft =
            targetCard.offsetLeft -
            scrollContainer.offsetLeft -
            containerRect.width / 2 +
            cardRect.width / 2;

          scrollContainer.scrollTo({
            left: scrollLeft,
            behavior: "smooth",
          });
        }
      }
    }, EXAMPLES_CAROUSEL_SCROLL_TIMEOUT);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [isInView, examples.length, currentExample]);

  const handleMouseEnter = (index: number) => {
    setCurrentExample(index);

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    if (isInView && examples.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentExample((prev) => (prev + 1) % examples.length);
      }, EXAMPLES_CAROUSEL_INTERVAL);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full py-24 overflow-hidden bg-slate-950/30"
    >
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] opacity-[0.05] pointer-events-none" />
      
      <SectionTitle 
        title="Mission Archives" 
        description="Successful operations and case studies."
      />

      <div
        ref={scrollContainerRef}
        className="flex w-full overflow-x-auto snap-x snap-mandatory gap-8 px-[50vw] pb-12 pt-4 no-scrollbar"
        style={{ scrollBehavior: "smooth" }}
      >
        {examples.map((example, index) => {
            const isActive = index === currentExample;
            return (
            <div
                key={index}
                className="snap-center shrink-0"
                onMouseEnter={() => handleMouseEnter(index)}
            >
                <Card
                className={cn(
                    "w-[300px] md:w-[450px] overflow-hidden transition-all duration-500 ease-out border-slate-800 bg-slate-900 group cursor-pointer",
                    isActive 
                        ? "scale-100 opacity-100 border-blue-500/50 shadow-[0_0_50px_-12px_rgba(59,130,246,0.2)]" 
                        : "scale-90 opacity-40 hover:opacity-60 grayscale"
                )}
                >
                <div className="relative aspect-video overflow-hidden bg-slate-950">
                    <img
                        src={example.imageSrc}
                        alt={example.name}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    
                    {/* Overlay Grid */}
                    <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-20 pointer-events-none" />
                    
                    {/* Active State Overlay */}
                    {!isActive && (
                        <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px]" />
                    )}
                </div>

                <CardContent className="p-6 relative">
                    <div className="flex justify-between items-start mb-2">
                        <div className="text-[10px] font-mono text-blue-400 uppercase tracking-wider mb-1">
                            CASE_FILE_0{index + 1}
                        </div>
                        {isActive && (
                             <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                        )}
                    </div>
                    
                    <h3 className={cn(
                        "text-xl font-bold mb-2 transition-colors",
                        isActive ? "text-white" : "text-slate-400"
                    )}>
                        {example.name}
                    </h3>
                    
                    <p className="text-sm text-slate-500 line-clamp-2 font-mono">
                        {example.description}
                    </p>
                </CardContent>
                </Card>
            </div>
            );
        })}
      </div>
      
      {/* Navigation Indicators */}
      <div className="flex justify-center gap-2 mt-8">
          {examples.map((_, idx) => (
              <button
                  key={idx}
                  onClick={() => handleMouseEnter(idx)}
                  className={cn(
                      "h-1 transition-all duration-300 rounded-full",
                      idx === currentExample 
                          ? "w-8 bg-blue-500" 
                          : "w-2 bg-slate-700 hover:bg-slate-600"
                  )}
                  aria-label={`Go to slide ${idx + 1}`}
              />
          ))}
      </div>
    </div>
  );
};

export default ExamplesCarousel;
