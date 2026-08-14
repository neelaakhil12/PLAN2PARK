import React, { useEffect } from 'react';
import { ShieldCheck, Heart, MapPin, Users, Award, Lightbulb, Zap, Globe, Clock, CheckCircle } from 'lucide-react';
import Typewriter from '../components/Typewriter';
import ScrollReveal from '../components/ScrollReveal';

const About = () => {
  useEffect(() => {
    document.title = 'About Us | Plan To Park - Park Smart. Earn Smart.';
    let m = document.querySelector('meta[name="description"]');
    if (!m) { m = document.createElement('meta'); m.setAttribute('name', 'description'); document.head.appendChild(m); }
    m.setAttribute('content', "Learn about Plan To Park, India's most trusted digital parking marketplace connecting vehicle owners with available parking spaces.");
  }, []);

  return (
    <div className="bg-slate-50 min-h-screen text-slate-800 font-sans overflow-hidden" id="seo-about-page">

      {/* ── HERO ── */}
      <section className="bg-gradient-to-tr from-slate-900 to-indigo-950 text-white py-14 sm:py-20 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_30%_30%,rgba(249,115,22,0.15),transparent)]" />
        <div className="max-w-5xl mx-auto flex flex-col lg:flex-row items-center gap-10 lg:gap-14 relative z-10">

          {/* Text */}
          <div className="w-full lg:flex-1 space-y-5 text-center lg:text-left">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-orange-500/10 border border-orange-500/20 text-orange-400">
              <ShieldCheck className="h-3.5 w-3.5" /> COMPANY OVERVIEW
            </span>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight min-h-[5rem] sm:min-h-[6rem]">
              <Typewriter text="Park Smart." speed={50} delay={800} /><br />
              <span className="text-orange-400">
                <Typewriter text="Earn Smart." speed={50} delay={1600} />
              </span>
            </h1>
            <ScrollReveal direction="up" delay={400}>
              <p className="text-slate-300 text-sm sm:text-base lg:text-lg leading-relaxed max-w-lg mx-auto lg:mx-0">
                Plan To Park is an Indian technology company building the country's most trusted digital parking marketplace.
              </p>
            </ScrollReveal>
          </div>

          {/* Image */}
          <div className="w-full lg:flex-1 max-w-sm sm:max-w-md lg:max-w-none mx-auto">
            <ScrollReveal direction="left" delay={500}>
              <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10 group bg-slate-900/50">
                <img
                  src="/images/about_illustration.jpg"
                  alt="Plan To Park community grid concept"
                  className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1573348722427-f1d6819fdf98?auto=format&fit=crop&q=80&w=800'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-left">
                  <span className="text-[10px] uppercase tracking-widest text-orange-400 font-bold">Making Cities Smarter</span>
                  <p className="text-xs text-slate-200 mt-1 font-medium">Transforming every unused parking space into an opportunity.</p>
                </div>
              </div>
            </ScrollReveal>
          </div>

        </div>
      </section>

      {/* ── VISION & MISSION ── */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 bg-white relative z-20">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-10">
          <ScrollReveal direction="right" className="flex-1 bg-slate-50 border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="h-12 w-12 rounded-2xl bg-orange-100 border border-orange-200 flex items-center justify-center mb-6">
              <Globe className="h-6 w-6 text-orange-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-950 mb-4">Our Vision</h2>
            <p className="text-slate-600 font-medium mb-4">
              To build India's largest and most trusted parking marketplace, where every available parking space can be discovered, booked, and monetized through technology.
            </p>
            <ul className="space-y-2">
              {[
                'Finding parking takes less than two minutes.',
                'Every unused parking space becomes a source of income.',
                'Cities experience less congestion and pollution.',
                'Parking becomes completely digital, secure, and transparent.',
                'Plan To Park becomes an essential part of everyday urban mobility.'
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-500">
                  <CheckCircle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </ScrollReveal>

          <ScrollReveal direction="left" className="flex-1 bg-slate-50 border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="h-12 w-12 rounded-2xl bg-orange-100 border border-orange-200 flex items-center justify-center mb-6">
              <ShieldCheck className="h-6 w-6 text-orange-500" />
            </div>
            <h2 className="text-2xl font-black text-slate-950 mb-4">Our Mission</h2>
            <p className="text-slate-600 font-medium">
              To simplify parking by connecting people with available parking spaces through a secure, smart, and easy-to-use platform while helping property owners earn additional income from their unused spaces.
            </p>
            <div className="mt-8">
              <h3 className="text-lg font-bold text-slate-900 mb-3">Our Purpose</h3>
              <p className="text-sm text-slate-500 mb-3">We are not just creating a parking app. We are creating a platform that helps people:</p>
              <ul className="grid grid-cols-2 gap-2">
                {[
                  'Save time', 'Earn passive income', 'Improve urban mobility', 'Build smarter cities', 'Use resources efficiently'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-lg">
                    <Zap className="h-3.5 w-3.5 text-orange-400" /> {item}
                  </li>
                ))}
              </ul>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ── CORE VALUES ── */}
      <section className="py-14 sm:py-20 px-4 sm:px-6 bg-slate-50 border-t border-slate-200/60">
        <div className="max-w-6xl mx-auto space-y-10">
          <ScrollReveal direction="up" className="text-center max-w-2xl mx-auto space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950">Our Core Values</h2>
            <p className="text-slate-500 text-sm sm:text-base">The principles that drive Plan To Park forward.</p>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {[
              { title: 'Trust', desc: 'Verified users, verified parking locations, and transparent pricing.', icon: <ShieldCheck className="h-6 w-6 text-blue-500" /> },
              { title: 'Innovation', desc: 'Building intelligent parking solutions powered by technology.', icon: <Lightbulb className="h-6 w-6 text-amber-500" /> },
              { title: 'Community', desc: 'Helping people earn from assets they already own.', icon: <Users className="h-6 w-6 text-purple-500" /> },
              { title: 'Simplicity', desc: 'Making parking as easy as booking a cab.', icon: <CheckCircle className="h-6 w-6 text-emerald-500" /> },
              { title: 'Sustainability', desc: 'Reducing unnecessary traffic, fuel consumption, and carbon emissions by minimizing the time spent searching for parking.', icon: <Globe className="h-6 w-6 text-green-600" /> },
            ].map((item, i) => (
              <ScrollReveal key={i} direction="up" delay={i * 100} className="h-full">
                <div className="bg-white border border-slate-200/60 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4 group h-full">
                  <div className="h-12 w-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-base sm:text-lg mb-2">{item.title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER STATEMENT ── */}
      <section className="bg-white border-t border-slate-200/60 py-14 sm:py-20 px-4 sm:px-6 text-center">
        <ScrollReveal direction="up" className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
            Every parking space matters.<br />
            Every minute saved matters.<br />
            <span className="text-orange-500">Every earning opportunity matters.</span>
          </h2>
          <p className="text-lg text-slate-500 font-medium">That is the future Plan To Park is building.</p>
        </ScrollReveal>
      </section>

    </div>
  );
};

export default About;
