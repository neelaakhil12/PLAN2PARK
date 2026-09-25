import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle, ShieldCheck, Car, Building2, Search, RefreshCw } from 'lucide-react';

const API_BASE = 'https://api.plantopark.com/api';

const Terms = () => {
  const [activeTab, setActiveTab] = useState('seeker');
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTerms(activeTab);
  }, [activeTab]);

  const fetchTerms = async (type) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/terms/${type}`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setTerms(data);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.log('Error fetching terms:', e);
    }
    setLoading(false);
  };

  const filteredTerms = terms.filter(t =>
    !searchQuery.trim() || t.clause.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">
        {/* Header Hero */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-8 py-10 text-white">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center backdrop-blur-md">
              <FileText className="w-6 h-6 text-emerald-100" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight">Terms & Conditions</h1>
              <p className="text-emerald-100 text-sm mt-0.5">Official platform agreements and legal obligations</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4 text-xs font-semibold text-emerald-200">
            <span className="flex items-center gap-1.5 bg-white/10 px-3 py-1 rounded-full">
              <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse"></span>
              Live Synced with Platform Rules
            </span>
            <span>Last updated: Live Database</span>
          </div>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex bg-slate-200/80 p-1 rounded-2xl w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('seeker')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
                activeTab === 'seeker'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Car className="h-4 w-4" />
              Parking Seeker Terms
            </button>
            <button
              onClick={() => setActiveTab('owner')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all ${
                activeTab === 'owner'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="h-4 w-4" />
              Space Owner Terms
            </button>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search clauses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 font-medium"
            />
          </div>
        </div>

        {/* Content Clauses */}
        <div className="px-8 py-8">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <RefreshCw className="h-8 w-8 animate-spin text-emerald-500" />
              <p className="text-xs font-bold">Loading official clauses from server...</p>
            </div>
          ) : filteredTerms.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-xs">
              No clauses found matching your search.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTerms.map((term, idx) => (
                <div
                  key={term._id || idx}
                  className="p-5 rounded-2xl border border-slate-100 bg-white hover:border-emerald-200 hover:shadow-sm transition-all flex items-start gap-4"
                >
                  <div className="h-7 w-7 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-xs font-black shrink-0 border border-emerald-100">
                    {term.order || idx + 1}
                  </div>
                  <p className="text-slate-700 text-sm leading-relaxed font-medium">
                    {term.clause}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Footer Note */}
          <div className="mt-10 p-5 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-emerald-600 shrink-0" />
            <p className="text-xs text-slate-600 leading-relaxed">
              These terms are legally binding for all users registering or transacting on Plan To Park. Any updates made by platform administration are updated here and in the mobile applications in real-time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms;
