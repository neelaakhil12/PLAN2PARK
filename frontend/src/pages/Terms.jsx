import React from 'react';
import { FileText, CheckCircle } from 'lucide-react';

const Terms = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-emerald-600 px-8 py-10 text-white">
          <div className="flex items-center gap-3 mb-4">
            <FileText className="w-10 h-10 text-emerald-100" />
            <h1 className="text-3xl font-extrabold tracking-tight">Terms and Conditions</h1>
          </div>
          <p className="text-emerald-100 max-w-2xl text-lg">
            Please read these terms and conditions carefully before using the PlanToPark platform.
          </p>
          <p className="text-emerald-200 text-sm mt-4">Last updated: August 2026</p>
        </div>

        <div className="px-8 py-10 text-slate-600 space-y-8">
          
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              1. Introduction
            </h2>
            <p className="leading-relaxed">
              Welcome to PlanToPark ("Company", "we", "our", "us"). These Terms and Conditions govern your use of our website located at plantopark.com (together or individually "Service") operated by PlanToPark.
            </p>
            <p className="leading-relaxed mt-2">
              Our Privacy Policy also governs your use of our Service and explains how we collect, safeguard and disclose information that results from your use of our web pages.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              2. Use of Service
            </h2>
            <p className="leading-relaxed">
              By using our Service, you agree to these Terms. If you disagree with any part of the terms, then you may not access the Service.
            </p>
            <ul className="list-disc pl-5 mt-4 space-y-2">
              <li>You must be at least 18 years old to create an account.</li>
              <li>You are responsible for safeguarding the password that you use to access the Service.</li>
              <li>You agree not to disclose your password to any third party.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              3. Payments and Booking
            </h2>
            <p className="leading-relaxed">
              All payments on the platform are processed securely via Razorpay. By making a booking, you agree to pay the listed price for the parking space and any applicable taxes and fees.
            </p>
            <p className="leading-relaxed mt-2">
              Hosts agree that PlanToPark will retain a 10% commission on all successful bookings. The remaining 90% will be credited to the host's recorded bank account within the standard payout cycle.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              4. Prohibited Uses
            </h2>
            <p className="leading-relaxed">
              You may use Service only for lawful purposes and in accordance with Terms. You agree not to use Service:
            </p>
            <ul className="list-disc pl-5 mt-4 space-y-2">
              <li>In any way that violates any applicable national or international law or regulation.</li>
              <li>For the purpose of exploiting, harming, or attempting to exploit or harm minors in any way.</li>
              <li>To engage in any other conduct that restricts or inhibits anyone's use or enjoyment of Service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              5. Changes to Service
            </h2>
            <p className="leading-relaxed">
              We reserve the right to withdraw or amend our Service, and any service or material we provide via Service, in our sole discretion without notice. We will not be liable if for any reason all or any part of Service is unavailable at any time or for any period.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
};

export default Terms;
