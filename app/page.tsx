'use client';

import React, { useEffect, useState } from 'react';
import { dbService, UserProfile } from '@/lib/db';
import { 
  LucideZap, 
  LucideSparkles, 
  LucideTrendingUp, 
  LucideFileText, 
  LucideCode, 
  LucideDatabase, 
  LucideMegaphone, 
  LucideDollarSign, 
  LucideUsers, 
  LucideArrowRight 
} from 'lucide-react';
import Link from 'next/link';
import ProfileDropdown from '@/components/ProfileDropdown';

export default function Home() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = () => {
      dbService.getCurrentUser().then((profile) => {
        setUser(profile);
        setLoading(false);
      });
    };
    fetchUser();

    window.addEventListener('user-profile-updated', fetchUser);
    return () => window.removeEventListener('user-profile-updated', fetchUser);
  }, []);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#09090b] text-[#fafafa] hero-gradient">
      
      {/* Background blobs */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-[#6366f1]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] rounded-full bg-[#a855f7]/5 blur-[120px] pointer-events-none" />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 p-6 flex justify-between items-center bg-[#09090b]/50 backdrop-blur-md border-b border-white/5">
        <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-3 cursor-pointer">
          <div className="w-8 h-8 rounded-lg bg-[#6366f1] rotate-12 flex items-center justify-center shadow-lg shadow-[#6366f1]/30">
            <span className="text-white font-extrabold text-lg">W</span>
          </div>
          <span className="text-xl font-black tracking-tight text-white">WeIntern</span>
        </Link>
        <div className="hidden md:flex gap-8 text-sm font-semibold text-foreground/60">
          <a href="#features" className="hover:text-[#6366f1] transition-colors">Features</a>
          <a href="#domains" className="hover:text-[#6366f1] transition-colors">Domains</a>
          <a href="#how-it-works" className="hover:text-[#6366f1] transition-colors">How It Works</a>
        </div>
        <div className="flex items-center gap-4">
          {loading ? (
            <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-white animate-spin" />
          ) : user ? (
            <div className="flex items-center gap-4">
              <Link 
                href="/dashboard" 
                className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm hover:bg-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Dashboard
              </Link>
              <ProfileDropdown />
            </div>
          ) : (
            <>
              <Link 
                href="/login" 
                className="text-sm font-bold text-foreground/60 hover:text-white transition-colors"
              >
                Login
              </Link>
              <Link 
                href="/login" 
                className="px-5 py-2.5 rounded-xl bg-[#6366f1] hover:bg-[#5053de] text-white font-bold text-sm hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-[#6366f1]/20"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-36 pb-20 px-6 max-w-7xl mx-auto z-10 flex flex-col lg:flex-row items-center gap-12">
        <div className="flex-1 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#6366f1]/10 border border-[#6366f1]/20 text-[#6366f1] text-xs font-bold mb-8">
            <LucideZap size={14} />
            <span>AI-POWERED INTERVIEW PREPARATION</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-none">
            Practice Smart. <br />
            <span className="gradient-text">Get Hired.</span>
          </h1>
          <p className="text-lg md:text-xl text-foreground/60 max-w-xl mx-auto lg:mx-0 mb-10 leading-relaxed font-medium">
            WeIntern Mock Interview Platform helps you practice domain-specific interviews, get instant AI-generated feedback, and download performance reports.
          </p>
          <div className="flex flex-col sm:flex-row justify-center lg:justify-start gap-4">
            <Link 
              href={user ? "/interview/select" : "/login"}
              className="flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#6366f1] hover:bg-[#5053de] text-white font-black text-lg hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-[#6366f1]/25 cursor-pointer"
            >
              <span>Start Mock Interview</span>
              <LucideArrowRight size={20} />
            </Link>
            <a 
              href="#features"
              className="px-8 py-4 rounded-xl bg-white/5 border border-white/10 font-bold hover:bg-white/10 transition-all text-lg backdrop-blur-md flex items-center justify-center"
            >
              View Features
            </a>
          </div>
        </div>

        {/* Hero Visual illustration */}
        <div className="flex-1 w-full max-w-md lg:max-w-none flex justify-center items-center">
          <div className="relative w-full aspect-square max-w-[480px] bg-gradient-to-tr from-[#6366f1]/10 to-[#a855f7]/10 border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col justify-between overflow-hidden">
            {/* Design accents */}
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#6366f1]/20 blur-2xl" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-[#a855f7]/20 blur-2xl" />
            
            {/* Mock Chat bubbles */}
            <div className="space-y-4 z-10 flex-1 flex flex-col justify-center">
              <div className="flex gap-3 max-w-[85%]">
                <div className="w-8 h-8 rounded-lg bg-[#a855f7] flex items-center justify-center text-xs font-black shadow-lg shadow-[#a855f7]/20 flex-shrink-0">AI</div>
                <div className="bg-white/5 border border-white/10 p-3.5 rounded-2xl rounded-tl-sm text-xs font-medium leading-relaxed">
                  &quot;Explain the difference between let, const, and var in JavaScript.&quot;
                </div>
              </div>
              <div className="flex gap-3 max-w-[85%] self-end">
                <div className="bg-[#6366f1]/20 border border-[#6366f1]/30 p-3.5 rounded-2xl rounded-tr-sm text-xs font-medium leading-relaxed">
                  &quot;let and const are block-scoped, whereas var is function-scoped. const variables cannot be reassigned...&quot;
                </div>
                <div className="w-8 h-8 rounded-lg bg-[#6366f1] flex items-center justify-center text-xs font-black shadow-lg shadow-[#6366f1]/20 flex-shrink-0">ME</div>
              </div>
              
              {/* Feedback Summary Pop */}
              <div className="p-4 bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl flex items-center justify-between mt-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 flex items-center justify-center text-xs font-extrabold text-emerald-400">85</div>
                  <div>
                    <h5 className="text-[11px] font-bold text-white uppercase tracking-wider">Overall Score</h5>
                    <p className="text-[10px] text-white/50">Great clarity & technical accuracy!</p>
                  </div>
                </div>
                <div className="px-3 py-1 rounded bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-bold text-emerald-400">GOOD</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 border-t border-white/5 bg-black/10 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4">Awesome Core Features</h2>
            <p className="text-sm md:text-base text-white/50 leading-relaxed font-medium">
              WeIntern offers an end-to-end sandbox to train, measure, and optimize your job interview performance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-card p-8 border border-white/5 flex flex-col justify-between hover:scale-[1.02] hover:border-[#6366f1]/40 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-[#6366f1]/10 border border-[#6366f1]/25 flex items-center justify-center text-[#6366f1] mb-6">
                <LucideSparkles size={22} />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-3 text-white">AI-Generated Questions</h3>
                <p className="text-sm text-foreground/50 leading-relaxed">
                  Instantly obtain 5-10 challenging domain-specific questions generated based on difficulty settings.
                </p>
              </div>
            </div>

            <div className="glass-card p-8 border border-white/5 flex flex-col justify-between hover:scale-[1.02] hover:border-[#6366f1]/40 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-[#a855f7]/10 border border-[#a855f7]/25 flex items-center justify-center text-[#a855f7] mb-6">
                <LucideTrendingUp size={22} />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-3 text-white">Instant AI Feedback</h3>
                <p className="text-sm text-foreground/50 leading-relaxed">
                  Evaluate Communication Clarity, Technical Accuracy, and Confidence & Tone with tailored improvement recommendations.
                </p>
              </div>
            </div>

            <div className="glass-card p-8 border border-white/5 flex flex-col justify-between hover:scale-[1.02] hover:border-[#6366f1]/40 transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-[#ec4899]/10 border border-[#ec4899]/25 flex items-center justify-center text-[#ec4899] mb-6">
                <LucideFileText size={22} />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-3 text-white">PDF Performance Report</h3>
                <p className="text-sm text-foreground/50 leading-relaxed">
                  Download a comprehensive, professionally styled PDF report of your scores, question responses, and tips summaries.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Domain selection summary */}
      <section id="domains" className="py-24 px-6 max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4 text-white">Choose Your Path</h2>
          <p className="text-sm md:text-base text-white/50 leading-relaxed font-medium">
            Practice domain-specific questions crafted specifically for major job profiles.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { name: 'Software Engineering', icon: LucideCode, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
            { name: 'Data Science', icon: LucideDatabase, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
            { name: 'Marketing', icon: LucideMegaphone, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
            { name: 'Finance', icon: LucideDollarSign, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
            { name: 'HR / Management', icon: LucideUsers, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
          ].map((domain, i) => (
            <div key={i} className={`p-6 border rounded-2xl flex flex-col items-center text-center gap-4 hover:scale-[1.03] transition-all bg-white/5 border-white/10`}>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold ${domain.color}`}>
                <domain.icon size={22} />
              </div>
              <span className="text-sm font-bold text-white leading-tight">{domain.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 border-t border-white/5 bg-black/20 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4 text-white">How It Works</h2>
            <p className="text-sm md:text-base text-white/50 leading-relaxed font-medium">
              WeIntern simplifies mock preparation into four easy, interactive steps.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {/* Timeline connector line for desktop */}
            <div className="absolute top-10 left-6 right-6 h-[2px] bg-white/5 hidden md:block z-0" />

            {[
              { step: '01', title: 'Pick Your Track', desc: 'Select one of the 5 key interview domains and pick your target difficulty level.' },
              { step: '02', title: 'Answer Questions', desc: 'Interact with 5 AI-curated questions. Submit responses using keyboard text or Speech-to-Text voice.' },
              { step: '03', title: 'Instant AI Evaluation', desc: 'Receive detailed grading for Clarity, Technical Accuracy, Tone, and structured strength/improvement notes.' },
              { step: '04', title: 'Export PDF Reports', desc: 'Track your preparation progress inside the dashboard and download detailed, professional PDF reports.' }
            ].map((s, i) => (
              <div key={i} className="glass-card p-6 border border-white/5 relative z-10 flex flex-col justify-between hover:border-[#6366f1]/40 transition-all duration-300 hover:scale-[1.02]">
                <div className="w-10 h-10 rounded-full bg-[#6366f1]/10 border border-[#6366f1]/30 flex items-center justify-center text-[#6366f1] text-xs font-black mb-6">
                  {s.step}
                </div>
                <div>
                  <h3 className="text-lg font-bold mb-2 text-white">{s.title}</h3>
                  <p className="text-xs text-foreground/55 leading-relaxed font-medium">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer / Stats */}
      <section className="py-20 px-6 max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-white/5">
        {[
          { label: 'Domains Supported', value: '5' },
          { label: 'Interviews Conducted', value: '1,500+' },
          { label: 'Evaluation Speed', value: '< 2s' },
          { label: 'Infrastructure Cost', value: '$0' }
        ].map((stat, i) => (
          <div key={i} className="text-center">
            <div className="text-4xl font-black text-white mb-1.5">{stat.value}</div>
            <div className="text-xs font-bold text-foreground/40 uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </section>

    </main>
  );
}
