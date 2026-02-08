
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../../client/components/ui/accordion";
import SectionTitle from "./SectionTitle";
import { Terminal, ChevronRight } from "lucide-react";

interface FAQ {
  id: number;
  question: string;
  answer: string;
  href?: string;
}

export default function FAQ({ faqs }: { faqs: FAQ[] }) {
  return (
    <div className="mx-auto mt-32 max-w-4xl px-6 pb-8 sm:pb-24 sm:pt-12 lg:max-w-7xl lg:px-8 lg:py-32 relative z-10">
      <SectionTitle
        subtitle="Protocol Query"
        title="Knowledge Base"
        description="Frequently accessed protocols and operational data."
      />

      <div className="mx-auto max-w-3xl">
          <div className="border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 rounded-lg overflow-hidden transition-colors duration-300">
             {/* Terminal Header */}
             <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                <div className="ml-2 text-[10px] font-mono text-slate-500">faq_database.json</div>
             </div>

            <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                <AccordionItem
                    key={faq.id}
                    value={`faq-${faq.id}`}
                    className="border-b border-slate-200 dark:border-slate-800 last:border-0 px-0 transition-colors"
                >
                    <AccordionTrigger className="hover:no-underline px-6 py-4 group transition-colors hover:bg-slate-50 dark:hover:bg-slate-900/50">
                        <div className="flex items-center gap-4 text-left">
                             <span className="text-black dark:text-slate-500 font-mono text-xs opacity-50 group-hover:text-blue-600 dark:group-hover:text-blue-500 group-hover:opacity-100 transition-all">
                                {`> root@query_0${index + 1}:`}
                             </span>
                             <span className="text-slate-700 dark:text-slate-200 font-mono text-sm md:text-base group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {faq.question}
                             </span>
                        </div>
                    </AccordionTrigger>
                    
                    <AccordionContent className="px-6 pb-6 pt-2 bg-slate-50 dark:bg-slate-900/30 transition-colors">
                        <div className="flex gap-4">
                            <div className="hidden sm:block w-6 flex-shrink-0 pt-1">
                                <ChevronRight className="w-4 h-4 text-blue-500" />
                            </div>
                            <div className="flex flex-col gap-4">
                                <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base leading-relaxed font-sans">
                                    {faq.answer}
                                </p>
                                {faq.href && (
                                <a
                                    href={faq.href}
                                    className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 text-sm font-mono transition-colors"
                                >
                                    <Terminal className="w-3 h-3" />
                                    <span>EXECUTE_PROTOCOL</span>
                                </a>
                                )}
                            </div>
                        </div>
                    </AccordionContent>
                </AccordionItem>
                ))}
            </Accordion>
        </div>
      </div>
    </div>
  );
}
