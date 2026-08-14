import React from 'react';
import { ShieldCheck, Car } from 'lucide-react';

/**
 * Premium Page/App Refresh Loader Component
 * Shows on hard refresh/initial load with blur and slide effects.
 */
const Loader = () => {
  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-slate-900 text-white font-sans overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.12),transparent_70%)]" />
      
      {/* Centered loader console */}
      <div className="relative z-10 flex flex-col items-center gap-6 text-center px-4 animate-fadeIn">
        {/* Animated outer ring and pulsing car icon */}
        <div className="relative flex items-center justify-center">
          <div className="h-20 w-20 rounded-3xl border-4 border-emerald-500/20 border-t-emerald-500 animate-spin duration-1000" />
          <div className="absolute h-12 w-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-emerald-500/30 animate-pulse">
            <Car className="h-6 w-6 text-white" />
          </div>
        </div>

        {/* Text area */}
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight uppercase bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">
            PlantoPark
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm font-semibold tracking-wide flex items-center justify-center gap-1.5 uppercase">
            <ShieldCheck className="h-4 w-4 text-emerald-400" /> Secure P2P Smart City Parking
          </p>
        </div>
        
        {/* Progress bar line */}
        <div className="w-48 h-1 bg-slate-800 rounded-full overflow-hidden mt-2">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full animate-[progress_1.5s_ease-in-out_infinite]" />
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
