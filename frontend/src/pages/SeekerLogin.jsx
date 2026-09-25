import React, { useState, useContext } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Mail, Lock, AlertCircle, ArrowRight, Car, Landmark, Eye, EyeOff } from 'lucide-react';

const SeekerLogin = () => {
  const { loginForRole } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [category, setCategory] = useState(
    searchParams.get('category') === 'bank_finance_seeker' ? 'bank_finance_seeker' : 'standard'
  );
  const isBankSeeker = category === 'bank_finance_seeker';

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
      await loginForRole('seeker', email, password);
      navigate('/seeker/dashboard');
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
            {isBankSeeker ? 'Banks & Auto Finance Login' : 'Parking Seeker Login'}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            {isBankSeeker ? 'Locate & manage secure repossession storage stockyards' : 'Sign in to search, book and navigate to parking spaces'}
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
            <Car className="h-3.5 w-3.5" /> Parking Seeker
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
                  placeholder="seeker@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">Password</label>
                <Link to="/forgot-password?role=seeker" className="text-xs text-blue-600 hover:underline font-semibold">Forgot password?</Link>
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
                isBankSeeker
                  ? 'bg-cyan-600 hover:bg-cyan-700 text-white font-black shadow-cyan-600/20'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
              }`}
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Signing In...
                </>
              ) : (
                <>{isBankSeeker ? 'Sign In as Auto Finance Team' : 'Sign In as Seeker'} <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Don't have an account?{' '}
            <Link
              to={isBankSeeker ? "/seeker/register?category=bank_finance_seeker" : "/seeker/register"}
              className="text-blue-600 font-bold hover:underline"
            >
              Sign up free
            </Link>
          </p>

          <div className="border-t border-slate-100 mt-5 pt-4 text-center">
            <Link to="/owner/login" className="text-xs text-slate-400 hover:text-slate-600 font-semibold">
              Are you a Parking Owner or Storage Yard Partner? Host Login →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SeekerLogin;
