'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { dbService, UserProfile } from '@/lib/db';
import { 
  LucideCode, 
  LucideDatabase, 
  LucideMegaphone, 
  LucideDollarSign, 
  LucideUsers, 
  LucideArrowLeft, 
  LucideArrowRight, 
  LucideCheckCircle2 
} from 'lucide-react';
import Link from 'next/link';
import { getSectionSubtopic } from '@/lib/ai/subtopics';
import ProfileDropdown from '@/components/ProfileDropdown';

const DOMAINS = [
  {
    id: 'Software Engineering',
    title: 'Software Engineering',
    description: 'DSA, System Design, OOPs, DBMS, Web Development, and more',
    icon: LucideCode,
    color: 'border-blue-500/30 text-blue-400 bg-blue-500/5 hover:border-blue-400',
    activeColor: 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-500/10'
  },
  {
    id: 'Data Science',
    title: 'Data Science',
    description: 'Statistics, Machine Learning, Python, SQL, and Data Analysis',
    icon: LucideDatabase,
    color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:border-emerald-400',
    activeColor: 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-500/10'
  },
  {
    id: 'Marketing',
    title: 'Marketing',
    description: 'Digital Marketing, SEO, SEM, Content Strategy, and Brand Growth',
    icon: LucideMegaphone,
    color: 'border-purple-500/30 text-purple-400 bg-purple-500/5 hover:border-purple-400',
    activeColor: 'border-purple-500 ring-2 ring-purple-500/30 bg-purple-500/10'
  },
  {
    id: 'Finance',
    title: 'Finance',
    description: 'Corporate Accounting, Financial Analysis, Investment Banking, and Markets',
    icon: LucideDollarSign,
    color: 'border-amber-500/30 text-amber-400 bg-amber-500/5 hover:border-amber-400',
    activeColor: 'border-amber-500 ring-2 ring-amber-500/30 bg-amber-500/10'
  },
  {
    id: 'HR / Management',
    title: 'HR / Management',
    description: 'HR Concepts, Behavioral questions, Team Leadership, and MBA foundations',
    icon: LucideUsers,
    color: 'border-rose-500/30 text-rose-400 bg-rose-500/5 hover:border-rose-400',
    activeColor: 'border-rose-500 ring-2 ring-rose-500/30 bg-rose-500/10'
  }
];

const DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'];

export default function SelectDomainPage() {
  const router = useRouter();
  const [selectedDomain, setSelectedDomain] = useState('Software Engineering');
  const [selectedDifficulty, setSelectedDifficulty] = useState('Beginner');
  const [selectedSection, setSelectedSection] = useState(1);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const fetchUser = () => {
      dbService.getCurrentUser().then((profile) => {
        setUser(profile);
      });
    };
    fetchUser();

    window.addEventListener('user-profile-updated', fetchUser);
    return () => window.removeEventListener('user-profile-updated', fetchUser);
  }, []);

  const handleContinue = async () => {
    setLoading(true);
    try {
      const session = await dbService.createSession(selectedDomain, selectedDifficulty, selectedSection);
      router.push(`/interview/${session.id}`);
    } catch (e) {
      console.error('Error creating interview session:', e);
      alert('Failed to start interview session. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] relative overflow-hidden py-12 px-6">
      
      {/* Background glow */}
      <div className="absolute top-0 right-1/4 w-[500px] h-[500px] rounded-full bg-[#6366f1]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] rounded-full bg-[#a855f7]/5 blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto space-y-10 z-10 relative">
        
        {/* Navigation / Header */}
        <div className="flex justify-between items-center">
          <Link 
            href={user ? "/dashboard" : "/"} 
            className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-semibold cursor-pointer"
          >
            <LucideArrowLeft size={16} />
            <span>Back to {user ? 'Dashboard' : 'Home'}</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Candidate:</span>
              <span className="text-xs font-black text-[#6366f1] bg-[#6366f1]/10 px-2.5 py-1 rounded-full">
                {user ? user.full_name : 'Guest Candidate'}
              </span>
            </div>
            {user && <ProfileDropdown />}
          </div>
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="text-4xl font-black tracking-tight mb-2 text-white">Select Interview Domain</h1>
          <p className="text-white/40 text-sm font-medium">Choose a domain to start your AI-powered mock interview practice</p>
        </div>

        {/* Domain Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DOMAINS.map((domain) => {
            const isSelected = selectedDomain === domain.id;
            const Icon = domain.icon;
            
            return (
              <button
                key={domain.id}
                onClick={() => setSelectedDomain(domain.id)}
                className={`p-6 border rounded-2xl flex items-start gap-4 text-left transition-all duration-300 relative overflow-hidden group cursor-pointer ${
                  isSelected ? domain.activeColor : domain.color
                }`}
              >
                <div className={`p-3 rounded-xl flex-shrink-0 bg-white/5 border border-white/10 ${isSelected ? 'text-[#6366f1]' : ''}`}>
                  <Icon size={24} />
                </div>
                <div className="space-y-1.5 pr-6">
                  <h3 className="font-extrabold text-white text-base leading-tight group-hover:text-[#6366f1] transition-colors">
                    {domain.title}
                  </h3>
                  <p className="text-xs text-white/40 leading-relaxed font-medium">
                    {domain.description}
                  </p>
                </div>
                {isSelected && (
                  <div className="absolute top-4 right-4 text-[#6366f1]">
                    <LucideCheckCircle2 size={20} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Difficulty Level Card */}
        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
          <div>
            <h3 className="font-extrabold text-white text-base">Select Difficulty Level</h3>
            <p className="text-xs text-white/40 font-medium">Choose the depth and complexity of AI generated questions</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {DIFFICULTIES.map((diff) => {
              const isSelected = selectedDifficulty === diff;
              return (
                <button
                  key={diff}
                  onClick={() => setSelectedDifficulty(diff)}
                  className={`px-5 py-2.5 rounded-xl border text-sm font-bold transition-all cursor-pointer ${
                    isSelected 
                      ? 'bg-[#6366f1] border-[#6366f1] text-white shadow-lg shadow-[#6366f1]/20'
                      : 'bg-white/5 border-white/10 text-white/60 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {diff}
                </button>
              );
            })}
          </div>
        </div>

        {/* Practice Section Selection Card */}
        <div className="p-6 bg-white/5 border border-white/10 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <h3 className="font-extrabold text-white text-base">Select Practice Section (1 - 100)</h3>
              <p className="text-xs text-white/40 font-medium">
                Each section contains 5 questions covering a distinct sub-topic. Total 500 questions per level.
              </p>
            </div>
            
            {/* Randomizer Button */}
            <button
              onClick={() => setSelectedSection(Math.floor(Math.random() * 100) + 1)}
              className="px-3.5 py-1.5 rounded-xl bg-[#6366f1]/10 border border-[#6366f1]/20 text-[#6366f1] text-xs font-bold hover:bg-[#6366f1]/20 transition-all cursor-pointer flex-shrink-0"
            >
              🎲 Random Section
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Section slider or select dropdown */}
            <div className="flex-1 w-full flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="100"
                value={selectedSection}
                onChange={(e) => setSelectedSection(Number(e.target.value))}
                className="flex-1 accent-[#6366f1] cursor-pointer"
              />
              <div className="w-24 px-3 py-2 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center font-bold text-[#fafafa] text-sm">
                Set {selectedSection} / 100
              </div>
            </div>

            {/* Quick dropdown select */}
            <div className="w-full sm:w-auto">
              <select
                value={selectedSection}
                onChange={(e) => setSelectedSection(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl bg-[#0b0b0e] border border-white/10 text-white text-xs hover:border-white/20 focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] outline-none transition-all cursor-pointer font-bold"
              >
                {Array.from({ length: 100 }, (_, i) => i + 1).map((sec) => (
                  <option key={sec} value={sec} className="bg-[#0b0b0e] text-white">
                    Section {sec}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subtopic description box */}
          <div className="p-3.5 rounded-xl bg-[#6366f1]/5 border border-[#6366f1]/10 text-xs text-white/70">
            <span className="font-bold text-[#6366f1]">Target Sub-topic:</span>{' '}
            {getSectionSubtopic(selectedDomain, selectedSection).split(': ')[1]}
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-4">
          <button
            onClick={handleContinue}
            disabled={loading}
            className="flex items-center gap-2 px-8 py-4 rounded-xl bg-[#6366f1] hover:bg-[#5053de] text-white font-black text-lg transition-all shadow-xl shadow-[#6366f1]/25 disabled:opacity-50 cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Initializing Interview...</span>
              </>
            ) : (
              <>
                <span>Continue</span>
                <LucideArrowRight size={18} />
              </>
            )}
          </button>
        </div>

      </div>

    </div>
  );
}
