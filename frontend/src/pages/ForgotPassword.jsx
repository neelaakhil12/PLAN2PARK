import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Mail, Lock, AlertCircle, CheckCircle, ArrowRight, KeyRound, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { API_URL } from '../config/api';

const ForgotPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const roleParam = searchParams.get('role') || 'seeker';

  // If someone lands here with role=admin, redirect them to dedicated admin recovery
  useEffect(() => {
    if (roleParam === 'admin') {
      navigate('/admin/forgot-password', { replace: true });
    }
  }, [roleParam, navigate]);

  const role = roleParam === 'owner' ? 'owner' : 'seeker';
  const isOwner = role === 'owner';

  // 1 = Enter Email, 2 = Enter OTP + New Password
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
        body: JSON.stringify({ email: email.trim(), role }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to send password reset code.');
      }

      setSuccess(`Verification code sent to ${email.trim()}. Please check your email inbox.`);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Could not send reset code. Please check your email address.');
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
      setError('Please enter the 6-digit OTP code received in your email.');
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
          role,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Password reset failed.');
      }

      setSuccess(`Password updated successfully! Redirecting to ${isOwner ? 'Owner' : 'Seeker'} Sign In...`);
      setTimeout(() => {
        navigate(isOwner ? '/owner/login' : '/seeker/login');
      }, 2000);
    } catch (err) {
      setError(err.message || 'Could not reset password. Please check your OTP code.');
    } finally {
      setLoading(false);
    }
  };

  const accentColor = isOwner ? 'emerald' : 'blue';
  const roleTitle = isOwner ? 'Space Owner' : 'Parking Seeker';
  const roleBadge = isOwner ? '🏢 Space Owner Account' : '🅿️ Parking Seeker Account';
  const backToLoginUrl = isOwner ? '/owner/login' : '/seeker/login';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-4">
          <span className={`text-xs font-bold px-3.5 py-1 rounded-full flex items-center gap-1.5 border ${
            isOwner
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-blue-50 text-blue-700 border-blue-200'
          }`}>
            <KeyRound className="h-3.5 w-3.5" /> {roleBadge}
          </span>
        </div>

        <h1 className="text-3xl font-extrabold text-slate-900 text-center mb-2 font-sans">
          {roleTitle} Recovery
        </h1>
        <p className="text-slate-400 text-center text-sm mb-8">
          {step === 1
            ? `Enter your registered ${roleTitle.toLowerCase()} email to receive your 6-digit OTP.`
            : `Enter the 6-digit OTP sent to ${email} and choose your new password.`}
        </p>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
          {error && (
            <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-600 p-3.5 rounded-xl mb-5 text-sm animate-fadeIn">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className={`flex items-start gap-2 p-4 rounded-xl mb-5 text-sm animate-fadeIn border ${
              isOwner
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : 'bg-blue-50 border-blue-200 text-blue-700'
            }`}>
              <CheckCircle className={`h-5 w-5 shrink-0 mt-0.5 ${isOwner ? 'text-emerald-600' : 'text-blue-600'}`} />
              <span>{success}</span>
            </div>
          )}

          {step === 1 ? (
            /* STEP 1: Enter Email */
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Registered Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={isOwner ? "owner@example.com" : "seeker@example.com"}
                    className={`w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 focus:outline-none transition-all text-sm ${
                      isOwner
                        ? 'focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100'
                        : 'focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full text-white font-bold py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm disabled:opacity-60 mt-2 cursor-pointer ${
                  isOwner
                    ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                }`}
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Sending OTP Code...
                  </>
                ) : (
                  <>Send 6-Digit OTP <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
            </form>
          ) : (
            /* STEP 2: Enter OTP + New Password */
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* OTP */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-semibold text-slate-700">6-Digit Email OTP Code</label>
                  <button
                    type="button"
                    onClick={handleRequestOtp}
                    disabled={loading}
                    className={`text-xs font-bold flex items-center gap-1 cursor-pointer ${
                      isOwner ? 'text-emerald-600 hover:underline' : 'text-blue-600 hover:underline'
                    }`}
                  >
                    <RefreshCw className="h-3 w-3" /> Resend OTP
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otpCode}
                    onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className={`w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 focus:outline-none transition-all text-sm font-mono font-bold text-center tracking-widest text-lg ${
                      isOwner
                        ? 'focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100'
                        : 'focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
                    }`}
                  />
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 focus:outline-none transition-all text-sm ${
                      isOwner
                        ? 'focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100'
                        : 'focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-10 py-3 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-300 focus:outline-none transition-all text-sm ${
                      isOwner
                        ? 'focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100'
                        : 'focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full text-white font-bold py-3.5 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 text-sm disabled:opacity-60 mt-2 cursor-pointer ${
                  isOwner
                    ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20'
                }`}
              >
                {loading ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Resetting Password...
                  </>
                ) : (
                  <>Save New Password &amp; Sign In <ArrowRight className="h-4 w-4" /></>
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

          <p className="text-center text-sm text-slate-500 mt-6 pt-5 border-t border-slate-100">
            Remembered your password?{' '}
            <Link to={backToLoginUrl} className={`font-bold hover:underline ${
              isOwner ? 'text-emerald-600' : 'text-blue-600'
            }`}>
              Back to Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
