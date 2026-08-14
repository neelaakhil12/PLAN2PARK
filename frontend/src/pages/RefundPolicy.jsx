import React from 'react';
import { ShieldAlert, RefreshCcw, AlertTriangle } from 'lucide-react';

const RefundPolicy = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-rose-600 px-8 py-10 text-white">
          <div className="flex items-center gap-3 mb-4">
            <ShieldAlert className="w-10 h-10 text-rose-100" />
            <h1 className="text-3xl font-extrabold tracking-tight">Refund & Cancellation Policy</h1>
          </div>
          <p className="text-rose-100 max-w-2xl text-lg">
            Understand your rights for cancellations and refunds on PlanToPark.
          </p>
          <p className="text-rose-200 text-sm mt-4">Last updated: August 2026</p>
        </div>

        <div className="px-8 py-10 text-slate-600 space-y-8">
          
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <RefreshCcw className="w-5 h-5 text-rose-500" />
              1. Cancellation by Seeker (Customer)
            </h2>
            <p className="leading-relaxed">
              We understand that plans can change. Customers can cancel their bookings under the following conditions:
            </p>
            <ul className="list-disc pl-5 mt-4 space-y-3">
              <li><strong className="text-slate-800">Prior to Booking Start Time:</strong> If you cancel a booking at least 1 hour before the scheduled start time, you are eligible for a <span className="font-bold text-emerald-600">100% refund</span>.</li>
              <li><strong className="text-slate-800">Within 1 Hour of Start Time:</strong> Cancellations made within 1 hour of the start time will incur a 20% cancellation fee. The remaining 80% will be refunded.</li>
              <li><strong className="text-slate-800">After Start Time:</strong> No refunds are provided for cancellations made after the booking start time, or for no-shows.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              2. Cancellation by Host (Owner)
            </h2>
            <p className="leading-relaxed">
              Hosts are expected to honor all accepted bookings. However, in the rare event that a Host must cancel a confirmed booking:
            </p>
            <ul className="list-disc pl-5 mt-4 space-y-3">
              <li>The Seeker will immediately receive a <span className="font-bold text-emerald-600">100% refund</span>.</li>
              <li>Hosts who repeatedly cancel bookings may face penalties, including suspension or permanent removal from the PlanToPark platform.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <RefreshCcw className="w-5 h-5 text-rose-500" />
              3. Refund Processing
            </h2>
            <p className="leading-relaxed">
              All approved refunds are processed automatically back to the original payment method used during the transaction via our payment partner, Razorpay.
            </p>
            <p className="leading-relaxed mt-2 bg-slate-50 p-4 rounded-lg border border-slate-200">
              Please allow <strong className="text-slate-800">5-7 business days</strong> for the refunded amount to reflect in your bank account or credit card statement, depending on your financial institution.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-500" />
              4. Dispute Resolution
            </h2>
            <p className="leading-relaxed">
              If you arrive at the parking space and it is unavailable, inaccessible, or significantly different from the listing description, you must contact PlanToPark Support within <strong>1 hour</strong> of your booking start time to be eligible for a full refund. You can raise a ticket via the Complaints section in your dashboard.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
};

export default RefundPolicy;
