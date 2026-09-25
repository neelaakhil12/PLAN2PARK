import React, { useState, useContext } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { User, Mail, Phone, Lock, AlertCircle, CheckSquare, Square, Car, Landmark, Eye, EyeOff } from 'lucide-react';

const SeekerRegister = () => {
  const { signupForRole } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [category, setCategory] = useState(
    searchParams.get('category') === 'bank_finance_seeker' ? 'bank_finance_seeker' : 'standard'
  );
  const isBankSeeker = category === 'bank_finance_seeker';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [contact, setContact] = useState('');
  const [organizationName, setOrganizationName] = useState('');

  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed) return setError('Please agree to Terms of Service and Privacy Policy');

    if (isBankSeeker && !organizationName.trim()) {
      return setError('Please enter your Bank, NBFC or Auto Finance Organization Name');
    }

    setError('');
    setLoading(true);

    try {
      const extra = {
        accountCategory: isBankSeeker ? 'bank_finance_seeker' : 'standard',
      };
      if (isBankSeeker) {
        extra.organizationName = organizationName;
      }

      await signupForRole('seeker', name, email, password, contact, extra);
      navigate('/seeker/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2 mb-3">
            <img src="/logo.png" alt="Plan2Park" className="h-10 w-10 object-contain rounded" />
            <span className="font-black text-2xl text-slate-900 tracking-tight">Plan<span className="text-blue-600">2</span>Park</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-sans">
            {isBankSeeker ? 'Banks & Auto Finance Registration' : 'Register Parking Seeker'}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            {isBankSeeker ? 'Search & reserve 1+ Acre verified stockyards for seized/repossessed vehicles' : 'Find nearby parking spots tailored for your car size'}
          </p>
        </div>

        {/* Portal Switcher Tabs */}
        <div className="flex bg-slate-200 p-1 rounded-xl mb-5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setCategory('standard')}
            className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              !isBankSeeker ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Car className="h-3.5 w-3.5" /> Parking Seeker (Driver)
          </button>
          <button
            type="button"
            onClick={() => setCategory('bank_finance_seeker')}
            className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              isBankSeeker ? 'bg-cyan-600 text-white font-black shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Landmark className="h-3.5 w-3.5" /> Banks & Auto Finance
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          {error && (
            <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-600 p-3.5 rounded-xl mb-5 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                {isBankSeeker ? 'Authorized Officer / Agent Name' : 'Full Name'}
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={isBankSeeker ? "e.g. Ramesh Varma (Recovery Officer)" : "e.g. Arjun Malhotra"}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                />
              </div>
            </div>

            {/* Bank / Organization Name if bank_finance_seeker */}
            {isBankSeeker && (
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-cyan-950 mb-1.5">
                  Bank / NBFC / Auto Loan Organization
                </label>
                <div className="relative">
                  <Landmark className="absolute left-3.5 top-3.5 h-4 w-4 text-cyan-600" />
                  <input
                    type="text"
                    required
                    value={organizationName}
                    onChange={e => setOrganizationName(e.target.value)}
                    placeholder="e.g. HDFC Bank Auto Loans / Tata Capital"
                    className="w-full pl-10 pr-4 py-3 bg-cyan-50/40 border border-cyan-300 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-cyan-600 focus:ring-2 focus:ring-cyan-100 transition-all text-sm font-semibold"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Official Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={contact}
                  onChange={e => setContact(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Terms & Conditions */}
            <div
              className="flex items-start gap-2.5 cursor-pointer group"
              onClick={() => setAgreed(!agreed)}
            >
              <div className={`mt-0.5 shrink-0 transition-colors ${agreed ? 'text-blue-600' : 'text-slate-300'}`}>
                {agreed
                  ? <CheckSquare className="h-5 w-5" />
                  : <Square className="h-5 w-5" />
                }
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                I agree to Plan2Park's{' '}
                <Link to="/terms" onClick={e => e.stopPropagation()} className="text-blue-600 hover:underline font-semibold">Terms of Service</Link>,{' '}
                <Link to="/privacy-policy" onClick={e => e.stopPropagation()} className="text-blue-600 hover:underline font-semibold">Privacy Policy</Link>, and{' '}
                <span className="font-semibold text-slate-700">Storage & Repossession Terms</span>.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full font-bold py-3.5 rounded-xl transition-all shadow-md text-sm disabled:opacity-60 disabled:cursor-not-allowed mt-2 ${
                isBankSeeker
                  ? 'bg-cyan-600 hover:bg-cyan-700 text-white font-black shadow-cyan-600/20'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  Registering Account...
                </span>
              ) : isBankSeeker ? 'Register Auto Finance Repo Team' : 'Register Parking Seeker'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to={isBankSeeker ? "/seeker/login?category=bank_finance_seeker" : "/seeker/login"} className="text-blue-600 font-bold hover:underline">Sign in</Link>
          </p>

          <div className="border-t border-slate-100 mt-5 pt-4 text-center">
            <Link to="/owner/register" className="text-xs text-slate-400 hover:text-slate-600 font-semibold">
              Have Land or Parking to Monetize? (Owner / 1+ Ac Yard Partner) Register Here →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeekerRegister;
