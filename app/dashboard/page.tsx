'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { dbService, InterviewSession, UserProfile } from '@/lib/db';
import { 
  LucideLayoutDashboard, 
  LucideHistory, 
  LucideTrendingUp, 
  LucideLightbulb, 
  LucideSettings, 
  LucideLogOut, 
  LucidePlus,
  LucideBriefcase,
  LucideAward,
  LucideBookOpen,
  LucideCheckCircle,
  LucideShieldAlert,
  LucideChevronRight,
  LucideExternalLink
} from 'lucide-react';
import Link from 'next/link';
import ProfileDropdown from '@/components/ProfileDropdown';

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#09090b] text-white flex justify-center items-center">
        <div className="w-8 h-8 border-4 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'tips' | 'settings'>('dashboard');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [sessions, setSessions] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    average: 0,
    best: 0,
    hours: 0
  });

  useEffect(() => {
    async function loadData() {
      // Get user profile
      const currentUser = await dbService.getCurrentUser();
      if (!currentUser) {
        // Redirect to login if not logged in
        router.push('/login');
        return;
      }
      setUser(currentUser);
      setEditName(currentUser.full_name);
      setEditAvatar(currentUser.avatar_url || '');

      // Get sessions
      const userSessions = await dbService.getSessions();
      setSessions(userSessions);

      // Calculate stats
      const completed = userSessions.filter(s => s.status === 'completed');
      const totalCount = completed.length;
      
      const averageScore = totalCount > 0 
        ? Math.round(completed.reduce((sum, s) => sum + (s.overall_score || 0), 0) / totalCount * 10) / 10
        : 0;
        
      const bestScore = totalCount > 0
        ? Math.max(...completed.map(s => s.overall_score || 0))
        : 0;

      // Estimate hours (e.g. 45 mins per session)
      const hoursPracticed = Math.round((userSessions.length * 0.75) * 10) / 10;

      setStats({
        total: userSessions.length,
        average: averageScore,
        best: bestScore,
        hours: hoursPracticed
      });

      setLoading(false);
    }
    loadData();
  }, [router]);

  // Sync tab with URL search parameter
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['dashboard', 'history', 'tips', 'settings'].includes(tab)) {
      setTimeout(() => {
        setActiveTab(tab as 'dashboard' | 'history' | 'tips' | 'settings');
      }, 0);
    } else {
      setTimeout(() => {
        setActiveTab('dashboard');
      }, 0);
    }
  }, [searchParams]);

  // Sync user profile updates
  useEffect(() => {
    const handleProfileUpdate = async () => {
      const currentUser = await dbService.getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        setEditName(currentUser.full_name);
        setEditAvatar(currentUser.avatar_url || '');
      }
    };
    window.addEventListener('user-profile-updated', handleProfileUpdate);
    return () => window.removeEventListener('user-profile-updated', handleProfileUpdate);
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Image size must be less than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setEditAvatar(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('saving');
    try {
      const updated = await dbService.updateUserProfile({
        full_name: editName,
        avatar_url: editAvatar
      });
      if (updated) {
        setUser(updated);
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('error');
      }
    } catch (err) {
      console.error(err);
      setSaveStatus('error');
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await dbService.logout();
      router.push('/');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] text-white flex justify-center items-center">
        <div className="w-8 h-8 border-4 border-[#6366f1] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex">
      
      {/* ================= LEFT SIDEBAR ================= */}
      <aside className="w-64 border-r border-white/5 bg-[#0b0b0e] p-6 flex flex-col justify-between hidden md:flex">
        
        {/* Top brand */}
        <div className="space-y-8">
          <Link href="/" className="flex items-center gap-3 cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-[#6366f1] rotate-12 flex items-center justify-center shadow-lg shadow-[#6366f1]/30">
              <span className="text-white font-extrabold">W</span>
            </div>
            <span className="text-lg font-black tracking-tight text-white">WeIntern</span>
          </Link>

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LucideLayoutDashboard },
              { id: 'history', label: 'My Interviews', icon: LucideHistory },
              { id: 'tips', label: 'Tips & Resources', icon: LucideLightbulb },
              { id: 'settings', label: 'Settings', icon: LucideSettings }
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => router.push('/dashboard?tab=' + item.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-[#6366f1] text-white shadow-lg shadow-[#6366f1]/15'
                      : 'text-white/60 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-all cursor-pointer"
        >
          <LucideLogOut size={18} />
          <span>Logout</span>
        </button>
      </aside>

      {/* ================= MAIN CONTENT PANE ================= */}
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        
        {/* Header navigation bar */}
        <header className="border-b border-white/5 bg-[#09090b]/80 backdrop-blur-md px-8 py-5 flex justify-between items-center z-10 sticky top-0">
          <div>
            <span className="text-xs font-bold text-white/40 uppercase tracking-wider">Candidate Hub</span>
          </div>
          
          <div className="flex items-center gap-4">
            {/* New Interview Button */}
            <Link
              href="/interview/select"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#6366f1] hover:bg-[#5053de] text-white font-bold text-xs hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md shadow-[#6366f1]/10"
            >
              <LucidePlus size={16} />
              <span>New Interview</span>
            </Link>

            {/* Reusable Profile Dropdown */}
            {user && <ProfileDropdown />}
          </div>
        </header>

        {/* Dynamic Panels */}
        <main className="p-8 max-w-5xl w-full mx-auto space-y-8 flex-1">
          
          {/* 1. DASHBOARD TAB VIEW */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              
              {/* Welcome Banner */}
              <div>
                <h1 className="text-3xl font-black text-white">Hello, {user?.full_name}! 👋</h1>
                <p className="text-sm text-white/45 mt-1 font-medium">Let&apos;s continue your interview preparation today.</p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Total Interviews', value: stats.total, icon: LucideBriefcase, color: 'text-blue-400 bg-blue-500/10' },
                  { label: 'Average Score', value: `${stats.average}%`, icon: LucideTrendingUp, color: 'text-emerald-400 bg-emerald-500/10' },
                  { label: 'Best Score', value: `${stats.best}%`, icon: LucideAward, color: 'text-amber-400 bg-amber-500/10' },
                  { label: 'Hours Practiced', value: stats.hours, icon: LucideBookOpen, color: 'text-rose-400 bg-rose-500/10' }
                ].map((stat, i) => {
                  const Icon = stat.icon;
                  return (
                    <div key={i} className="glass-card border border-white/5 p-6 flex flex-col justify-between hover:border-white/10 transition-colors">
                      <div className="flex justify-between items-start">
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider leading-relaxed">{stat.label}</span>
                        <div className={`p-2 rounded-lg ${stat.color}`}>
                          <Icon size={16} />
                        </div>
                      </div>
                      <div className="text-3xl font-black text-white mt-4">{stat.value}</div>
                    </div>
                  );
                })}
              </div>

              {/* Recent Interviews Section */}
              <div className="glass-card border border-white/5 p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-extrabold text-base text-white">Recent Interviews</h3>
                  <button
                    onClick={() => router.push('/dashboard?tab=history')}
                    className="text-xs font-bold text-[#6366f1] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <span>View all history</span>
                    <LucideChevronRight size={14} />
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] font-extrabold text-white/40 uppercase tracking-wider">
                        <th className="pb-3 pr-4">Domain</th>
                        <th className="pb-3 pr-4">Difficulty</th>
                        <th className="pb-3 pr-4">Score</th>
                        <th className="pb-3 pr-4">Date</th>
                        <th className="pb-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs text-white/70 font-medium">
                      {sessions.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-white/40 italic">
                            No mock interviews conducted yet. Click &quot;New Interview&quot; to begin!
                          </td>
                        </tr>
                      ) : (
                        sessions.slice(0, 5).map((s) => (
                          <tr key={s.id} className="group">
                            <td className="py-4 pr-4 text-white font-bold">
                              {s.domain} {s.section ? `(Section ${s.section})` : ''}
                            </td>
                            <td className="py-4 pr-4">
                              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-bold">
                                {s.difficulty}
                              </span>
                            </td>
                            <td className="py-4 pr-4">
                              {s.status === 'completed' ? (
                                <span className="text-emerald-400 font-bold">{s.overall_score}%</span>
                              ) : (
                                <span className="text-yellow-400 font-semibold italic">In Progress</span>
                              )}
                            </td>
                            <td className="py-4 pr-4 text-white/40">{new Date(s.created_at).toLocaleDateString()}</td>
                            <td className="py-4 text-right">
                              <Link
                                href={`/interview/${s.id}`}
                                className="text-xs font-bold text-[#6366f1] group-hover:underline cursor-pointer"
                              >
                                {s.status === 'completed' ? 'View Report' : 'Continue'}
                              </Link>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* 2. HISTORY TAB VIEW */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black text-white">My Interview History</h1>
                <p className="text-xs text-white/40 mt-1 font-medium">Review and track your preparation stats over time</p>
              </div>

              <div className="glass-card border border-white/5 p-6">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-white/5 text-[10px] font-extrabold text-white/40 uppercase tracking-wider">
                        <th className="pb-3 pr-4">Domain</th>
                        <th className="pb-3 pr-4">Difficulty</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3 pr-4">Score</th>
                        <th className="pb-3 pr-4">Date</th>
                        <th className="pb-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs text-white/70 font-medium">
                      {sessions.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-white/40 italic">
                            No mock interviews conducted yet. Click &quot;New Interview&quot; to begin!
                          </td>
                        </tr>
                      ) : (
                        sessions.map((s) => (
                          <tr key={s.id} className="group">
                            <td className="py-4 pr-4 text-white font-bold">
                              {s.domain} {s.section ? `(Section ${s.section})` : ''}
                            </td>
                            <td className="py-4 pr-4">
                              <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] font-bold">
                                {s.difficulty}
                              </span>
                            </td>
                            <td className="py-4 pr-4">
                              {s.status === 'completed' ? (
                                <span className="flex items-center gap-1.5 text-emerald-400">
                                  <LucideCheckCircle size={14} />
                                  <span>Completed</span>
                                </span>
                              ) : (
                                <span className="flex items-center gap-1.5 text-yellow-400">
                                  <LucideShieldAlert size={14} />
                                  <span>In Progress</span>
                                </span>
                              )}
                            </td>
                            <td className="py-4 pr-4">
                              {s.status === 'completed' ? (
                                <span className="text-white font-bold">{s.overall_score}%</span>
                              ) : (
                                <span className="text-white/30">&mdash;</span>
                              )}
                            </td>
                            <td className="py-4 pr-4 text-white/40">{new Date(s.created_at).toLocaleDateString()}</td>
                            <td className="py-4 text-right">
                              <Link
                                href={`/interview/${s.id}`}
                                className="text-xs font-bold text-[#6366f1] group-hover:underline cursor-pointer"
                              >
                                {s.status === 'completed' ? 'View Report' : 'Resume'}
                              </Link>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3. TIPS & RESOURCES TAB VIEW */}
          {activeTab === 'tips' && (
            <div className="space-y-8">
              <div>
                <h1 className="text-2xl font-black text-white">Tips & Prep Resources</h1>
                <p className="text-xs text-white/40 mt-1 font-medium">Daily suggestions and curated references to ace your interviews</p>
              </div>

              {/* Tip of the day */}
              <div className="p-6 bg-gradient-to-r from-[#1e1b4b] to-[#0f0e26] border border-[#6366f1]/20 rounded-2xl flex gap-5 items-start">
                <div className="p-3 bg-[#6366f1]/25 text-[#6366f1] rounded-xl flex-shrink-0">
                  <LucideLightbulb size={24} />
                </div>
                <div className="space-y-2">
                  <h4 className="font-extrabold text-white text-sm uppercase tracking-wider">Tip of the Day</h4>
                  <blockquote className="text-xs italic text-white/80 leading-relaxed">
                    &quot;Structure your answer using the STAR method: Situation, Task, Action, Result. When describing accomplishments, make sure to highlight the exact engineering challenges and quantified result metrics, like loading speeds, efficiency, or conversion rates.&quot;
                  </blockquote>
                </div>
              </div>

              {/* Curated Resources Grid */}
              <div className="space-y-4">
                <h3 className="font-extrabold text-white text-base">Top Curated Resources</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    {
                      title: 'Tech Interview Handbook',
                      description: 'Comprehensive guides, resume review checklists, and interview cheatsheets for software engineers.',
                      link: 'https://www.techinterviewhandbook.org/'
                    },
                    {
                      title: 'System Design Basics',
                      description: 'Introductory lessons in web scalability, client-server architectures, CDNs, and load balancing.',
                      link: 'https://github.com/donnemartin/system-design-primer'
                    },
                    {
                      title: 'Behavioral Interview Guide',
                      description: 'A structured directory of common behavioral questions with guidance on utilizing the STAR method.',
                      link: 'https://www.careercup.com/'
                    },
                    {
                      title: 'Salary Negotiation Cheatsheet',
                      description: 'Valuable advice on assessing job offers, counter-proposing, and navigating human resource phone screens.',
                      link: 'https://www.levels.fyi/'
                    }
                  ].map((res, i) => (
                    <div key={i} className="glass-card border border-white/5 p-6 flex flex-col justify-between hover:border-white/10 transition-all duration-300">
                      <div>
                        <h4 className="font-bold text-white text-sm mb-2">{res.title}</h4>
                        <p className="text-xs text-white/50 leading-relaxed mb-4">{res.description}</p>
                      </div>
                      <div>
                        <a
                          href={res.link}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#6366f1] hover:underline cursor-pointer"
                        >
                          <span>Learn more</span>
                          <LucideExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* 4. SETTINGS TAB VIEW */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-black text-white">Account Settings</h1>
                <p className="text-xs text-white/40 mt-1 font-medium">Manage your candidate profile and active AI services</p>
              </div>

              <div className="glass-card border border-white/5 p-6 space-y-6">
                
                {/* Profile detail */}
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <h3 className="font-bold text-sm text-white border-b border-white/5 pb-2">Candidate Profile</h3>
                  
                  {/* Photo Edit Layout */}
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="w-20 h-20 rounded-full border border-white/10 bg-gradient-to-tr from-[#6366f1] to-[#a855f7] flex items-center justify-center overflow-hidden shadow-inner flex-shrink-0">
                      {editAvatar && editAvatar.trim() !== '' ? (
                        <img src={editAvatar} alt="Profile Preview" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-2xl font-black text-white">
                          {editName?.charAt(0).toUpperCase() || user?.full_name?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    
                    <div className="space-y-2 text-center sm:text-left">
                      <label className="inline-flex px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-bold transition-all cursor-pointer">
                        <span>Upload Photo</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleAvatarChange} 
                          className="hidden" 
                        />
                      </label>
                      {editAvatar && (
                        <button 
                          type="button"
                          onClick={() => setEditAvatar('')}
                          className="ml-3 px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-all"
                        >
                          Remove
                        </button>
                      )}
                      <p className="text-[10px] text-white/40 leading-relaxed mt-1">
                        Accepts PNG, JPG, or GIF (max size 2MB).
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-wide block">Full Name</label>
                      <input 
                        type="text" 
                        required
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs hover:border-white/20 focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-white/40 uppercase tracking-wide block">Email Address</label>
                      <input 
                        type="email" 
                        readOnly 
                        value={user?.email} 
                        className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/40 text-xs outline-none cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-2">
                    <button
                      type="submit"
                      disabled={saveStatus === 'saving'}
                      className="px-6 py-2.5 rounded-xl bg-[#6366f1] hover:bg-[#5053de] text-white font-bold text-xs transition-all shadow-md shadow-[#6366f1]/20 disabled:opacity-50 cursor-pointer"
                    >
                      {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
                    </button>
                    {saveStatus === 'success' && (
                      <span className="text-emerald-400 text-xs font-bold animate-pulse">✓ Profile saved successfully!</span>
                    )}
                    {saveStatus === 'error' && (
                      <span className="text-red-400 text-xs font-bold animate-pulse">❌ Failed to save profile.</span>
                    )}
                  </div>
                </form>


              </div>
            </div>
          )}

        </main>

      </div>

    </div>
  );
}
