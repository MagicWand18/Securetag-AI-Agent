import { Code, FileCode, FileJson, Terminal } from "lucide-react";
import LogoLoop from "../../client/components/react-bits/LogoLoop";

const languages = [
  { name: "Apex", icon: "salesforce" },
  { name: "Bash", icon: "bash" },
  { name: "C", icon: "c" },
  { name: "C++", icon: "cplusplus" },
  { name: "C#", icon: "csharp" },
  { name: "Clojure", icon: "clojure" },
  { name: "Dart", icon: "dart" },
  { name: "Dockerfile", icon: "docker" },
  { name: "Elixir", icon: "elixir" },
  { name: "HTML", icon: "html5" },
  { name: "Go", icon: "go" },
  { name: "Java", icon: "java" },
  { name: "JavaScript", icon: "javascript" },
  { name: "JSX", icon: "react" },
  { name: "JSON", icon: "json" }, // May not have icon, fallback handled
  { name: "Julia", icon: "julia" },
  { name: "Jsonnet", icon: "json" },
  { name: "Kotlin", icon: "kotlin" },
  { name: "Lisp", icon: "labview" }, // Placeholder or use text
  { name: "Lua", icon: "lua" },
  { name: "OCaml", icon: "ocaml" },
  { name: "PHP", icon: "php" },
  { name: "Python", icon: "python" },
  { name: "R", icon: "r" },
  { name: "Ruby", icon: "ruby" },
  { name: "Rust", icon: "rust" },
  { name: "Scala", icon: "scala" },
  { name: "Scheme", icon: "haskell" }, // Approx
  { name: "Solidity", icon: "solidity" },
  { name: "Swift", icon: "swift" },
  { name: "Terraform", icon: "terraform" },
  { name: "TypeScript", icon: "typescript" },
  { name: "TSX", icon: "react" },
  { name: "YAML", icon: "yaml" }, // May need fallback
  { name: "XML", icon: "xml" },
  { name: "Generic", icon: "generic" },
];

export default function Clients() {
  const logoItems = languages.map((lang) => ({
    node: (
      <div
        className="group relative flex flex-col items-center justify-center p-2 transition-all duration-300"
        title={lang.name}
      >
        {/* Hover Glow Effect */}
        <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/10 blur-md transition-colors duration-300 rounded-lg" />
        
        <div className="relative h-20 w-20 flex items-center justify-center transition-all duration-300 grayscale opacity-60 group-hover:grayscale-0 group-hover:opacity-100 group-hover:scale-110">
          {lang.name === "Generic" ? (
             <Code className="h-14 w-14 text-slate-600 dark:text-slate-400 group-hover:text-blue-500" />
          ) : (
            <img 
              src={`https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${lang.icon}/${lang.icon}-original.svg`} 
              alt={lang.name}
              className="h-16 w-16 object-contain"
              onError={(e) => {
                // Fallback for missing icons
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement?.classList.add('fallback-icon');
              }}
            />
          )}
          {/* Fallback Icon (Hidden by default, shown if img fails) */}
          <div className="hidden fallback-icon:flex items-center justify-center">
              <Terminal className="h-14 w-14 text-slate-400" />
          </div>
        </div>
        <span className="mt-2 text-[10px] font-mono text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-4 whitespace-nowrap">
          {lang.name}
        </span>
      </div>
    ),
    title: lang.name,
  }));

  return (
    <div className="relative border-y border-transparent bg-transparent py-32 overflow-hidden transition-colors duration-300">
      {/* Background Elements */}
      <div className="absolute inset-0 dark:bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] opacity-20 dark:opacity-[0.05] pointer-events-none" />
      
      <div className="mx-auto flex flex-col items-center px-0 lg:px-0 relative z-10 w-full overflow-hidden">
        <h2 className="mt-2 mb-16 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl md:text-5xl font-sans relative inline-block transition-colors text-center">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-600 dark:from-blue-400 dark:to-emerald-400 mr-2 opacity-50">//</span>
          Supported languages
        </h2>

        <div className="w-full relative" style={{ height: '180px', overflow: 'hidden' }}>
          <LogoLoop
            logos={logoItems}
            speed={70}
            direction="left"
            logoHeight={120}
            gap={80}
            hoverSpeed={0}
            scaleOnHover={true}
            fadeOut={false}
            ariaLabel="Supported languages"
          />
        </div>
      </div>
    </div>
  );
}
