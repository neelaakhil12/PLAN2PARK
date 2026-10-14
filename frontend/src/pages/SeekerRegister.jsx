import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { User, Mail, Phone, Lock, AlertCircle, CheckSquare, Square, Eye, EyeOff } from 'lucide-react';
import GoogleAuthButton from '../components/GoogleAuthButton';

const SeekerRegister = () => {
  const { signupForRole, googleRegister } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [contact, setContact] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const qEmail = searchParams.get('email');
    const qName = searchParams.get('name');
    if (qEmail) setEmail(qEmail);
    if (qName) setName(qName);
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed) return setError('Please agree to Terms of Service and Privacy Policy');
    setError('');
    setLoading(true);

    try {
      await signupForRole('seeker', name, email, password, contact);
      navigate('/seeker/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credential) => {
    setError('');
    setLoading(true);
    try {
      await googleRegister(credential, 'seeker', contact);
      navigate('/seeker/dashboard');
    } catch (err) {
      setError(err.message || 'Google registration failed');
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
            <img src="/logo.png" alt="PlanToPark" className="h-10 w-10 object-contain rounded" />
            <span className="font-black text-2xl text-slate-900 tracking-tight">Plan<span className="text-blue-600">To</span>Park</span>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-sans">
            Create 'I want parking' Account
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            Find nearby parking spots tailored for your vehicle
          </p>
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
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Arjun Malhotra"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="arjun@email.com"
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
                I agree to PlanToPark's{' '}
                <Link to="/terms" onClick={e => e.stopPropagation()} className="text-blue-600 hover:underline font-semibold">Terms of Service</Link> and{' '}
                <Link to="/privacy-policy" onClick={e => e.stopPropagation()} className="text-blue-600 hover:underline font-semibold">Privacy Policy</Link>.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-blue-600/20 text-sm disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating Account...
                </span>
              ) : 'Register (I want parking)'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-3 text-slate-400 font-bold">Or sign up with</span>
            </div>
          </div>

          {/* Google Sign Up Button */}
          <GoogleAuthButton
            onCredentialSuccess={handleGoogleSuccess}
            text="signup_with"
            disabled={loading}
          />

          <p className="text-center text-sm text-slate-500 mt-5">
            Already have an account?{' '}
            <Link to="/seeker/login" className="text-blue-600 font-bold hover:underline">Sign in</Link>
          </p>

          <div className="border-t border-slate-100 mt-5 pt-4 text-center">
            <Link to="/owner/register" className="text-xs text-slate-400 hover:text-slate-600 font-semibold">
              Are you a Parking Owner? (I have parking) Register Here →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeekerRegister;
