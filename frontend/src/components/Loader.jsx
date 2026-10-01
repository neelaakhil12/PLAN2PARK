import React from 'react';
import { ShieldCheck } from 'lucide-react';

/**
 * Premium Page/App Refresh Loader Component
 * Shows on hard refresh/initial load with blur and slide effects.
 */
const Loader = () => {
  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#070b14] text-white font-sans overflow-hidden">
      {/* Background radial glow tailored to new logo gradient (blue, violet, pink) */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_50%_45%,rgba(59,130,246,0.18),rgba(147,51,234,0.14)_40%,rgba(236,72,153,0.08)_65%,transparent_75%)]" />
      
      {/* Centered loader console */}
      <div className="relative z-10 flex flex-col items-center gap-6 text-center px-4 animate-fadeIn">
        {/* Animated outer ring and official PlanToPark logo */}
        <div className="relative flex items-center justify-center">
          {/* Ambient colored halo glow */}
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-fuchsia-500 opacity-35 blur-2xl animate-pulse" />
          
          {/* Smooth rotating gradient orbit ring */}
          <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-3xl border-2 border-indigo-500/20 border-t-blue-500 border-r-fuchsia-500 animate-spin [animation-duration:2.5s]" />
          
          {/* Logo container holding official logo */}
          <div className="absolute h-20 w-20 sm:h-24 sm:w-24 rounded-2xl p-1.5 bg-gradient-to-tr from-blue-600/30 via-indigo-600/20 to-fuchsia-600/30 backdrop-blur-md border border-white/10 shadow-2xl shadow-indigo-500/30 flex items-center justify-center">
            <img
              src="/logo.png"
              alt="PlanToPark"
              className="w-full h-full object-contain rounded-xl drop-shadow-[0_8px_16px_rgba(0,0,0,0.6)]"
            />
          </div>
        </div>

        {/* Brand Text */}
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight uppercase bg-gradient-to-r from-blue-400 via-indigo-300 to-fuchsia-400 bg-clip-text text-transparent drop-shadow-sm">
            PlantoPark
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm font-semibold tracking-wide flex items-center justify-center gap-1.5 uppercase">
            <ShieldCheck className="h-4 w-4 text-blue-400" /> Secure P2P Smart City Parking
          </p>
        </div>
        
        {/* Progress bar line */}
        <div className="w-52 h-1.5 bg-slate-800/80 rounded-full overflow-hidden mt-2 shadow-inner">
          <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-fuchsia-500 rounded-full shadow-[0_0_12px_rgba(99,102,241,0.6)] animate-[progress_1.5s_ease-in-out_infinite]" />
        </div>
      </div>

      <style>{`
        @keyframes progress {
          0% { width: 0%; transform: translateX(-20%); }
          50% { width: 60%; }
          100% { width: 100%; transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default Loader;
