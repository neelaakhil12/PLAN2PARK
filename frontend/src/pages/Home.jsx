import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  Search, MapPin, Clock, ShieldCheck, Car, CheckCircle
} from 'lucide-react';
import Typewriter from '../components/Typewriter';
import ScrollReveal from '../components/ScrollReveal';

const DURATIONS = ['1 Hour', '2 Hours', '3 Hours', '4 Hours', '6 Hours', '12 Hours', 'Full Day'];

const Home = () => {
  const { user, token, API_URL } = useContext(AuthContext);
  const navigate = useNavigate();
  const [spaces, setSpaces] = useState([]);
  const [search, setSearch] = useState('');
  const [duration, setDuration] = useState('2 Hours');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Home | Plan To Park - Park Smart. Earn Smart.";
    let m = document.querySelector('meta[name="description"]');
    if (!m) { m = document.createElement('meta'); m.setAttribute('name', 'description'); document.head.appendChild(m); }
    m.setAttribute('content', "Discover safe, verified parking spaces near you or monetize your empty driveway with Plan To Park — India's premier digital parking marketplace.");
  }, []);

  useEffect(() => {
    const fetch$ = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/spaces?search=${search}`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok) setSpaces(data);
      } catch (e) { console.error(e); }
      setLoading(false);
    };
    const t = setTimeout(fetch$, 300);
    return () => clearTimeout(t);
  }, [search, token, API_URL]);

  const handleBook = (id) => {
    if (!user) return navigate('/login');
    if (user.role !== 'seeker') return alert('Only Parking Seekers can book.');
    if (user.status !== 'verified') return alert('Your account is awaiting admin verification.');
    navigate(`/seeker/dashboard?bookSpace=${id}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans overflow-hidden" id="seo-home-landing">

      {/* ── HERO ── */}
      <section className="bg-white border-b border-slate-200/60 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_15%_20%,rgba(16,185,129,0.06),transparent_60%)]" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-14 relative z-10">

          {/* Two-column on lg+, stack on mobile */}
          <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-14">

            {/* LEFT: text + search */}
            <div className="w-full lg:flex-1 flex flex-col gap-5 text-center lg:text-left items-center lg:items-start">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-orange-50 border border-orange-200 text-orange-700 animate-pulse">
                <ShieldCheck className="h-3.5 w-3.5" /> INDIA'S MOST TRUSTED PARKING MARKETPLACE
              </span>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-950 leading-[1.1] min-h-[5.5rem] sm:min-h-[7rem] lg:min-h-[8rem]">

                <Typewriter text="Park Smart." speed={60} delay={800} /><br />
                <span className="text-orange-500">
                  <Typewriter text="Earn Smart." speed={60} delay={1600} />
                </span>
              </h1>

              <ScrollReveal direction="up" delay={200} className="w-full flex flex-col gap-5 text-center lg:text-left items-center lg:items-start">
                <p className="text-slate-500 text-sm sm:text-base lg:text-lg max-w-lg leading-relaxed">
                  Transform your unused parking space into an income opportunity, or find safe, verified parking when you need it.
                </p>

                {/* Search card */}
                <div className="w-full max-w-xl bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
                  {/* Location row */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100">
                    <MapPin className="h-4 w-4 text-emerald-500 shrink-0" />
                    <div className="flex flex-col w-full text-left">
                      <span className="text-[9px] uppercase tracking-widest text-slate-400 font-black">Location</span>
                      <input
                        id="search-input-home"
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Enter city or locality…"
                        className="text-sm font-semibold text-slate-800 placeholder-slate-400 bg-transparent focus:outline-none"
                      />
                    </div>
                  </div>
                  {/* Duration + CTA row */}
                  <div className="flex flex-col sm:flex-row gap-0">
                    <div className="flex items-center gap-3 px-4 py-3 sm:border-r border-slate-100 flex-1">
                      <Clock className="h-4 w-4 text-emerald-500 shrink-0" />
                      <div className="flex flex-col text-left">
                        <span className="text-[9px] uppercase tracking-widest text-slate-400 font-black">Duration</span>
                        <select
                          value={duration}
                          onChange={e => setDuration(e.target.value)}
                          className="text-sm font-semibold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                        >
                          {DURATIONS.map(d => <option key={d}>{d}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="px-3 py-3 flex items-center justify-center sm:justify-end">
                      <button
                        onClick={() => token ? navigate('/seeker/dashboard') : navigate('/login')}
                        className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-black px-6 py-3 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm shadow-md shadow-emerald-500/20"
                      >
                        <Search className="h-4 w-4" /> Find Space
                      </button>
                    </div>
                  </div>
                </div>

                {/* Trust strip */}
                <div className="flex items-center justify-center lg:justify-start gap-3 text-xs text-slate-400 flex-wrap">
                  <div className="flex -space-x-2">
                    {['🚗', '🚙', '🛵'].map((e, i) => (
                      <div key={i} className="h-7 w-7 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-sm shadow-sm">{e}</div>
                    ))}
                  </div>
                  <span>Join <strong className="text-slate-600">50,000+</strong> commuters saving time &amp; fuel daily.</span>
                </div>
              </ScrollReveal>
            </div>

            {/* RIGHT: hero image */}
            <div className="w-full lg:flex-1 max-w-lg lg:max-w-none mx-auto">
              <ScrollReveal direction="left" delay={400}>
                <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-slate-100 group aspect-video lg:aspect-auto">
                  <img
                    src="/images/parking_hero.jpg"
                    alt="Futuristic smart parking city illustration"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-left">
                    <span className="bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">India's Smart P2P Tech</span>
                    <p className="text-sm font-bold text-white mt-2 leading-snug">Connecting underutilised garages to active commuters.</p>
                  </div>
                </div>
              </ScrollReveal>
            </div>

          </div>
        </div>
      </section>

      {/* ── STATS BAND ── */}
      <section className="py-10 sm:py-14 px-4 sm:px-6 border-b border-slate-200/60 bg-slate-50">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <ScrollReveal direction="up" delay={100} className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-slate-200/60 shadow-sm text-left">
            <p className="text-3xl sm:text-4xl font-black text-slate-950">10,000+</p>
            <p className="font-extrabold text-slate-800 text-sm mt-1">Verified Parking Spots</p>
            <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">Each location passes security, gate clearance &amp; height checks.</p>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={250} className="rounded-2xl sm:rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/20 text-left relative overflow-hidden">
            <div className="absolute -top-5 -right-5 h-24 w-24 rounded-full bg-white/10 pointer-events-none" />
            <p className="text-3xl sm:text-4xl font-black">₹5 Cr+</p>
            <p className="font-extrabold text-sm mt-1">Earned by Driveway Hosts</p>
            <p className="text-emerald-100 text-xs mt-1.5 leading-relaxed">Turn empty driveways into high-yield payout assets.</p>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={400} className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 border border-slate-200/60 shadow-sm text-left">
            <p className="text-3xl sm:text-4xl font-black text-slate-950">100% Insured</p>
            <p className="font-extrabold text-slate-800 text-sm mt-1">Secured Bookings</p>
            <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">Digital check-ins, secure wallets, and resolved ticket support.</p>
          </ScrollReveal>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="py-14 sm:py-20 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <ScrollReveal direction="up" className="text-center mb-10 sm:mb-14 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950">How Plan To Park Works</h2>
            <p className="text-slate-500 text-sm sm:text-base max-w-lg mx-auto">Three simple steps for both commuters and host owners.</p>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-12">
            {/* Seeker */}
            <ScrollReveal direction="right" className="space-y-5 text-left">
              <h3 className="text-lg sm:text-xl font-black text-slate-900 border-b border-slate-200 pb-3 flex items-center gap-2">
                <span className="h-7 w-7 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center text-xs font-black shrink-0">1</span>
                For Parking Seekers
              </h3>
              {[
                ['Search Area', 'Enter your destination, duration &amp; vehicle type.'],
                ['Submit Booking', 'Await host slot-allotment approval.'],
                ['Secure Checkout', 'Pay digitally (90/10 split) and check in hassle-free.'],
              ].map(([title, desc], i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-emerald-500 font-extrabold text-sm shrink-0">Step {i + 1}.</span>
                  <p className="text-slate-600 text-sm"><strong className="text-slate-800">{title}</strong>: <span dangerouslySetInnerHTML={{ __html: desc }} /></p>
                </div>
              ))}
            </ScrollReveal>
            {/* Host */}
            <ScrollReveal direction="left" className="space-y-5 text-left">
              <h3 className="text-lg sm:text-xl font-black text-slate-900 border-b border-slate-200 pb-3 flex items-center gap-2">
                <span className="h-7 w-7 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-xs font-black shrink-0">2</span>
                For Driveway Hosts
              </h3>
              {[
                ['List Driveway', 'Upload photos via Cloudinary and set hourly rates.'],
                ['Allot Bookings', 'Accept requests, assign slots, confirm check-ins.'],
                ['Weekly Payouts', 'Receive automatic 90% revenue split every Saturday.'],
              ].map(([title, desc], i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-blue-500 font-extrabold text-sm shrink-0">Step {i + 1}.</span>
                  <p className="text-slate-600 text-sm"><strong className="text-slate-800">{title}</strong>: {desc}</p>
                </div>
              ))}
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── SPACES GRID ── */}
      <section className="px-4 sm:px-6 py-12 sm:py-16 bg-white border-t border-slate-200/60">
        <div className="max-w-7xl mx-auto">
          <ScrollReveal direction="up" className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
            <div className="text-left">
              <h2 className="text-xl sm:text-2xl font-black text-slate-950">Approved Parking Spaces Near You</h2>
              <p className="text-slate-400 text-xs mt-1">Live verified driveway locations.</p>
            </div>
            {!token && (
              <Link to="/login" className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm whitespace-nowrap">
                Sign In to View
              </Link>
            )}
          </ScrollReveal>

          {!token ? (
            <ScrollReveal direction="up" delay={200} className="bg-slate-50 rounded-3xl border border-slate-200/60 p-10 sm:p-16 text-center max-w-3xl mx-auto">
              <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                <Car className="h-7 w-7 sm:h-8 sm:w-8 text-emerald-500" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-800 mb-2">Find Your Perfect Gated Spot</h3>
              <p className="text-slate-500 max-w-sm mx-auto mb-6 text-xs sm:text-sm leading-relaxed">
                Sign in to search, compare rates, and book instantly.
              </p>
              <div className="flex justify-center gap-3 flex-wrap">
                <Link to="/login" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-5 py-2.5 rounded-xl transition-colors text-sm">Sign In</Link>
                <Link to="/register" className="bg-white border border-slate-200 hover:border-emerald-300 text-slate-700 font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm">Register Free</Link>
              </div>
            </ScrollReveal>
          ) : loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map(n => <div key={n} className="h-72 sm:h-80 bg-slate-200 rounded-3xl animate-pulse" />)}
            </div>
          ) : spaces.length === 0 ? (
            <div className="bg-slate-50 rounded-3xl p-12 text-center border border-slate-200/60 max-w-lg mx-auto">
              <p className="text-slate-400 font-bold text-sm sm:text-base">No verified spaces available right now.</p>
              {search && <p className="text-slate-300 text-xs mt-1">Try a different area.</p>}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
              {spaces.map((space, idx) => {
                const avail = space.slots ? space.slots.filter(s => s.isAvailable).length : 0;
                return (
                  <ScrollReveal key={space._id} direction="up" delay={idx * 100} className="h-full">
                    <div className="bg-white rounded-3xl overflow-hidden border border-slate-200/60 flex flex-col hover:border-emerald-300 hover:shadow-lg transition-all duration-300 group h-full">
                      <div className="relative overflow-hidden h-40 sm:h-44">
                        <img src={space.image} alt="Parking spot" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute top-2.5 left-2.5">
                          <span className="bg-white/90 backdrop-blur-sm text-emerald-600 text-[10px] font-black px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                            <MapPin className="h-2.5 w-2.5" /> {space.location}
                          </span>
                        </div>
                        <div className="absolute top-2.5 right-2.5">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${avail > 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                            {avail > 0 ? `${avail} Free` : 'Full'}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 sm:p-5 flex flex-col flex-1 text-left justify-between">
                        <div>
                          <h3 className="font-extrabold text-sm text-slate-900 mb-0.5 truncate">{space.address}</h3>
                          <p className="text-slate-400 text-xs mb-3">Host: <strong className="text-slate-600">{space.ownerId?.name || 'Verified Host'}</strong></p>
                          <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl mb-3">
                            <div>
                              <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Rate</p>
                              <p className="font-black text-slate-900 text-sm">₹{space.pricePerHour}<span className="text-[10px] text-slate-400 font-medium">/hr</span></p>
                            </div>
                            <div>
                              <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Slots</p>
                              <p className={`font-black text-sm ${avail > 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{avail}/{space.totalSlots} Free</p>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleBook(space._id)}
                          disabled={avail === 0}
                          className={`w-full py-2.5 rounded-xl font-bold text-sm transition-colors ${avail > 0 ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                        >
                          {avail > 0 ? 'Book Spot' : 'Fully Booked'}
                        </button>
                      </div>
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA FOOTER BAND ── */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 bg-gradient-to-br from-slate-900 to-indigo-950 text-white text-center">
        <ScrollReveal direction="up" className="max-w-2xl mx-auto space-y-5">
          <h2 className="text-2xl sm:text-3xl font-black leading-tight">Ready to Park Smarter or Earn More?</h2>
          <p className="text-slate-400 text-sm sm:text-base">Join thousands of commuters and hosts already on Plan To Park.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 pt-2">
            <Link to="/seeker/register" className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-7 py-3 rounded-xl transition-colors text-sm shadow-md shadow-emerald-500/30">
              Find Parking Now
            </Link>
            <Link to="/owner/register" className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-bold px-7 py-3 rounded-xl transition-colors text-sm">
              List My Driveway
            </Link>
          </div>
        </ScrollReveal>
      </section>

    </div>
  );
};

export default Home;
