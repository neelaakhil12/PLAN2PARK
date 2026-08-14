import React from 'react';
import { Shield, CheckCircle, Lock } from 'lucide-react';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-slate-50 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100">
        <div className="bg-emerald-600 px-8 py-10 text-white">
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-10 h-10 text-emerald-100" />
            <h1 className="text-3xl font-extrabold tracking-tight">Privacy Policy</h1>
          </div>
          <p className="text-emerald-100 max-w-2xl text-lg">
            We are committed to protecting your personal information and your right to privacy.
          </p>
          <p className="text-emerald-200 text-sm mt-4">Last updated: August 2026</p>
        </div>

        <div className="px-8 py-10 text-slate-600 space-y-8">
          
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              1. Information We Collect
            </h2>
            <p className="leading-relaxed">
              We collect personal information that you voluntarily provide to us when you register on the website, express an interest in obtaining information about us or our products and Services, when you participate in activities on the Website or otherwise when you contact us.
            </p>
            <ul className="list-disc pl-5 mt-4 space-y-2">
              <li><strong>Personal Information:</strong> Name, phone number, email address, vehicle information, and profile picture.</li>
              <li><strong>Financial Information:</strong> Bank account details (for Hosts) and payment transaction data (processed securely by Razorpay).</li>
              <li><strong>Usage Data:</strong> Information about how you interact with our platform, IP address, and browser type.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              2. How We Use Your Information
            </h2>
            <p className="leading-relaxed">
              We use personal information collected via our Website for a variety of business purposes described below. We process your personal information for these purposes in reliance on our legitimate business interests, in order to enter into or perform a contract with you, with your consent, and/or for compliance with our legal obligations.
            </p>
            <ul className="list-disc pl-5 mt-4 space-y-2">
              <li>To facilitate account creation and logon process.</li>
              <li>To fulfill and manage your parking bookings.</li>
              <li>To process payments and host payouts.</li>
              <li>To send administrative information to you.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-emerald-500" />
              3. Keeping Your Information Safe
            </h2>
            <p className="leading-relaxed">
              We have implemented appropriate technical and organizational security measures designed to protect the security of any personal information we process. However, despite our safeguards and efforts to secure your information, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              4. Sharing Your Information
            </h2>
            <p className="leading-relaxed">
              We only share information with your consent, to comply with laws, to provide you with services, to protect your rights, or to fulfill business obligations. This includes sharing necessary booking details (such as names and vehicle plates) between Hosts and Seekers to facilitate the parking service.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
