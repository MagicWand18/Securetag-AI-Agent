
import { Shield, Lock, Activity } from "lucide-react";

interface NavigationItem {
  name: string;
  href: string;
}

export default function Footer({
  footerNavigation,
}: {
  footerNavigation: {
    app: NavigationItem[];
    company: NavigationItem[];
  };
}) {
  return (
    <div className="relative bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 mt-24 transition-colors duration-300">
       {/* Decorative Top Line */}
       <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-300 dark:via-slate-700 to-transparent" />
       
       {/* Scanline Background */}
       <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] opacity-40 dark:opacity-[0.05] pointer-events-none" />

      <footer
        aria-labelledby="footer-heading"
        className="relative mx-auto max-w-7xl px-6 py-16 lg:px-8 z-10"
      >
        <h2 id="footer-heading" className="sr-only">
          Footer
        </h2>
        
        <div className="flex flex-col md:flex-row justify-between items-start gap-12">
            {/* Branding & Status */}
            <div className="max-w-xs">
                <div className="flex items-center gap-2 mb-6">
                    <Shield className="w-6 h-6 text-blue-600 dark:text-blue-500" />
                    <span className="font-bold text-xl text-slate-900 dark:text-white tracking-tight transition-colors">
                        SecureTag<span className="text-blue-600 dark:text-blue-500">.Agent</span>
                    </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-500 leading-relaxed mb-6 transition-colors">
                    Advanced security protocols for next-generation digital assets. 
                    Securing the perimeter since 2024.
                </p>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-fit transition-colors">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors">
                        System Operational
                    </span>
                </div>
                
                {/* System Metrics */}
                <div className="grid grid-cols-2 gap-x-8 gap-y-4 mt-8 border-t border-slate-200 dark:border-slate-800/50 pt-6 transition-colors">
                    <div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-600 font-mono uppercase tracking-widest mb-1 transition-colors">Uptime</div>
                        <div className="text-sm text-blue-600 dark:text-blue-400 font-mono font-bold transition-colors">99.99%</div>
                    </div>
                    <div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-600 font-mono uppercase tracking-widest mb-1 transition-colors">Threats Blocked</div>
                        <div className="text-sm text-blue-600 dark:text-blue-400 font-mono font-bold transition-colors">1,240,092</div>
                    </div>
                     <div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-600 font-mono uppercase tracking-widest mb-1 transition-colors">Active Nodes</div>
                        <div className="text-sm text-blue-600 dark:text-blue-400 font-mono font-bold transition-colors">42</div>
                    </div>
                     <div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-600 font-mono uppercase tracking-widest mb-1 transition-colors">Latency</div>
                        <div className="text-sm text-blue-600 dark:text-blue-400 font-mono font-bold transition-colors">12ms</div>
                    </div>
                </div>
            </div>

            {/* Navigation Links */}
            <div className="flex gap-16">
                <div>
                    <h3 className="text-xs font-mono font-semibold leading-6 text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-4 transition-colors">
                    Application
                    </h3>
                    <ul role="list" className="space-y-3">
                    {footerNavigation.app.map((item) => (
                        <li key={item.name}>
                        <a
                            href={item.href}
                            className="text-sm leading-6 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all hover:translate-x-1 inline-block duration-200"
                        >
                            {item.name}
                        </a>
                        </li>
                    ))}
                    </ul>
                </div>
                <div>
                    <h3 className="text-xs font-mono font-semibold leading-6 text-blue-600 dark:text-blue-400 uppercase tracking-wider mb-4 transition-colors">
                    Company
                    </h3>
                    <ul role="list" className="space-y-3">
                    {footerNavigation.company.map((item) => (
                        <li key={item.name}>
                        <a
                            href={item.href}
                            className="text-sm leading-6 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all hover:translate-x-1 inline-block duration-200"
                        >
                            {item.name}
                        </a>
                        </li>
                    ))}
                    </ul>
                </div>
            </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-16 pt-8 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 transition-colors">
            <p className="text-xs text-slate-500 dark:text-slate-600 font-mono transition-colors">
                &copy; {new Date().getFullYear()} SecureTag Agent. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
                <Lock className="w-4 h-4 text-slate-400 dark:text-slate-700 transition-colors" />
                <span className="text-[10px] text-slate-500 dark:text-slate-700 font-mono uppercase transition-colors">
                    Encrypted Connection
                </span>
            </div>
        </div>
      </footer>
    </div>
  );
}
