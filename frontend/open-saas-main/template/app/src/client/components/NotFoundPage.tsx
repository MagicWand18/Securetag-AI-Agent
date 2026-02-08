import { useAuth } from "wasp/client/auth";
import { Link as WaspRouterLink, routes } from "wasp/client/router";
import FuzzyText from "./react-bits/FuzzyText";

export function NotFoundPage() {
  const { data: user } = useAuth();

  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white relative overflow-hidden">
      {/* Background Grid */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: 'linear-gradient(rgba(47, 75, 162, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(47, 75, 162, 0.2) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }}
      />
      
      <div className="text-center relative z-10 flex flex-col items-center">
        <div className="mb-8">
           <FuzzyText 
            baseIntensity={0.2} 
            hoverIntensity={0.5} 
            enableHover={true}
            fontSize="clamp(4rem, 12vw, 12rem)"
            color="#E947F5"
          >
            404
          </FuzzyText>
        </div>
        
        <h2 className="text-2xl font-mono mb-4 text-blue-400 uppercase tracking-widest">
          &gt; SYSTEM_FAILURE: TARGET_NOT_FOUND
        </h2>
        
        <p className="text-slate-400 mb-8 text-lg font-mono max-w-md mx-auto">
          The requested sector is corrupted or does not exist in the current grid coordinates.
        </p>

        <WaspRouterLink
          to={user ? routes.DashboardRoute.to : routes.LandingPageRoute.to}
          className="group relative inline-flex items-center justify-center px-8 py-3 font-mono font-bold text-white transition-all duration-300 bg-transparent border border-blue-500 hover:bg-blue-500/10"
        >
          <span className="absolute inset-0 w-full h-full -mt-1 rounded-lg opacity-30 bg-gradient-to-b from-transparent via-transparent to-blue-500/20"></span>
          <span className="relative flex items-center gap-2">
            <span className="text-blue-500 group-hover:text-white transition-colors duration-300">&lt;</span>
            RETURN_TO_BASE
            <span className="text-blue-500 group-hover:text-white transition-colors duration-300">/&gt;</span>
          </span>
        </WaspRouterLink>
      </div>
    </div>
  );
}
