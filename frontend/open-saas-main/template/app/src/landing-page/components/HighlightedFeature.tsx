import { cn } from "../../client/utils";
import ScrambledText from "../../client/components/react-bits/ScrambledText";

interface FeatureProps {
  name: string;
  description: string | React.ReactNode;
  direction?: "row" | "row-reverse";
  highlightedComponent: React.ReactNode;
  tilt?: "left" | "right";
}

/**
 * A component that highlights a feature with a description and a highlighted component.
 * Redesigned with a "Classified Case File" aesthetic.
 */
const HighlightedFeature = ({
  name,
  description,
  direction = "row",
  highlightedComponent,
  tilt,
}: FeatureProps) => {
  return (
    <div
      className={cn(
        "my-32 mx-auto flex max-w-7xl flex-col items-center justify-between gap-16 px-6 lg:px-8 relative",
        direction === "row" ? "lg:flex-row" : "lg:flex-row-reverse"
      )}
    >
      {/* Background Connector Line */}
      <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-200 dark:bg-slate-800/50 -z-10 hidden lg:block transition-colors" />

      <div className="flex-1 flex flex-col gap-6 relative">
        {/* Decorative Marker */}
        <div className="absolute -left-4 top-0 w-1 h-12 bg-blue-500/50 rounded-full hidden lg:block" />
        
        <div className="flex items-center gap-3">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 uppercase tracking-wider transition-colors">
                Classified
            </span>
            <span className="h-px w-12 bg-slate-300 dark:bg-slate-700 transition-colors" />
        </div>

        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight transition-colors cursor-default">
            <ScrambledText>{name}</ScrambledText>
        </h2>
        
        <div className="text-black dark:text-slate-400 text-lg leading-relaxed border-l-2 border-slate-200 dark:border-slate-800 pl-6 transition-colors">
            {typeof description === "string" ? (
            <p>{description}</p>
            ) : (
            description
            )}
        </div>
      </div>

      <div
        className={cn(
          "flex w-full flex-1 items-center justify-center relative perspective-1000",
        )}
      >
        {/* HUD Frame around component */}
        <div className="relative w-full max-w-xl group">
             {/* Corner Accents */}
            <div className="absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 border-slate-300 dark:border-slate-600 group-hover:border-blue-500 transition-colors z-20" />
            <div className="absolute -top-2 -right-2 w-6 h-6 border-t-2 border-r-2 border-slate-300 dark:border-slate-600 group-hover:border-blue-500 transition-colors z-20" />
            <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-2 border-l-2 border-slate-300 dark:border-slate-600 group-hover:border-blue-500 transition-colors z-20" />
            <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 border-slate-300 dark:border-slate-600 group-hover:border-blue-500 transition-colors z-20" />

            {/* Content Container with slight glass effect */}
            <div className="relative bg-white/50 dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200 dark:border-slate-800 rounded-lg p-2 overflow-hidden shadow-2xl transition-colors">
                 {/* Grid overlay */}
                <div className="absolute inset-0 bg-[linear-gradient(rgba(30,41,59,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.05)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(30,41,59,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.2)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none transition-opacity" />
                
                <div className="relative z-10 transition-transform duration-500 ease-out group-hover:scale-[1.02]">
                    {highlightedComponent}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default HighlightedFeature;
