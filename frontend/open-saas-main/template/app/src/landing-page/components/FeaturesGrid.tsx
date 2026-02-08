
import React from "react";
import {
  Card,
  CardContent,
} from "../../client/components/ui/card";
import { cn } from "../../client/utils";
import { Feature } from "./Features";
import SectionTitle from "./SectionTitle";

export interface GridFeature extends Omit<Feature, "icon"> {
  icon?: React.ReactNode;
  emoji?: string;
  direction?: "col" | "row" | "col-reverse" | "row-reverse";
  align?: "center" | "left";
  size: "small" | "medium" | "large";
  fullWidthIcon?: boolean;
}

interface FeaturesGridProps {
  features: GridFeature[];
  className?: string;
}

const FeaturesGrid = ({ features, className = "" }: FeaturesGridProps) => {
  return (
    <div
      className="mx-auto my-24 flex max-w-7xl flex-col gap-12 md:my-32 lg:my-40 relative z-10"
      id="features"
    >
      <SectionTitle
        title="System Modules"
        description="Operational capabilities and tactical advantages."
      />
      
      <div
        className={cn(
          "mx-4 grid auto-rows-[minmax(180px,auto)] grid-cols-1 gap-6 md:mx-6 md:grid-cols-4 lg:mx-8 lg:grid-cols-6",
          className,
        )}
      >
        {features.map((feature, index) => (
          <FeaturesGridItem
            key={feature.name + index}
            {...feature}
            index={index}
          />
        ))}
      </div>
    </div>
  );
};

function FeaturesGridItem({
  name,
  description,
  icon,
  emoji,
  href,
  direction = "col",
  align = "center",
  size = "medium",
  fullWidthIcon = true,
  index,
}: GridFeature & { index: number }) {
  const gridFeatureSizeToClasses: Record<GridFeature["size"], string> = {
    small: "col-span-1 md:col-span-2 lg:col-span-2",
    medium: "col-span-1 md:col-span-2 lg:col-span-2",
    large: "col-span-1 md:col-span-4 lg:col-span-4 row-span-2",
  };

  return (
    <Card
      className={cn(
        "group relative h-full min-h-[180px] overflow-hidden border border-slate-800 bg-slate-950 transition-all duration-500 hover:border-blue-500/50 hover:shadow-[0_0_30px_-10px_rgba(59,130,246,0.3)]",
        gridFeatureSizeToClasses[size],
      )}
    >
      {/* Decorative Corners */}
      <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-slate-700 group-hover:border-blue-400 transition-colors" />
      <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-slate-700 group-hover:border-blue-400 transition-colors" />
      <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-slate-700 group-hover:border-blue-400 transition-colors" />
      <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-slate-700 group-hover:border-blue-400 transition-colors" />

      {/* Scanline Effect on Hover */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-500/0 via-blue-500/5 to-blue-500/0 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-1000 pointer-events-none" />

      <CardContent className="flex h-full flex-col items-start justify-between p-6 relative z-10">
        <div className="w-full flex justify-between items-start mb-4">
          <div className="text-slate-400 font-mono text-[10px] tracking-widest uppercase group-hover:text-blue-400 transition-colors">
            MOD_0{index + 1}
          </div>
          {icon || emoji ? (
             <div className="text-slate-400 group-hover:text-blue-400 group-hover:scale-110 transition-all duration-300">
               {icon || <span className="text-2xl">{emoji}</span>}
             </div>
          ) : null}
        </div>

        <div>
          <h4 className="text-lg font-bold text-white mb-2 group-hover:text-blue-200 transition-colors">
            {name}
          </h4>
          <p className="text-sm text-slate-400 leading-relaxed group-hover:text-slate-300 transition-colors">
            {description}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default FeaturesGrid;
