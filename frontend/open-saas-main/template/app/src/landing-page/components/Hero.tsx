import { useState, useEffect } from "react";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import { Button } from "../../client/components/ui/button";
import TextType from "../../client/components/react-bits/TextType";
// import LaserFlow from "../../client/components/react-bits/LaserFlow";
import LightPillar from "../../client/components/react-bits/LightPillar";
import { motion } from "framer-motion";
import { Shield, Terminal, Activity, Lock, Server, FileText, ChevronRight, Play } from "lucide-react";
import { cn } from "../../client/utils";

export default function Hero() {
  return (
    <div className="relative w-full min-h-screen bg-white dark:bg-slate-950 overflow-hidden flex flex-col pt-14 transition-colors duration-300">
      <TacticalGrid />
      
      {/* LightPillar Effect - Positioned to span full height and sit behind content */}
      <div className="absolute inset-0 z-0 pointer-events-none">
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

      <div className="absolute inset-0 bg-gradient-to-b from-white/0 dark:from-slate-950/0 via-white/50 dark:via-slate-950/50 to-white dark:to-slate-950 pointer-events-none" />
      
      {/* Main Content */}
      <div className="relative z-10 flex-grow flex flex-col items-center justify-center px-6 lg:px-8 py-12 md:py-20">
        {/* LaserFlow Effect - Positioned to fall through the entire content area */}
        {/* <div className="absolute inset-0 z-[-1] pointer-events-none">
            <LaserFlow 
              horizontalBeamOffset={0} 
              verticalBeamOffset={0.0} 
              color="#797effff" 
            />
        </div> */}

        <div className="relative z-10 w-full mx-auto space-y-54">
          
          {/* Header Section */}
          <div className="text-center space-y-6">

            <h1 className="text-foreground text-5xl md:text-7xl font-bold tracking-tight">
              <span className="block text-slate-900 dark:text-slate-100 mb-2">Advanced AI Security for</span>
              <div className="h-[1.2em] overflow-hidden flex justify-center">
                 <TextType 
                    text={["Critical Infrastructure", "Cloud Native Apps", "Digital Assets"]} 
                    typingSpeed={100}
                    deletingSpeed={50}
                    pauseDuration={2000}
                    loop={true}
                    showCursor={true}
                    cursorCharacter="|"
                    className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300 font-bold inline-block"
                  />
              </div>
            </h1>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="text-black dark:text-slate-400 mx-auto max-w-2xl text-lg md:text-xl leading-relaxed font-light"
            >
              SecureTag Agent provides <span className="text-blue-400 font-medium">real-time threat detection</span> and automated vulnerability analysis for your containerized applications using cognitive AI.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8"
            >
              <Button size="lg" className="h-14 px-8 text-base bg-blue-600 hover:bg-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_30px_rgba(37,99,235,0.5)] border border-blue-400/50 transition-all group" asChild>
                <WaspRouterLink to={routes.SignupRoute.to}>
                  <Shield className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
                  DEPLOY AGENT
                  <ChevronRight className="ml-2 h-4 w-4 opacity-50 group-hover:translate-x-1 transition-transform" />
                </WaspRouterLink>
              </Button>
              
              <Button size="lg" variant="outline" className="h-14 px-8 text-base border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 font-mono" asChild>
                <a href="https://docs.securetag.ai" target="_blank" rel="noreferrer">
                  <Terminal className="mr-2 h-5 w-5 text-slate-500" />
                  {">"} READ_DOCS.md
                </a>
              </Button>
            </motion.div>
          </div>

          {/* Live Monitor Visualization */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="relative mx-auto max-w-4xl w-full"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/20 via-cyan-500/20 to-blue-500/20 blur-xl opacity-50" />
            
            <div className="relative bg-slate-950/90 backdrop-blur-sm border border-slate-800 rounded-lg overflow-hidden shadow-2xl">
              {/* Terminal Header */}
              <div className="relative z-10 flex items-center justify-between px-4 py-2 bg-slate-900/90 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
                  </div>
                  <span className="ml-3 text-xs font-mono text-slate-500">securetag-agent --watch --verbose</span>
                </div>
                <div className="flex items-center gap-3">
                   <div className="flex items-center gap-1.5 text-[10px] font-mono text-green-500/80">
                      <Activity className="h-3 w-3" />
                      LIVE
                   </div>
                </div>
              </div>
              
              {/* Terminal Content */}
              <div className="relative z-10 p-6 font-mono text-sm md:text-base h-[300px] overflow-hidden">
                 <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none"></div>
                 <ScanSimulation />
              </div>
              
              {/* Bottom Status Bar */}
              <div className="relative z-10 px-4 py-2 bg-slate-900/50 border-t border-slate-800 flex justify-between items-center text-[10px] md:text-xs font-mono text-slate-500">
                 <div className="flex gap-4">
                    <span>CPU: <span className="text-blue-400">12%</span></span>
                    <span>MEM: <span className="text-blue-400">342MB</span></span>
                    <span>NET: <span className="text-blue-400">1.2Gbps</span></span>
                 </div>
                 <div>
                    BUILD: <span className="text-slate-300">v2.4.0-stable</span>
                 </div>
              </div>
            </div>
            
            {/* Decorative Corner Accents */}
            <div className="absolute -top-2 -left-2 w-6 h-6 border-t-2 border-l-2 border-blue-500/50 rounded-tl-lg" />
            <div className="absolute -top-2 -right-2 w-6 h-6 border-t-2 border-r-2 border-blue-500/50 rounded-tr-lg" />
            <div className="absolute -bottom-2 -left-2 w-6 h-6 border-b-2 border-l-2 border-blue-500/50 rounded-bl-lg" />
            <div className="absolute -bottom-2 -right-2 w-6 h-6 border-b-2 border-r-2 border-blue-500/50 rounded-br-lg" />
          </motion.div>

        </div>
      </div>

      {/* HUD Footer */}
      <div className="relative z-20 hidden md:block">
        <TacticalHUD />
      </div>
    </div>
  );
}

function TacticalGrid() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
       {/* Horizontal Lines */}
       <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] opacity-[0.1]" />
       {/* Vertical Lines */}
       <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:40px_40px] opacity-[0.1]" />
       
       {/* Radar Sweep Effect */}
       <div className="absolute inset-0 bg-gradient-to-t from-blue-900/5 via-transparent to-transparent animate-pulse" />
    </div>
  );
}

function ScanSimulation() {
  const [lines, setLines] = useState<string[]>([
    "> Initializing SecureTag Core...",
    "> Loading vulnerability definitions (v2025.12.26)...",
    "> Connecting to neural engine...",
    "> TARGET ACQUIRED: production-cluster-01"
  ]);

  useEffect(() => {
    const sequence = [
      { text: "> Scanning image: nginx:latest...", delay: 1000 },
      { text: "> Analyzing layer 3/12 [==============>.......]", delay: 2000 },
      { text: "> DETECTED: CVE-2024-2834 (High Severity) in openssl", delay: 3500, type: 'error' },
      { text: "> AI Analysis: Exploitability verified via reachability check.", delay: 4500, type: 'info' },
      { text: "> Recommendation: Upgrade to openssl 3.1.2", delay: 5500, type: 'success' },
      { text: "> Scanning container configuration...", delay: 7000 },
      { text: "> DETECTED: Privileged mode enabled (Policy Violation)", delay: 8500, type: 'warning' },
    ];

    let timeouts: NodeJS.Timeout[] = [];

    sequence.forEach(({ text, delay, type }) => {
      const timeout = setTimeout(() => {
        setLines(prev => {
          const newLines = [...prev, text];
          if (newLines.length > 8) return newLines.slice(1);
          return newLines;
        });
      }, delay);
      timeouts.push(timeout);
    });

    return () => timeouts.forEach(clearTimeout);
  }, []);

  return (
    <div className="space-y-2 font-mono">
      {lines.map((line, i) => (
        <motion.div 
          key={i}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className={cn(
            "truncate",
            line.includes("DETECTED") ? "text-red-600 dark:text-red-400 font-bold" :
            line.includes("Recommendation") ? "text-green-600 dark:text-green-400" :
            line.includes("AI Analysis") ? "text-blue-600 dark:text-blue-400 italic" :
            "text-slate-600 dark:text-slate-400"
          )}
        >
          {line}
        </motion.div>
      ))}
      <motion.div 
        animate={{ opacity: [0, 1, 0] }}
        transition={{ repeat: Infinity, duration: 0.8 }}
        className="h-4 w-2 bg-blue-500 inline-block align-middle ml-1"
      />
    </div>
  );
}

function TacticalHUD() {
  return (
    <div className="relative z-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur border-t border-slate-200 dark:border-slate-800 py-4 px-6 md:px-12 transition-colors duration-300">
       <div className="relative z-10 max-w-7xl mx-auto flex justify-between items-center text-xs font-mono text-slate-500 uppercase tracking-widest">
          <div className="flex items-center gap-8">
             <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-600">Threats Blocked</span>
                <span className="text-slate-900 dark:text-white font-bold text-sm tabular-nums">1,024,590</span>
             </div>
             <div className="w-px h-8 bg-slate-200 dark:bg-slate-800" />
             <div className="flex flex-col gap-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-600">Active Sensors</span>
                <div className="flex items-center gap-2 text-green-600 dark:text-green-500 font-bold">
                   <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                   ONLINE
                </div>
             </div>
          </div>
          
          <div className="flex items-center gap-8">
             <div className="flex flex-col gap-1 text-right">
                <span className="text-[10px] text-slate-500 dark:text-slate-600">System Integrity</span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">100% SECURE</span>
             </div>
             <div className="w-px h-8 bg-slate-200 dark:bg-slate-800" />
             <div className="flex flex-col gap-1 text-right">
                <span className="text-[10px] text-slate-500 dark:text-slate-600">Latest Defs</span>
                <span className="text-slate-900 dark:text-white">v2025.12.26</span>
             </div>
          </div>
       </div>
    </div>
  );
}
