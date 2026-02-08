
import SectionTitle from "./SectionTitle";
import { cn } from "../../client/utils";

export interface Feature {
  name: string;
  description: string;
  icon: string;
  href: string;
}

export default function Features({ features }: { features: Feature[] }) {
  return (
    <div id="features" className="mx-auto mt-48 max-w-7xl px-6 lg:px-8 relative">
       {/* Background Grid */}
       <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] opacity-40 dark:opacity-[0.05] pointer-events-none -z-10" />

      <SectionTitle
        title="Core Protocols"
        description="Essential capabilities for mission success."
      />
      
      <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-5xl">
        <dl className="grid max-w-xl grid-cols-1 gap-x-12 gap-y-16 lg:max-w-none lg:grid-cols-2">
          {features.map((feature, index) => (
            <div key={feature.name} className="relative pl-20 group">
                {/* Connector Line */}
                <div className="absolute left-9 top-10 bottom-[-64px] w-px bg-slate-200 dark:bg-slate-800 group-last:hidden lg:group-even:hidden" />

              <dt className="text-base font-semibold leading-7 text-slate-900 dark:text-white transition-colors">
                <div className="absolute left-0 top-0 flex h-14 w-14 items-center justify-center rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 group-hover:border-blue-500/50 group-hover:shadow-[0_0_20px_-5px_rgba(59,130,246,0.3)] transition-all duration-300">
                  <div className="text-2xl group-hover:scale-110 transition-transform duration-300">
                      {feature.icon}
                  </div>
                  
                  {/* Corner Accents */}
                  <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-slate-300 dark:border-slate-700 group-hover:border-blue-400 transition-colors rounded-tl-xl" />
                  <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-slate-300 dark:border-slate-700 group-hover:border-blue-400 transition-colors rounded-br-xl" />
                </div>
                
                <span className="text-lg tracking-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {feature.name}
                </span>
              </dt>
              
              <dd className="mt-2 text-base leading-7 text-slate-600 dark:text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-300 transition-colors">
                {feature.description}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
