import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  User, Mail, Phone, Lock, AlertCircle, LayoutGrid, Building2, CheckSquare, Square
} from 'lucide-react';

const Register = () => {
  const { signup } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [contact, setContact] = useState('');
  const [role, setRole] = useState('seeker');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const urlRole = params.get('role');
    if (urlRole && ['seeker', 'owner'].includes(urlRole)) setRole(urlRole);
  }, [location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed) return setError('Please agree to Terms of Service and Privacy Policy');
    setError('');
    setLoading(true);

    try {
      const data = await signup(name, email, password, role, contact);
      if (data.role === 'owner') {
        navigate('/owner/dashboard');
      } else {
        navigate('/seeker/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-extrabold text-slate-900 text-center mb-8 font-sans">
          Create your account
        </h1>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          {/* Role Toggle */}
          <div className="mb-6">
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold text-center mb-3">
              I want to register as a
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('seeker')}
                className={`flex flex-col items-center gap-2 py-4 px-3 rounded-xl border-2 transition-all font-semibold text-sm ${
                  role === 'seeker'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}
              >
                <LayoutGrid className={`h-6 w-6 ${role === 'seeker' ? 'text-emerald-500' : 'text-slate-400'}`} />
                <span className="font-bold">I want parking</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('owner')}
                className={`flex flex-col items-center gap-2 py-4 px-3 rounded-xl border-2 transition-all font-semibold text-sm ${
                  role === 'owner'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                }`}
              >
                <Building2 className={`h-6 w-6 ${role === 'owner' ? 'text-emerald-500' : 'text-slate-400'}`} />
                <span className="font-bold">I have parking</span>
              </button>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-600 p-3.5 rounded-xl mb-5 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Arjun Malhotra"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all text-sm"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="arjun@email.com"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all text-sm"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={contact}
                  onChange={e => setContact(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all text-sm"
                />
              </div>
            </div>

            {/* Terms & Conditions */}
            <div
              className="flex items-start gap-2.5 cursor-pointer group"
              onClick={() => setAgreed(!agreed)}
            >
              <div className={`mt-0.5 shrink-0 transition-colors ${agreed ? 'text-emerald-500' : 'text-slate-300'}`}>
                {agreed
                  ? <CheckSquare className="h-5 w-5" />
                  : <Square className="h-5 w-5" />
                }
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                I agree to Plantopark's{' '}
                <a href="#" onClick={e => e.stopPropagation()} className="text-emerald-600 hover:underline font-semibold">Terms of Service</a>,{' '}
                <a href="#" onClick={e => e.stopPropagation()} className="text-emerald-600 hover:underline font-semibold">Privacy Policy</a>,
                {role === 'owner' && (
                  <> and <a href="#" onClick={e => e.stopPropagation()} className="text-emerald-600 hover:underline font-semibold">Host Rules</a></>
                )}.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-emerald-500/20 text-sm disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Creating Account...
                </span>
              ) : 'Register Account'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-emerald-600 font-bold hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
