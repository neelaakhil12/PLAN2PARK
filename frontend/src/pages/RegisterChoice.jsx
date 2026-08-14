import React from 'react';
import { Link } from 'react-router-dom';
import { Car, Building2, ChevronRight } from 'lucide-react';

const RegisterChoice = () => {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-50 via-slate-50 to-slate-100 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-emerald-400/20 blur-3xl mix-blend-multiply filter animate-pulse"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-teal-300/20 blur-3xl mix-blend-multiply filter animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-teal-700 tracking-tight mb-3">
            Register
          </h1>
          <p className="text-slate-500 font-medium text-sm sm:text-base">Choose your account type to sign up</p>
        </div>

        <div className="space-y-4">
          {/* Seeker / Driver Registration */}
          <Link
            to="/seeker/register"
            className="flex items-center gap-4 p-5 bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-sm rounded-2xl transition-all group"
          >
            <div className="h-12 w-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 transition-colors shrink-0">
              <Car className="h-6 w-6" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-extrabold text-slate-800 text-base">I want parking</h3>
              <p className="text-slate-400 text-xs mt-0.5">Create account to book spaces near you instantly</p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
          </Link>

          {/* Host / Owner Registration */}
          <Link
            to="/owner/register"
            className="flex items-center gap-4 p-5 bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-sm rounded-2xl transition-all group"
          >
            <div className="h-12 w-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-100 transition-colors shrink-0">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-extrabold text-slate-800 text-base">I have parking</h3>
              <p className="text-slate-400 text-xs mt-0.5">List your parking spot and generate passive income</p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-emerald-500 transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterChoice;
