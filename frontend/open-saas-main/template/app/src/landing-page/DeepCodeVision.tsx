import HighlightedFeature from "./components/HighlightedFeature";
import ScrambledText from "../client/components/react-bits/ScrambledText";
import { CheckCircle2, ShieldAlert, AlertTriangle } from "lucide-react";
import { useState } from "react";

export default function DeepCodeVision() {
  return (
    <HighlightedFeature
      name="Deep Code Vision"
      description={
        <span className="block space-y-4">
          <span>
            <ScrambledText> Standard scanners look at lines in isolation. </ScrambledText>
            <strong className="text-blue-400">
              <ScrambledText>SecureTag.Agent</ScrambledText>
            </strong>
            <ScrambledText> extends the AI context window to analyze surrounding code—imports, middleware, and previous validations.</ScrambledText>
          </span>
          <span className="block text-sm text-black dark:text-slate-500">
            <ScrambledText>*Result: Distinguishes real SQL injection threats from false positives with human-like precision.*</ScrambledText>
          </span>
        </span>
      }
      highlightedComponent={<CodeAnalysisVisual />}
      direction="row"
    />
  );
}

const CodeAnalysisVisual = () => {
  return (
    <div className="w-full bg-slate-950 rounded-lg overflow-hidden border border-slate-800 shadow-2xl font-mono text-xs md:text-sm">
      {/* Window Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/20 border border-red-500/30" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/20 border border-yellow-500/30" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/20 border border-green-500/30" />
        </div>
        <div className="flex items-center gap-4 text-slate-500 text-[10px]">
             <span>scan_target: /src/controllers</span>
             <span className="text-blue-400">--multi-thread</span>
        </div>
      </div>

      {/* Split View Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 bg-slate-950/80">
        
        {/* Left Pane: Unsafe (Command Injection) */}
        <div className="p-4 space-y-2">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/50">
                <span className="text-slate-500 text-[10px]">legacy_sync.js</span>
                <span className="flex items-center gap-1.5 text-red-400 text-[10px] font-bold uppercase tracking-wider bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 animate-pulse">
                    <AlertTriangle className="w-3 h-3" /> CRITICAL
                </span>
            </div>
            
             <div className="flex items-center gap-4 opacity-50">
                 <span className="text-slate-700 select-none w-4">12</span>
                 <span><span className="text-purple-400">const</span> <span className="text-yellow-300">cmd</span> = req.query.cmd;</span>
             </div>
             
             <div className="relative group my-2">
                 <div className="absolute -inset-y-1 -inset-x-4 bg-red-500/10 border-l-2 border-red-500" />
                 <div className="relative flex items-center gap-4">
                     <span className="text-slate-700 select-none w-4">13</span>
                     <span>exec(<span className="text-red-300">`./sync.sh ${"{"}cmd{"}"}`</span>);</span>
                 </div>
             </div>
             
             <div className="text-[10px] text-red-400/80 pl-8">
                ↳ CWE-78: OS Command Injection detected
             </div>
        </div>

        {/* Right Pane: Safe (SQL with Context) */}
        <div className="p-4 space-y-2">
             <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/50">
                <span className="text-slate-500 text-[10px]">auth_service.ts</span>
                <span className="flex items-center gap-1.5 text-green-400 text-[10px] font-bold uppercase tracking-wider bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                    <CheckCircle2 className="w-3 h-3" /> SAFE
                </span>
            </div>
            
            <div className="flex items-center gap-4 opacity-50">
                 <span className="text-slate-700 select-none w-4">45</span>
                 <span><span className="text-purple-400">const</span> <span className="text-yellow-300">uid</span> = Sanitizer.int(input);</span>
            </div>
            
            <div className="relative group my-2">
                 <div className="absolute -inset-y-1 -inset-x-4 bg-blue-500/5 border-l-2 border-blue-500/50" />
                 <div className="relative flex items-center gap-4">
                     <span className="text-slate-700 select-none w-4">46</span>
                     <span className="text-slate-500">// AI CTX: Input sanitized as integer</span>
                 </div>
            </div>
            
            <div className="relative group mt-2">
                 <div className="absolute -inset-y-1 -inset-x-4 bg-green-500/10 border-l-2 border-green-500" />
                 <div className="relative flex items-center gap-4">
                     <span className="text-slate-700 select-none w-4">47</span>
                     <span>query(<span className="text-green-300">`SELECT * FROM users WHERE id=${"{"}uid{"}"}`</span>);</span>
                 </div>
            </div>
        </div>

      </div>
      
      {/* AI Analysis Footer */}
      <div className="px-4 py-2 bg-slate-900/50 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500">
        <div className="flex gap-4">
            <span>Scanned: 2 files</span>
            <span>Threats: 1 found</span>
        </div>
        <span>Thinking Time: 68ms</span>
      </div>
    </div>
  );
};