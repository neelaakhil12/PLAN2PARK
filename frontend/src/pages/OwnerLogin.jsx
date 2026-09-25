import React, { useState, useContext } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Mail, Lock, AlertCircle, ArrowRight, Building2, Eye, EyeOff, ShieldCheck } from 'lucide-react';

const OwnerLogin = () => {
  const { loginForRole } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [category, setCategory] = useState(
    searchParams.get('category') === 'vehicle_storage_owner' ? 'vehicle_storage_owner' : 'standard'
  );
  const isStorageYard = category === 'vehicle_storage_owner';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await loginForRole('owner', email, password);
      navigate('/owner/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password');
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
            {isStorageYard ? 'Vehicle Storage Partner Login' : 'Host / Landowner Login'}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            {isStorageYard ? 'Access your 1+ Acre bank repossession stockyard dashboard' : 'Sign in to manage parking listings & track earnings'}
          </p>
        </div>

        {/* Portal Switcher Tabs */}
        <div className="flex bg-slate-200 p-1 rounded-xl mb-5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setCategory('standard')}
            className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              !isStorageYard ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="h-3.5 w-3.5" /> Parking Host
          </button>
          <button
            type="button"
            onClick={() => setCategory('vehicle_storage_owner')}
            className={`flex-1 py-2.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              isStorageYard ? 'bg-amber-500 text-slate-950 font-black shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" /> Vehicle Storage (1+ Ac)
          </button>
        </div>

        {/* Mandatory Policy Warning for Storage Yard */}
        {isStorageYard && (
          <div className="bg-amber-500/10 border-2 border-amber-400 rounded-2xl p-4 mb-5 text-left">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">⚠️</span>
              <span className="text-xs font-black uppercase text-amber-950 tracking-wider">
                MANDATORY POLICY REQUIREMENT
              </span>
            </div>
            <p className="text-xs text-amber-900 leading-relaxed font-medium">
              Authorized Vehicle Storage Partner registration strictly requires <strong className="font-extrabold text-amber-950 underline decoration-amber-500">minimum 1.0 Acre contiguous land</strong> with compound wall or fencing for secure bank repossession fleets.
            </p>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8">
          {error && (
            <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-600 p-3.5 rounded-xl mb-5 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
                  placeholder="host@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Password</label>
                <Link to="/forgot-password?role=owner" className="text-xs text-blue-600 hover:underline font-semibold">Forgot password?</Link>
              </div>
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

            <button
              type="submit"
              disabled={loading}
              className={`w-full font-bold py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm disabled:opacity-60 mt-2 ${
                isStorageYard
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-amber-500/20'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
              }`}
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Signing In...
                </>
              ) : (
                <>{isStorageYard ? 'Sign In to Storage Dashboard' : 'Sign In as Host'} <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have an account?{' '}
            <Link
              to={isStorageYard ? "/owner/register?category=vehicle_storage_owner" : "/owner/register"}
              className="text-blue-600 font-bold hover:underline"
            >
              Sign up free
            </Link>
          </p>

          <div className="border-t border-slate-100 mt-5 pt-4 text-center">
            <Link to="/seeker/login" className="text-xs text-slate-400 hover:text-slate-600 font-semibold">
              Looking for Parking or Bank Repo Yards? Seeker / Bank Login →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerLogin;
