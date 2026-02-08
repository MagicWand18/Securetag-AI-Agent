
import { useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardTitle,
  CardDescription,
} from "../../client/components/ui/card";
import SectionTitle from "./SectionTitle";
import { Quote, User, Terminal } from "lucide-react";

interface Testimonial {
  name: string;
  role: string;
  avatarSrc: string;
  socialUrl: string;
  quote: string;
}

export default function Testimonials({
  testimonials,
}: {
  testimonials: Testimonial[];
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const shouldShowExpand = testimonials.length > 5;
  const mobileItemsToShow = 3;
  const itemsToShow =
    shouldShowExpand && !isExpanded ? mobileItemsToShow : testimonials.length;

  return (
    <div className="mx-auto mt-32 max-w-7xl sm:mt-56 sm:px-6 lg:px-8 relative z-10">
      <SectionTitle 
        title="Intercepted Communications" 
        description="Decrypted field reports from active agents."
      />

      <div className="relative z-10 w-full columns-1 gap-6 px-4 md:columns-2 md:gap-8 md:px-0 lg:columns-3">
        {testimonials.slice(0, itemsToShow).map((testimonial, idx) => (
          <div key={idx} className="mb-6 break-inside-avoid">
            <Card className="flex flex-col justify-between bg-white/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 dark:hover:border-blue-500/50 transition-all duration-300 group overflow-hidden relative shadow-sm dark:shadow-none">
              {/* Noise Overlay */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(30,41,59,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.05)_1px,transparent_1px)] dark:bg-[linear-gradient(rgba(30,41,59,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(30,41,59,0.1)_1px,transparent_1px)] bg-[size:4px_4px] opacity-20 pointer-events-none" />
              
              {/* Header decorativo */}
              <div className="h-1 w-full bg-gradient-to-r from-slate-200 to-transparent dark:from-slate-800 dark:to-transparent group-hover:from-blue-500/50 transition-colors" />
              
              <CardContent className="p-6 relative">
                <Quote className="absolute top-4 right-4 h-8 w-8 text-slate-200 dark:text-slate-800 group-hover:text-blue-900/20 dark:group-hover:text-blue-900/40 transition-colors" />
                
                <div className="flex items-center gap-2 mb-4 text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                    <Terminal className="w-3 h-3" />
                    <span>COMM_LOG_{1000 + idx}</span>
                    <span className="text-slate-300 dark:text-slate-700">|</span>
                    <span>ENCRYPTED</span>
                </div>

                <blockquote className="mb-4 leading-relaxed text-slate-700 dark:text-slate-300 font-mono text-sm border-l-2 border-slate-200 dark:border-slate-800 pl-4 group-hover:border-blue-500/30 transition-colors">
                  <p>"{testimonial.quote}"</p>
                </blockquote>
              </CardContent>
              
              <CardFooter className="flex flex-col pt-0 pb-6 px-6">
                <a
                  href={testimonial.socialUrl}
                  className="group/author flex w-full items-center gap-x-3 transition-all duration-200"
                >
                  <div className="relative">
                      <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-sm opacity-0 group-hover/author:opacity-100 transition-opacity" />
                      <div className="relative h-10 w-10 flex items-center justify-center rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 group-hover/author:border-blue-400 transition-colors">
                        <User className="h-6 w-6 text-slate-400 dark:text-slate-500 group-hover/author:text-blue-400 transition-colors" />
                      </div>
                  </div>
                  
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-sm font-semibold text-slate-900 dark:text-slate-200 font-mono group-hover/author:text-blue-600 dark:group-hover/author:text-blue-400 transition-colors">
                      {testimonial.name}
                    </CardTitle>
                    <CardDescription className="truncate text-xs text-slate-500 font-mono">
                      {testimonial.role}
                    </CardDescription>
                  </div>
                </a>
              </CardFooter>
            </Card>
          </div>
        ))}
      </div>

      {shouldShowExpand && (
        <div className="mt-12 flex justify-center">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="group relative px-6 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-mono text-xs uppercase tracking-widest hover:text-slate-900 dark:hover:text-white hover:border-blue-500 transition-all overflow-hidden"
          >
            <span className="relative z-10">
                {isExpanded
                ? "Terminating Feed..."
                : `Load ${testimonials.length - mobileItemsToShow} More Logs`}
            </span>
            <div className="absolute inset-0 bg-blue-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
          </button>
        </div>
      )}
    </div>
  );
}
