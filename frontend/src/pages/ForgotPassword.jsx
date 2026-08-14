import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Mail, AlertCircle, CheckCircle, ArrowRight, KeyRound } from 'lucide-react';
import { API_URL } from '../config/api';

const ForgotPassword = () => {
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get('role') || 'seeker';

  const [email, setEmail] = useState('');
  const [role, setRole] = useState(defaultRole);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to send reset link.');
      }

      setSuccess(data.message || 'Password reset link and OTP sent to your registered email.');
    } catch (err) {
      setError(err.message || 'Could not send password reset request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-4">
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold px-3.5 py-1 rounded-full flex items-center gap-1.5">
            <KeyRound className="h-3.5 w-3.5" /> Account Recovery
          </span>
        </div>

        <h1 className="text-3xl font-extrabold text-slate-900 text-center mb-2 font-sans">Forgot Password?</h1>
        <p className="text-slate-400 text-center text-sm mb-8">
          Enter your registered email address to receive password reset instructions.
        </p>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          {error && (
            <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-600 p-3.5 rounded-xl mb-5 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl mb-5 text-sm">
              <CheckCircle className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600" />
              <div>
                <p className="font-bold mb-1">Check Your Email Inbox</p>
                <p>{success}</p>
                <Link
                  to={`/reset-password?email=${encodeURIComponent(email)}`}
                  className="inline-block mt-3 text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-lg hover:bg-emerald-200 transition-all"
                >
                  Enter 6-Digit OTP Code →
                </Link>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Select Account Type */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Account Role</label>
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 text-sm font-medium"
              >
                <option value="seeker">Parking Seeker</option>
                <option value="owner">Parking Space Owner</option>
                <option value="admin">System Administrator</option>
              </select>
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Registered Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-md shadow-emerald-500/20 flex items-center justify-center gap-2 text-sm disabled:opacity-60 mt-2"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Sending Email...
                </>
              ) : (
                <>Send Reset Link &amp; OTP <ArrowRight className="h-4 w-4" /></>
              )}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Remembered your password?{' '}
            <Link to={role === 'owner' ? '/owner/login' : '/seeker/login'} className="text-emerald-600 font-bold hover:underline">
              Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
