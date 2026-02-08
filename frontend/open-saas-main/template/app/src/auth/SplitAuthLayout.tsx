import { ReactNode } from "react";
import LetterGlitch from "../client/components/react-bits/LetterGlitch";

export function SplitAuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="container relative h-screen flex-col items-center justify-center grid lg:max-w-none lg:grid-cols-2 lg:px-0">
      <div className="relative hidden h-full flex-col bg-black p-10 text-white lg:flex dark:border-r overflow-hidden">
        <div className="absolute inset-0 bg-zinc-900" />
        <div className="absolute inset-0">
           <LetterGlitch
            glitchSpeed={50}
            centerVignette={true}
            outerVignette={true}
            smooth={true}
            glitchColors={['#E947F5', '#2F4BA2', '#000000']}
            characters="ABCDEFGHIJKLMNOPQRSTUVWXYZ!@#$&*()-_+=/[]{};:<>.,0123456789"
          />
        </div>
        <div className="relative z-20 flex items-center justify-center h-full">
           <img src="/securetag-white.png" alt="SecureTag" className="w-1/2 object-contain drop-shadow-[0_0_15px_rgba(233,71,245,0.5)]" />
        </div>
        <div className="relative z-20 mt-auto hidden">
          <blockquote className="space-y-2">
            <p className="text-lg">
              "Security is not a product, but a process."
            </p>
            <footer className="text-sm">Bruce Schneier</footer>
          </blockquote>
        </div>
      </div>
      <div className="lg:p-8 bg-black h-full flex items-center">
        <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
          {children}
        </div>
      </div>
    </div>
  );
}
