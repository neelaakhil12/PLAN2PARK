import React from 'react';
import { Link } from 'react-router-dom';
import { Car, Building2, ChevronRight, ShieldCheck, Landmark } from 'lucide-react';

const RegisterChoice = () => {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-slate-50 to-indigo-50 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Decorative background glows */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl mix-blend-multiply filter"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl mix-blend-multiply filter"></div>

      <div className="w-full max-w-lg relative z-10">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <img src="/logo.png" alt="Plan2Park" className="h-16 w-auto object-contain drop-shadow" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-700 via-indigo-700 to-violet-800 tracking-tight mb-2">
            Create an Account
          </h1>
          <p className="text-slate-500 font-medium text-sm sm:text-base">
            Choose your portal to get started with Plan2Park
          </p>
        </div>

        {/* Mandatory Policy Warning Banner */}
        <div className="bg-amber-500/10 border-2 border-amber-400/60 rounded-2xl p-4 mb-6 text-left shadow-sm">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xl">⚠️</span>
            <span className="text-xs font-black tracking-wide uppercase text-amber-900">
              Mandatory Commercial Land Policy
            </span>
          </div>
          <p className="text-xs text-amber-900/90 leading-relaxed">
            Landowners registering for <strong className="font-bold text-amber-950">Banks & Auto Finance Vehicle Storage</strong> must possess a <strong className="font-bold text-amber-950 underline decoration-amber-500">minimum of 1.0 Acre contiguous land</strong> with perimeter security.
          </p>
        </div>

        <div className="space-y-3.5">
          {/* Seeker / Driver */}
          <Link
            to="/seeker/register"
            className="flex items-center gap-4 p-4.5 bg-white border border-slate-200 hover:border-blue-500 hover:shadow-md rounded-2xl transition-all group"
          >
            <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
              <Car className="h-6 w-6" />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-800 text-base">Parking Seeker</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">Driver</span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">Find parking, book spaces near you instantly</p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-blue-600 transition-colors" />
          </Link>

          {/* Banks & Auto Finance Seeker */}
          <Link
            to="/seeker/register?category=bank_finance_seeker"
            className="flex items-center gap-4 p-4.5 bg-white border border-slate-200 hover:border-cyan-500 hover:shadow-md rounded-2xl transition-all group"
          >
            <div className="h-12 w-12 bg-cyan-50 rounded-xl flex items-center justify-center text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white transition-colors shrink-0">
              <Landmark className="h-6 w-6" />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-800 text-base">Banks & Auto Finance</h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-cyan-100 text-cyan-800">Repo Fleet</span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">Register loan/repo department to find authorized 1+ Acre stockyards</p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-cyan-600 transition-colors" />
          </Link>

          {/* Standard Space Owner */}
          <Link
            to="/owner/register"
            className="flex items-center gap-4 p-4.5 bg-white border border-slate-200 hover:border-indigo-500 hover:shadow-md rounded-2xl transition-all group"
          >
            <div className="h-12 w-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors shrink-0">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-800 text-base">Parking Space Host</h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">Driveway</span>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">List residential/commercial spots, specify car sizes, earn passive income</p>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-600 transition-colors" />
          </Link>

          {/* Vehicle Storage Yard Owner (1+ Acre) */}
          <Link
            to="/owner/register?category=vehicle_storage_owner"
            className="flex items-center gap-4 p-4.5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300/80 hover:border-amber-500 hover:shadow-md rounded-2xl transition-all group"
          >
            <div className="h-12 w-12 bg-amber-500 rounded-xl flex items-center justify-center text-white group-hover:bg-amber-600 transition-colors shrink-0 shadow-sm">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div className="flex-1 text-left">
              <div className="flex items-center gap-2">
                <h3 className="font-black text-amber-950 text-base">Vehicle Storage Partner</h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-200 text-amber-900">1+ Acre Land</span>
              </div>
              <p className="text-amber-800/80 text-xs mt-0.5">Register 1+ Acre secured land for high-yield bank repossession yards</p>
            </div>
            <ChevronRight className="h-5 w-5 text-amber-400 group-hover:text-amber-600 transition-colors" />
          </Link>
        </div>

        <div className="mt-8 text-center text-xs text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-blue-600 hover:underline">
            Sign In →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterChoice;
