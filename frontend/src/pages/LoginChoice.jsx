import React from 'react';
import { Link } from 'react-router-dom';
import { Car, Building2, ChevronRight } from 'lucide-react';

const LoginChoice = () => {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-slate-50 to-indigo-50 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl mix-blend-multiply filter"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl mix-blend-multiply filter"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <img src="/logo.png" alt="PlanToPark" className="h-16 w-auto object-contain drop-shadow" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-800 tracking-tight mb-2">
            Welcome to PlanToPark
          </h1>
          <p className="text-slate-500 font-medium text-sm sm:text-base">
            Select your account type to continue
          </p>
        </div>

        <div className="space-y-4">
          {/* Seeker / Driver */}
          <Link
            to="/seeker/login"
            className="flex items-center gap-4 p-5 bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md rounded-2xl transition-all group"
          >
            <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
              <Car className="h-6 w-6" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-extrabold text-slate-800 text-base">I want parking</h3>
              <p className="text-slate-400 text-xs mt-0.5">Find parking, book spaces, make secure payments</p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-blue-600 transition-colors" />
          </Link>

          {/* Host / Owner */}
          <Link
            to="/owner/login"
            className="flex items-center gap-4 p-5 bg-white border border-slate-200 hover:border-indigo-500 hover:shadow-md rounded-2xl transition-all group"
          >
            <div className="h-12 w-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-extrabold text-slate-800 text-base">I have parking</h3>
              <p className="text-slate-400 text-xs mt-0.5">List driveway/garages, allot slots, earn 90% payout</p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
          </Link>
        </div>

        <div className="mt-8 text-center text-xs text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-blue-600 hover:underline">
            Register Here →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginChoice;
