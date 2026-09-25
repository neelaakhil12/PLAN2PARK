import React, { useState, useContext } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { User, Mail, Phone, Lock, AlertCircle, CheckSquare, Square, Building2, Eye, EyeOff, ShieldCheck, MapPin } from 'lucide-react';

const OwnerRegister = () => {
  const { signupForRole } = useContext(AuthContext);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [category, setCategory] = useState(
    searchParams.get('category') === 'vehicle_storage_owner' ? 'vehicle_storage_owner' : 'standard'
  );
  const isStorageYard = category === 'vehicle_storage_owner';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [contact, setContact] = useState('');
  
  // Storage Yard fields
  const [landAcres, setLandAcres] = useState('1.0');
  const [fencingType, setFencingType] = useState('Compound Wall');
  const [hasSecurityGuards, setHasSecurityGuards] = useState(true);

  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agreed) return setError('Please agree to Terms of Service and Privacy Policy');

    if (isStorageYard) {
      const acres = parseFloat(landAcres);
      if (isNaN(acres) || acres < 1.0) {
        return setError('Mandatory Policy: Minimum 1.0 contiguous Acre of land is strictly required to register as a Vehicle Storage Partner.');
      }
    }

    setError('');
    setLoading(true);

    try {
      const extra = {
        accountCategory: isStorageYard ? 'vehicle_storage_owner' : 'standard',
      };
      if (isStorageYard) {
        extra.landAcres = parseFloat(landAcres);
        extra.fencingType = fencingType;
        extra.hasSecurityGuards = hasSecurityGuards;
      }

      await signupForRole('owner', name, email, password, contact, extra);
      navigate('/owner/dashboard');
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
            {isStorageYard ? 'Register Vehicle Storage Yard' : 'Register Parking Space Host'}
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1">
            {isStorageYard ? 'Monetize 1+ Acre secure land for Bank repossession stockyards' : 'List your driveway or parking bays for hourly seekers'}
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
            <Building2 className="h-3.5 w-3.5" /> Standard Host
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
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                {isStorageYard ? 'Landowner / Representative Name' : 'Full Name'}
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Rajesh Reddy"
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
                  placeholder="rajesh@example.com"
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

            {/* Commercial Vehicle Storage Fields */}
            {isStorageYard && (
              <div className="bg-amber-50/50 border border-amber-200 rounded-xl p-4 space-y-3.5">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-black uppercase tracking-wider text-amber-950">
                      Total Contiguous Land (Acres)
                    </label>
                    <span className="text-[10px] font-black bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
                      Min 1.0 Acre
                    </span>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    min="1.0"
                    required
                    value={landAcres}
                    onChange={e => setLandAcres(e.target.value)}
                    placeholder="1.0"
                    className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-slate-800 font-bold text-sm focus:outline-none ${
                      parseFloat(landAcres) < 1.0 ? 'border-rose-500 ring-2 ring-rose-100' : 'border-amber-300 focus:border-amber-500'
                    }`}
                  />
                  {parseFloat(landAcres) < 1.0 && (
                    <p className="text-[11px] font-bold text-rose-600 mt-1">
                      Minimum 1.0 Acre is mandatory for repossession holding contracts!
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-amber-950 mb-1.5">
                    Boundary / Fencing Type
                  </label>
                  <select
                    value={fencingType}
                    onChange={e => setFencingType(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-amber-500"
                  >
                    <option value="Compound Wall">Concrete Compound Wall (Recommended)</option>
                    <option value="High Chain-link Fencing">High Chain-link Steel Fencing</option>
                    <option value="Barbed Wire & Post">Barbed Wire with Posts</option>
                    <option value="Other Secured Boundary">Other Secured Boundary</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="guards"
                    checked={hasSecurityGuards}
                    onChange={e => setHasSecurityGuards(e.target.checked)}
                    className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
                  />
                  <label htmlFor="guards" className="text-xs font-bold text-slate-700 cursor-pointer">
                    24/7 Security Guards on premises (or will be assigned)
                  </label>
                </div>
              </div>
            )}

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
                <span className="font-semibold text-slate-700">Commercial Storage Guidelines</span>.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full font-bold py-3.5 rounded-xl transition-all shadow-md text-sm disabled:opacity-60 disabled:cursor-not-allowed mt-2 ${
                isStorageYard
                  ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-amber-500/20'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                  Creating Account...
                </span>
              ) : isStorageYard ? 'Register Vehicle Storage Yard' : 'Register Parking Space Host'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-6">
            Already have an account?{' '}
            <Link to={isStorageYard ? "/owner/login?category=vehicle_storage_owner" : "/owner/login"} className="text-blue-600 font-bold hover:underline">Sign in</Link>
          </p>

          <div className="border-t border-slate-100 mt-5 pt-4 text-center">
            <Link to="/seeker/register" className="text-xs text-slate-400 hover:text-slate-600 font-semibold">
              Looking to Park or Store Seized Vehicles? Seeker / Bank Sign Up →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OwnerRegister;
