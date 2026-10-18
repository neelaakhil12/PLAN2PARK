import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldAlert, Mail, Lock, AlertCircle, CheckCircle, ArrowRight, KeyRound, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { API_URL } from '../config/api';

const AdminForgotPassword = () => {
  const navigate = useNavigate();

  // Step state: 1 = Enter Email, 2 = Enter OTP + New Password
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Step 1: Request OTP
  const handleRequestOtp = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), role: 'admin' }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to send admin reset code.');
      }

      setSuccess(`Verification code sent to ${email.trim()}. Please check your admin email inbox.`);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Could not send reset code. Please check your admin email.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    if (newPassword.length < 4) {
      setError('New password must be at least 4 characters long.');
      return;
    }

    if (!otpCode || otpCode.trim().length !== 6) {
      setError('Please enter the valid 6-digit OTP code received in your email.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          otpCode: otpCode.trim(),
          newPassword,
          role: 'admin',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to reset admin password.');
      }

      setSuccess('Admin password reset successfully! Redirecting to Admin Login...');
      setTimeout(() => {
        navigate('/admin/login');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Could not reset password. Please check your OTP code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-rose-50 via-slate-50 to-slate-100 flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-96 h-96 rounded-full bg-rose-400/20 blur-3xl mix-blend-multiply filter animate-pulse"></div>
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-96 h-96 rounded-full bg-red-300/20 blur-3xl mix-blend-multiply filter animate-pulse" style={{ animationDelay: '2s' }}></div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <span className="bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
              <ShieldAlert className="h-4 w-4" /> Administrative Recovery
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-rose-600 to-red-700 tracking-tight mb-3">
            Admin Password Reset
          </h1>
          <p className="text-slate-500 font-medium text-sm sm:text-base">
            {step === 1
              ? 'Enter your registered administrator email to receive a 6-digit OTP'
              : `Enter the 6-digit code sent to ${email} and choose a new password`}
          </p>
        </div>

        <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] border border-white p-6 sm:p-8 shadow-2xl shadow-rose-900/5">
          {error && (
            <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-600 p-4 rounded-xl mb-6 text-sm font-medium animate-fadeIn">
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-xl mb-6 text-sm font-medium animate-fadeIn">
              <CheckCircle className="h-5 w-5 shrink-0 mt-0.5 text-emerald-600" />
              <span>{success}</span>
            </div>
          )}

          {step === 1 ? (
            /* STEP 1: Enter Email */
            <form onSubmit={handleRequestOtp} className="space-y-5">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Registered Admin Email</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-rose-500 transition-colors" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="admin@plantopark.com"
                    className="w-full pl-12 pr-4 py-3.5 bg-white/50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-50 transition-all font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-extrabold py-4 rounded-xl transition-all shadow-lg shadow-rose-600/30 hover:shadow-rose-600/40 hover:-translate-y-0.5 flex items-center justify-center gap-2 text-base disabled:opacity-60 disabled:hover:translate-y-0 mt-4 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending OTP Code...
                  </>
                ) : (
                  <>Send 6-Digit OTP <ArrowRight className="h-5 w-5" /></>
                )}
              </button>
            </form>
          ) : (
            /* STEP 2: Enter OTP + New Password */
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* OTP Code */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-bold text-slate-700">6-Digit Verification Code</label>
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={loading}
                    className="text-xs text-rose-600 hover:underline font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" /> Resend Code
                  </button>
                </div>
                <div className="relative group">
                  <KeyRound className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-rose-500 transition-colors" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full pl-12 pr-4 py-3 bg-white/50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-50 transition-all font-mono font-black text-lg tracking-widest"
                  />
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">New Security Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-rose-500 transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-3 bg-white/50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-50 transition-all font-medium text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-3.5 text-slate-400 hover:text-rose-500 transition-colors focus:outline-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Confirm New Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400 group-focus-within:text-rose-500 transition-colors" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-3 bg-white/50 border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-400 focus:ring-4 focus:ring-rose-50 transition-all font-medium text-sm"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-extrabold py-4 rounded-xl transition-all shadow-lg shadow-rose-600/30 hover:shadow-rose-600/40 hover:-translate-y-0.5 flex items-center justify-center gap-2 text-base disabled:opacity-60 disabled:hover:translate-y-0 mt-4 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  <>Save New Password &amp; Login <ArrowRight className="h-5 w-5" /></>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-700 font-semibold py-1 cursor-pointer"
              >
                ← Change Email ({email})
              </button>
            </form>
          )}

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <Link
              to="/admin/login"
              className="text-xs font-bold text-slate-600 hover:text-rose-600 transition-colors inline-flex items-center gap-1"
            >
              ← Back to Admin Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminForgotPassword;
