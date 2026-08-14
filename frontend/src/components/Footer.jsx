import React from 'react';
import { Car } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="w-full bg-white border-t border-slate-200 py-10 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
          <div>
            <div className="flex flex-col mb-3">
              <span className="font-extrabold text-xl text-emerald-600 tracking-tight font-sans">Plantopark</span>
              <span className="text-[9px] uppercase tracking-widest text-slate-400 font-semibold">Smart Park. Smart Earn.</span>
            </div>
            <p className="text-slate-500 text-sm max-w-xs">
              India's most trusted peer-to-peer parking network. Connecting drivers with verified parking hosts.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-sm">
            <div>
              <h4 className="font-bold text-slate-800 mb-3">Platform</h4>
              <ul className="space-y-2 text-slate-500">
                <li><a href="#" className="hover:text-emerald-600 transition-colors">Find Parking</a></li>
                <li><a href="#" className="hover:text-emerald-600 transition-colors">List Your Space</a></li>
                <li><a href="#" className="hover:text-emerald-600 transition-colors">Pricing</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-800 mb-3">Company</h4>
              <ul className="space-y-2 text-slate-500">
                <li><a href="#" className="hover:text-emerald-600 transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-emerald-600 transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-emerald-600 transition-colors">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-slate-800 mb-3">Legal</h4>
              <ul className="space-y-2 text-slate-500">
                <li><Link to="/privacy-policy" className="hover:text-emerald-600 transition-colors">Privacy Policy</Link></li>
                <li><Link to="/terms" className="hover:text-emerald-600 transition-colors">Terms of Service</Link></li>
                <li><Link to="/refund-policy" className="hover:text-emerald-600 transition-colors">Refund Policy</Link></li>
                <li><a href="#" className="hover:text-emerald-600 transition-colors">Host Rules</a></li>
              </ul>
            </div>
          </div>
        </div>
        <div className="border-t border-slate-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <span>&copy; {new Date().getFullYear()} PlanToPark Technologies. All rights reserved.</span>
          <span className="flex items-center gap-1">Made with <span className="text-rose-400">♥</span> for India's commuters</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
