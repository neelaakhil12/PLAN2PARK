import React, { useState } from 'react';
import { RefreshCcw, ShieldCheck, AlertTriangle, CheckCircle2, Clock, Wallet, Search, HelpCircle, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

const REFUND_CLAUSES = [
  {
    id: 1,
    title: '1. Overview and Core Philosophy',
    category: 'Core Principles',
    text: 'PlanToPark operates an automated, transparent cancellation and refund framework designed to balance flexibility for vehicle commuters (Seekers) with fair compensation and schedule predictability for property and yard hosts (Owners). All refunds are handled systematically according to check-in milestones.'
  },
  {
    id: 2,
    title: '2. Cancellations Prior to Check-In (100% Full Refund Guarantee)',
    category: 'Seeker Cancellations',
    text: 'If a Seeker cancels a reservation prior to performing check-in at the booked location, the Seeker is entitled to an unconditional 100% full refund of the booking amount paid. No cancellation fees or administrative penalties are levied for pre-check-in cancellations.'
  },
  {
    id: 3,
    title: '3. Cancellations Within Post Check-In Grace Period (20% Partial Refund)',
    category: 'Seeker Cancellations',
    text: 'Upon checking in, situations may arise where a commuter needs to vacate immediately due to unforeseen vehicle sizing, emergency departure, or bay access difficulties. The platform enforces an Administrator-configured Grace Period (standard default: 10 minutes from check-in). If a Seeker initiates cancellation within this active grace period, 20% of the paid booking amount is immediately refunded back to the Seeker’s PlanToPark wallet. The remaining 80% is retained to compensate the space owner for reserving the slot and holding the inventory.'
  },
  {
    id: 4,
    title: '4. Cancellations After Grace Period Expiry (0% Non-Refundable)',
    category: 'Seeker Cancellations',
    text: 'Once the designated post check-in grace period has expired, or once vehicle storage usage has commenced beyond the initial grace window, the parking reservation is strictly non-refundable (0% refund). This policy protects hosts from revenue loss resulting from occupied or reserved capacity.'
  },
  {
    id: 5,
    title: '5. Instant Wallet Refund Crediting',
    category: 'Refund Mechanism',
    text: 'All approved cancellation refunds are credited instantaneously to the Seeker’s PlanToPark in-app Digital Wallet. Wallet credits never expire and can be applied immediately toward any future hourly, daily, or monthly parking reservation across any verified location on the platform.'
  },
  {
    id: 6,
    title: '6. External Bank & Original Payment Mode Refunds',
    category: 'Refund Mechanism',
    text: 'If a user prefers their wallet refund balance to be remitted directly back to their original funding source (credit card, debit card, UPI ID, or net banking account), they can submit a request to support at plantopark@gmail.com. External gateway settlements are initiated via Razorpay and typically reflect in the user’s account within 5 to 7 business banking days, subject to the issuing bank’s standard clearing cycles.'
  },
  {
    id: 7,
    title: '7. Cancellations Initiated by Space Owner / Host',
    category: 'Host Cancellations',
    text: 'Space owners are contractually expected to honor all confirmed reservations. In the rare event that a space owner cancels a confirmed booking due to an unforeseen physical obstruction, structural maintenance, or unexpected yard closure: (a) the Seeker receives an immediate 100% full refund; and (b) the host may be subject to platform reliability penalties or listing suspension.'
  },
  {
    id: 8,
    title: '8. Commercial Vehicle Storage Yard Cancellations (Monthly Bookings)',
    category: 'Commercial Yards',
    text: 'For commercial vehicle storage lots, institutional fleet holds, and bank repossession yard bookings reserved on monthly billing agreements: cancellations requested before the scheduled intake date receive a 100% refund. Cancellations requested mid-tenure are calculated on a pro-rata basis subject to the written Yard Agreement terms agreed during contract activation.'
  },
  {
    id: 9,
    title: '9. Space Inaccessibility, Blocked Bays, and Listing Mismatches',
    category: 'Disputes & Exceptions',
    text: 'If a Seeker arrives at the designated parking bay and finds it physically occupied by another unauthorized vehicle, locked without an attendant, or materially disparate from the listing specifications, the Seeker must report the incident via the in-app Complaints ticketing system within 1 hour of scheduled arrival. Upon immediate verification, a 100% refund or free slot reassignment will be authorized.'
  },
  {
    id: 10,
    title: '10. No-Show Policy',
    category: 'Seeker Cancellations',
    text: 'If a Seeker fails to check in or arrive at the booked space without canceling their reservation prior to the end of the reserved slot duration, the booking is classified as a "No-Show" and is entirely non-refundable.'
  },
  {
    id: 11,
    title: '11. Parking Session Extensions & Add-On Hours',
    category: 'Extensions',
    text: 'When a commuter extends an active parking session, the extension duration is committed immediately upon payment confirmation. Extension payments follow the same cancellation rules: non-refundable once the extended time period begins.'
  },
  {
    id: 12,
    title: '12. Overstay Charges and Wallet Adjustments',
    category: 'Adjustments',
    text: 'If a vehicle remains parked beyond the reserved departure time without an approved extension, standard hourly overstay penalties will accrue. Accrued overstay fees are deducted from the user’s wallet balance or billed at subsequent checkout before any pending refund settlements are finalized.'
  },
  {
    id: 13,
    title: '13. Host Payout Adjustments for Refunded Bookings',
    category: 'Host Accounting',
    text: 'When a booking is cancelled with a 100% refund prior to check-in, the space owner’s ledger is automatically adjusted to release the slot. For cancellations during the grace period (20% refunded, 80% retained), the host receives their proportional share of the retained 80% after standard platform fee deduction.'
  },
  {
    id: 14,
    title: '14. Force Majeure & Extraordinary Events',
    category: 'Disputes & Exceptions',
    text: 'In cases of verified natural disasters, severe civic disruptions, roadway blockades by civic authorities, or extreme weather making parking areas physically hazardous, PlanToPark management retains discretionary authority to issue 100% refunds regardless of timeline milestones.'
  },
  {
    id: 15,
    title: '15. Anti-Fraud and Abuse Prevention',
    category: 'Security & Compliance',
    text: 'PlanToPark monitors reservation behavior for suspicious booking-cancellation patterns. Users attempting to exploit refund mechanisms through artificial reservation holding or chargeback fraud will have their accounts terminated and wallet balances frozen pending investigation.'
  },
  {
    id: 16,
    title: '16. Dispute Resolution and Support Helpdesk',
    category: 'Support & Redressal',
    text: 'If you have an unresolved query regarding an automatically calculated refund or wallet ledger deduction, please contact our 24/7 dedicated Helpdesk at plantopark@gmail.com with your Booking ID and registered telephone number. Our resolution desk reviews all ticketing disputes within 24 to 48 hours.'
  }
];

const RefundPolicy = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Seeker Cancellations', 'Refund Mechanism', 'Host Cancellations', 'Commercial Yards', 'Disputes & Exceptions'];

  const filteredClauses = REFUND_CLAUSES.filter(clause => {
    const matchesSearch = clause.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          clause.text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || clause.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Hero Banner */}
        <div className="bg-gradient-to-r from-rose-600 via-rose-700 to-red-800 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-500/30 rounded-full text-rose-200 text-xs font-bold uppercase tracking-wider mb-4 border border-rose-400/30">
              <RefreshCcw className="w-3.5 h-3.5" /> Official Platform Policy
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Refund &amp; Cancellation Policy</h1>
            <p className="text-rose-100 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
              Clear, transparent, and fair cancellation milestones designed for commuters and parking hosts alike.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-6 text-xs text-rose-200">
              <span className="font-semibold">Last Updated: October 2026</span>
              <span>•</span>
              <span className="font-semibold">16 Structured Clauses</span>
              <span>•</span>
              <span className="font-semibold">Automated Wallet Reconciliation</span>
            </div>
          </div>
        </div>

        {/* Milestone Breakdown Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border-2 border-emerald-200 shadow-sm relative overflow-hidden">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="text-2xl font-black text-emerald-600 mb-1">100% Refund</div>
            <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">Before Check-In</h4>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Cancel anytime prior to arriving and checking into the parking space for a full 100% refund credited back to your wallet.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border-2 border-amber-200 shadow-sm relative overflow-hidden">
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
              <Clock className="w-6 h-6" />
            </div>
            <div className="text-2xl font-black text-amber-600 mb-1">20% Refund</div>
            <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">Within Grace Period</h4>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Checked in and need to leave immediately? Cancel within the admin grace window (e.g. 10 mins) for a 20% partial refund.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border-2 border-slate-200 shadow-sm relative overflow-hidden">
            <div className="h-10 w-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-2xl font-black text-slate-700 mb-1">0% Refund</div>
            <h4 className="text-xs font-black uppercase text-slate-900 tracking-wider">After Grace Period</h4>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Once the grace period has elapsed or for no-show sessions, bookings become non-refundable to protect the host's reserved inventory.
            </p>
          </div>
        </div>

        {/* Instant Wallet Highlights Card */}
        <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-indigo-950">Instant Wallet Balance Credits</h3>
              <p className="text-xs text-indigo-800 mt-0.5 leading-relaxed">
                Refunds are credited immediately to your PlanToPark wallet so you can re-book another bay without waiting for banking delays. Bank account remittance is available upon request.
              </p>
            </div>
          </div>
          <Link
            to="/seeker/dashboard?view=wallet"
            className="shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-colors"
          >
            View Wallet Balance →
          </Link>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search refund clauses (e.g. check-in, grace period, wallet, host)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-rose-500"
            />
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-[11px] font-bold px-3 py-1 rounded-lg transition-all ${
                  selectedCategory === cat
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Clauses List */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm divide-y divide-slate-100 overflow-hidden">
          {filteredClauses.length > 0 ? (
            filteredClauses.map((clause) => (
              <div key={clause.id} className="p-6 sm:p-7 hover:bg-slate-50/70 transition-colors">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-rose-500 shrink-0" />
                    {clause.title}
                  </h3>
                  <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 shrink-0">
                    {clause.category}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed pl-6">{clause.text}</p>
              </div>
            ))
          ) : (
            <div className="p-12 text-center text-slate-400">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-bold">No clauses match your search criteria.</p>
            </div>
          )}
        </div>

        {/* Footer Support Info */}
        <div className="bg-slate-100 border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-600 space-y-2">
          <p className="font-bold text-slate-800">Have questions about a recent booking or cancellation refund?</p>
          <p>
            Contact our dedicated Operations &amp; Refund Desk at{' '}
            <a href="mailto:plantopark@gmail.com" className="font-bold text-rose-600 underline">
              plantopark@gmail.com
            </a>
          </p>
          <div className="pt-2">
            <Link to="/privacy-policy" className="text-rose-700 font-bold hover:underline mx-2">Privacy Policy →</Link>
            <span className="text-slate-300">•</span>
            <Link to="/terms" className="text-rose-700 font-bold hover:underline mx-2">Terms &amp; Conditions →</Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default RefundPolicy;
