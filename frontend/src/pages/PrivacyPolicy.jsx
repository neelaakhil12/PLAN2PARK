import React, { useState } from 'react';
import { Shield, CheckCircle2, Lock, Search, Trash2, Mail, RefreshCw, AlertCircle, Phone, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const PRIVACY_CLAUSES = [
  {
    id: 1,
    title: '1. Introduction and Scope',
    category: 'General',
    text: 'PlanToPark ("we", "our", or "us") operates the PlanToPark website (plantopark.com), mobile applications (PlanToPark Seeker and PlanToPark Owner), and associated parking brokerage services. This Privacy Policy outlines our transparent commitment to collecting, processing, and safeguarding your personal data in accordance with applicable data protection laws, including the Indian Digital Personal Data Protection (DPDP) Act and global privacy standards.'
  },
  {
    id: 2,
    title: '2. Identity of Data Controller',
    category: 'General',
    text: 'PlanToPark acts as the data controller responsible for the management, processing, and storage of user information gathered via our digital platforms. If you have any inquiries regarding your privacy or data handling, you can contact our privacy desk directly at plantopark@gmail.com.'
  },
  {
    id: 3,
    title: '3. Personal Information We Collect',
    category: 'Data Collection',
    text: 'When you register as a Parking Seeker or Space Owner, we collect personally identifiable information you provide directly, including your full legal name, active email address, contact telephone number, profile photograph, and account credentials.'
  },
  {
    id: 4,
    title: '4. Vehicle and Registration Data',
    category: 'Data Collection',
    text: 'To facilitate seamless parking access and security compliance, Seekers provide vehicle details, including vehicle registration plate numbers, vehicle type (e.g., Hatchback, Sedan, SUV, 2-Wheeler, Commercial Truck), and vehicle model. This information is displayed to confirmed parking hosts to verify authorized entry.'
  },
  {
    id: 5,
    title: '5. Driver License Verification',
    category: 'Data Collection',
    text: 'For safety, anti-theft compliance, and identity authentication, Seekers may optionally or obligatorily provide their driving license number and document photograph when required by commercial yard regulations or local municipal bylaws.'
  },
  {
    id: 6,
    title: '6. Precise and Approximate Geolocation Data',
    category: 'Location & Tracking',
    text: 'With your explicit device permission, we collect precise and approximate GPS coordinates from your mobile device. For Seekers, location data is utilized to detect parking bays in your immediate vicinity, calculate travel distance, and deliver turn-by-turn navigation. For Hosts, location data is used to automatically verify physical parking space coordinates and generate accurate map markers.'
  },
  {
    id: 7,
    title: '7. Background Location Tracking',
    category: 'Location & Tracking',
    text: 'Background location tracking is accessed exclusively during an active navigation or check-in session when opted in by the commuter. It is never used for general surveillance or sold to external advertising networks.'
  },
  {
    id: 8,
    title: '8. Payment and Transaction Details',
    category: 'Financial',
    text: 'Financial transactions on PlanToPark are handled through secure, PCI-DSS compliant third-party payment gateways (including Razorpay). We do not record or store raw credit card numbers or banking passwords on our local servers. We maintain transaction identifiers, amounts paid, refund records, and timestamps for accounting and invoicing.'
  },
  {
    id: 9,
    title: '9. Space Owner Bank & Payout Information',
    category: 'Financial',
    text: 'To distribute earned parking fees, space owners provide designated bank account numbers, IFSC codes, bank names, account holder names, or verified UPI IDs. This data is strictly utilized for automated ledger accounting and payout disbursements.'
  },
  {
    id: 10,
    title: '10. Camera and Photo Library Access',
    category: 'Device Permissions',
    text: 'Our mobile applications request access to your device camera and image library solely to allow you to upload your profile avatar, take photos of parking spaces, capture entrance gate landmarks, or provide vehicle license documentation. We do not access unrelated media files.'
  },
  {
    id: 11,
    title: '11. Push Notifications and Alerts',
    category: 'Device Permissions',
    text: 'We send transactional push notifications regarding booking confirmations, check-in reminders, parking expiration timers, wallet refund credits, and host payout notices. You can toggle push notification preferences in your device settings at any time.'
  },
  {
    id: 12,
    title: '12. Log Files, IP Addresses, and Device Telemetry',
    category: 'Technical',
    text: 'Our servers automatically log access details such as Internet Protocol (IP) addresses, operating system version, browser user-agent, diagnostic error logs, and session activity to prevent denial-of-service attempts and safeguard account integrity.'
  },
  {
    id: 13,
    title: '13. Commercial Storage Yard & Fleet Records',
    category: 'Commercial Operations',
    text: 'For institutional fleet and vehicle repossession storage yards, we process institutional representative credentials, lot acreage details, gate pass clearances, and vehicle intake condition notes for audit and compliance.'
  },
  {
    id: 14,
    title: '14. Purpose of Data Processing',
    category: 'Usage & Purpose',
    text: 'We process personal information to: (a) operate and maintain our marketplace; (b) facilitate reservations and check-in verifications; (c) process wallet credits and payouts; (d) provide customer assistance; and (e) detect and prevent fraudulent transactions.'
  },
  {
    id: 15,
    title: '15. Legal Grounds for Processing',
    category: 'Usage & Purpose',
    text: 'Our legal bases for processing personal data include contractual necessity (fulfilling your parking reservation), compliance with legal obligations, user consent, and legitimate interests in maintaining platform safety.'
  },
  {
    id: 16,
    title: '16. Information Sharing Between Seekers and Hosts',
    category: 'Data Sharing',
    text: 'When a booking is confirmed, minimal necessary information is shared: the host receives the seeker’s name, vehicle plate number, and scheduled arrival time; the seeker receives the space address, entrance landmarks, and host contact channels.'
  },
  {
    id: 17,
    title: '17. Third-Party Service Providers',
    category: 'Data Sharing',
    text: 'We share data with vetted third-party vendors who assist with essential operations, including cloud hosting providers (AWS EC2), mapping and routing providers (OpenStreetMap, Leaflet), and payment processors (Razorpay). These partners are bound by confidentiality and data protection agreements.'
  },
  {
    id: 18,
    title: '18. International and Cloud Storage Security',
    category: 'Security',
    text: 'All user data is housed in secure cloud environments featuring 256-bit SSL/TLS encryption for data in transit and robust encryption standards for data at rest. Firewalls and strict access control lists (ACL) are maintained around the clock.'
  },
  {
    id: 19,
    title: '19. Data Retention Policy',
    category: 'Data Rights',
    text: 'We retain your personal data for as long as your account remains active or as required to comply with statutory accounting, taxation, and dispute resolution standards. Booking history is archived in compliance with applicable commercial record laws.'
  },
  {
    id: 20,
    title: '20. Right to Account Deletion & Data Erasure',
    category: 'Account Deletion',
    text: 'You have the absolute right to request the permanent deletion of your account and all associated personal information (name, email, phone number, vehicle records, profile photos, and saved addresses). To exercise this right, simply send an email from your registered email address to plantopark@gmail.com with the subject line "Request for Account Deletion". Upon receipt and verification, your account, credentials, and identifiable data will be permanently wiped from our production databases within 48 to 72 business hours.'
  },
  {
    id: 21,
    title: '21. Right to Access and Correction',
    category: 'Data Rights',
    text: 'You have the right to review, update, or correct inaccuracies in your personal details at any time directly through the "Edit Profile Details" section in your Seeker or Owner Dashboard, or by writing to support.'
  },
  {
    id: 22,
    title: '22. Data Portability',
    category: 'Data Rights',
    text: 'Upon formal request submitted to plantopark@gmail.com, you are entitled to receive a copy of your personal data and booking history in a structured, commonly used, and machine-readable format.'
  },
  {
    id: 23,
    title: '23. Protection of Minors',
    category: 'Compliance',
    text: 'PlanToPark is intended strictly for individuals who are 18 years of age or older and possess valid driving licenses. We do not knowingly collect or solicit personal data from children under 18 years of age.'
  },
  {
    id: 24,
    title: '24. Cookies and Session Management',
    category: 'Technical',
    text: 'We utilize essential local storage and session tokens to preserve authentication sessions and user preferences. We do not deploy intrusive third-party cross-site advertising cookies or tracking beacons.'
  },
  {
    id: 25,
    title: '25. Incident Notification Protocol',
    category: 'Security',
    text: 'In the unlikely event of a security compromise or unauthorized access impacting personal data, PlanToPark will promptly notify affected users and regulatory bodies within the statutory timelines prescribed by law.'
  },
  {
    id: 26,
    title: '26. Policy Amendments and Updates',
    category: 'General',
    text: 'We may periodically update this Privacy Policy to reflect platform enhancements or legal changes. Any material revisions will be reflected on this page with an updated revision date, and prominent notices will be issued in the apps and dashboards.'
  },
  {
    id: 27,
    title: '27. Grievance Redressal and Contact Details',
    category: 'Contact',
    text: 'For any questions, clarifications, privacy requests, or account deletion inquiries, please reach out to our dedicated Support & Grievance Desk at plantopark@gmail.com. We are committed to responding to all legitimate inquiries within 24 to 48 hours.'
  }
];

const PrivacyPolicy = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Account Deletion', 'Data Collection', 'Location & Tracking', 'Financial', 'Data Rights', 'Security', 'General'];

  const filteredClauses = PRIVACY_CLAUSES.filter(clause => {
    const matchesSearch = clause.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          clause.text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || clause.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Hero Banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-800 rounded-3xl p-8 sm:p-10 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/30 rounded-full text-emerald-200 text-xs font-bold uppercase tracking-wider mb-4 border border-emerald-400/30">
              <Shield className="w-3.5 h-3.5" /> Official Platform Legal Document
            </div>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight">Privacy Policy</h1>
            <p className="text-emerald-100 text-sm sm:text-base mt-2 max-w-2xl leading-relaxed">
              We are committed to safeguarding your personal information, vehicle records, and location privacy with enterprise-grade encryption and full transparency.
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-6 text-xs text-emerald-200">
              <span className="font-semibold">Last Updated: October 2026</span>
              <span>•</span>
              <span className="font-semibold">27 Comprehensive Clauses</span>
              <span>•</span>
              <span className="font-semibold">Indian DPDP &amp; Play Store Compliant</span>
            </div>
          </div>
        </div>

        {/* Highlight Banner: Account Deletion Callout */}
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-amber-950">User Account &amp; Data Deletion Available Anytime</h3>
              <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                Want your account and personal records wiped? Simply email <a href="mailto:plantopark@gmail.com?subject=Request%20for%20Account%20Deletion" className="font-bold underline text-amber-900">plantopark@gmail.com</a> from your registered address. We permanently remove your profile, vehicle info, and credentials within 48–72 hours.
              </p>
            </div>
          </div>
          <a
            href="mailto:plantopark@gmail.com?subject=Request%20for%20Account%20Deletion"
            className="shrink-0 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-sm transition-colors"
          >
            Request Deletion →
          </a>
        </div>

        {/* Key Safeguards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <Lock className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">SSL 256-bit Encryption</h4>
            <p className="text-xs text-slate-500 mt-1">All personal and location communications are encrypted in transit via HTTPS &amp; TLS.</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
              <RefreshCw className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Zero Data Selling</h4>
            <p className="text-xs text-slate-500 mt-1">Your location, vehicle numbers, and phone numbers are never rented or sold to third parties.</p>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
              <Mail className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">Live Helpdesk Support</h4>
            <p className="text-xs text-slate-500 mt-1">Dedicated support desk responds within 24 to 48 hours at plantopark@gmail.com.</p>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search clauses (e.g. deletion, location, vehicle, cookies)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-[11px] font-bold px-3 py-1 rounded-lg transition-all ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-sm'
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
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
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
              <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-bold">No clauses match your search criteria.</p>
            </div>
          )}
        </div>

        {/* Footer Support Info */}
        <div className="bg-slate-100 border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-600 space-y-2">
          <p className="font-bold text-slate-800">Need further assistance or want to exercise your data protection rights?</p>
          <p>
            Contact our dedicated Data Privacy Desk anytime at{' '}
            <a href="mailto:plantopark@gmail.com" className="font-bold text-emerald-600 underline">
              plantopark@gmail.com
            </a>
          </p>
          <div className="pt-2">
            <Link to="/refund-policy" className="text-emerald-700 font-bold hover:underline mx-2">Refund &amp; Cancellation Policy →</Link>
            <span className="text-slate-300">•</span>
            <Link to="/terms" className="text-emerald-700 font-bold hover:underline mx-2">Terms &amp; Conditions →</Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default PrivacyPolicy;
