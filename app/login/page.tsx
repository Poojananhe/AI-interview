'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { dbService, supabase, RegisteredUser } from '@/lib/db';
import { LucideShield, LucideMail, LucideLock, LucideUser, LucideArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [showForgot, setShowForgot] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  
  useEffect(() => {
    // Check if already logged in, redirect to dashboard
    dbService.getCurrentUser().then((user) => {
      if (user) {
        router.push('/dashboard');
      }
    });
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (showForgot) {
        await dbService.resetPassword(email);
        if (dbService.isSupabaseEnabled()) {
          setSuccess('A password reset link has been sent to your email.');
        } else {
          setSuccess('Guest Mode: A reset session was initialized. Click "Reset Password Page" below to reset your password!');
        }
      } else if (isLogin) {
        await dbService.loginWithEmail(email, password);
        router.push('/dashboard');
      } else {
        if (!fullName.trim()) {
          throw new Error('Full name is required for registration');
        }
        await dbService.signUpWithEmail(email, password, fullName);
        router.push('/dashboard');
      }
    } catch (err) {
      setError((err as Error).message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      if (supabase) {
        // Real Supabase Google OAuth
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: window.location.origin + '/dashboard',
          },
        });
        if (error) throw error;
      } else {
        // Show simulated Google email input modal
        setLoading(false);
        setShowGoogleModal(true);
      }
    } catch (err) {
      setError((err as Error).message || 'Google authentication failed.');
      setLoading(false);
    }
  };

  const handleGoogleModalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const emailStr = googleEmail.trim();
      if (!emailStr) {
        throw new Error('Please enter a valid email address.');
      }

      // Extract Name from email (e.g. "john.doe@gmail.com" -> "John Doe")
      const namePart = emailStr.split('@')[0];
      const name = namePart
        .split(/[._+-]/)
        .filter(Boolean)
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ') || 'Google Candidate';
      
      const pswd = "googlePassword123";

      // Check if user exists in local storage registered users
      const users = typeof window !== 'undefined'
        ? (JSON.parse(localStorage.getItem('weintern_registered_users') || '[]') as RegisteredUser[])
        : [];
      
      const existingUser = users.find((u) => u.email.toLowerCase() === emailStr.toLowerCase());

      if (existingUser) {
        // Log in existing user
        await dbService.loginWithEmail(emailStr, existingUser.password);
      } else {
        // Automatically register new user
        await dbService.signUpWithEmail(emailStr, pswd, name);
      }

      window.dispatchEvent(new Event('user-profile-updated'));
      router.push('/dashboard');
    } catch (err) {
      setError((err as Error).message || 'Google authentication failed.');
    } finally {
      setLoading(false);
      setShowGoogleModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex flex-col md:flex-row">
      
      {/* Back to Home Button */}
      <Link 
        href="/" 
        className="absolute top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm font-medium"
      >
        <LucideArrowLeft size={16} />
        <span>Back to Home</span>
      </Link>

      {/* Left panel: Info & branding */}
      <div className="hidden md:flex md:w-5/12 bg-gradient-to-br from-[#1e1b4b] via-[#0f0e26] to-[#09090b] relative flex-col justify-between p-12 overflow-hidden border-r border-white/5">
        {/* Glow Effects */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-[#6366f1]/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-[#a855f7]/10 blur-[120px] pointer-events-none" />

        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 z-10 cursor-pointer">
          <div className="w-10 h-10 rounded-xl bg-[#6366f1] rotate-12 flex items-center justify-center shadow-lg shadow-[#6366f1]/30">
            <span className="text-white font-extrabold text-xl">W</span>
          </div>
          <span className="text-2xl font-black tracking-tight text-white">WeIntern</span>
        </Link>

        {/* Mascot / Art */}
        <div className="my-auto z-10 max-w-sm">
          <h2 className="text-4xl font-extrabold tracking-tight mb-4 text-white leading-tight">
            Practice Smart.<br />Get Hired.
          </h2>
          <p className="text-white/60 text-base leading-relaxed mb-8">
            WeIntern Mock Interview Platform helps you practice domain-specific questions, receive instant AI evaluations, and download performance reports.
          </p>
          <div className="p-5 glass-card border border-white/10 flex items-start gap-4">
            <div className="p-3 bg-[#6366f1]/20 text-[#6366f1] rounded-lg">
              <LucideShield size={24} />
            </div>
            <div>
              <h4 className="font-bold text-white text-sm mb-1">AI-Powered Assessment</h4>
              <p className="text-xs text-white/50 leading-relaxed">
                Receive instant grading on Communication Clarity, Technical Accuracy, and Confidence & Tone with tailored actionable improvement areas.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="z-10 text-xs text-white/40">
          &copy; {new Date().getFullYear()} WeIntern AI. Zero infra cost.
        </div>
      </div>

      {/* Right panel: Login forms */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative overflow-hidden bg-background">
        {/* Background Glow */}
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[#6366f1]/5 blur-[120px]" />
        
        <div className="w-full max-w-md space-y-8 z-10">
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-black tracking-tight text-white mb-2">
              {showForgot 
                ? 'Reset your password' 
                : isLogin 
                  ? 'Welcome Back!' 
                  : 'Create your account'}
            </h2>
            <p className="text-white/40 text-sm font-medium">
              {showForgot 
                ? 'Enter your email address to receive a password reset link.' 
                : isLogin 
                  ? 'Sign in to continue your interview practice journey.' 
                  : 'Register to start domain-specific mock interviews.'}
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm space-y-2">
              <p>{success}</p>
              {!dbService.isSupabaseEnabled() && showForgot && (
                <Link 
                  href="/login/reset-password"
                  className="block text-center py-2 px-4 rounded-xl bg-[#6366f1] hover:bg-[#5053de] text-white font-bold text-xs transition-all cursor-pointer"
                >
                  Reset Password Page
                </Link>
              )}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Full Name (Sign Up only) */}
            {!isLogin && !showForgot && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-white/60 tracking-wide block uppercase">Full Name</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-white/30 pointer-events-none">
                    <LucideUser size={18} />
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] outline-none text-white text-sm transition-all"
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-white/60 tracking-wide block uppercase">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-white/30 pointer-events-none">
                  <LucideMail size={18} />
                </span>
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] outline-none text-white text-sm transition-all"
                />
              </div>
            </div>

            {/* Password (Login / Sign Up only) */}
            {!showForgot && (
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-white/60 tracking-wide block uppercase">Password</label>
                  {isLogin && (
                    <button 
                      type="button"
                      onClick={() => {
                        setShowForgot(true);
                        setError('');
                        setSuccess('');
                      }} 
                      className="text-xs font-bold text-[#6366f1] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-white/30 pointer-events-none">
                    <LucideLock size={18} />
                  </span>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] outline-none text-white text-sm transition-all"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 rounded-xl bg-[#6366f1] hover:bg-[#5053de] text-white font-bold transition-all shadow-lg shadow-[#6366f1]/20 flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>{showForgot ? 'Send Reset Link' : isLogin ? 'Login' : 'Sign Up'}</span>
              )}
            </button>
          </form>

          {/* Divider & OAuth Option (Only when not in Forgot Password view) */}
          {!showForgot && (
            <>
              <div className="relative flex items-center justify-center my-6">
                <div className="absolute inset-x-0 h-[1px] bg-white/10" />
                <span className="relative px-3 bg-[#09090b] text-[10px] font-bold text-white/40 tracking-wider uppercase">Or continue with</span>
              </div>

              {/* Google Button */}
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3 px-6 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold transition-all flex justify-center items-center gap-3 cursor-pointer"
              >
                {/* SVG Google icon */}
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                </svg>
                <span>Continue with Google</span>
              </button>
            </>
          )}

          {/* Toggle */}
          <div className="text-center text-sm font-medium">
            {showForgot ? (
              <button
                onClick={() => {
                  setShowForgot(false);
                  setError('');
                  setSuccess('');
                }}
                className="text-[#6366f1] hover:underline font-bold cursor-pointer"
              >
                Back to Login
              </button>
            ) : (
              <>
                <span className="text-white/40">
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                </span>
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                    setSuccess('');
                  }}
                  className="text-[#6366f1] hover:underline font-bold cursor-pointer"
                >
                  {isLogin ? 'Sign up' : 'Log in'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Simulated Google Account Email Modal */}
        {showGoogleModal && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="glass-card w-full max-w-sm p-6 border border-white/10 space-y-5 relative">
              <div>
                <h3 className="font-extrabold text-white text-base">Continue with Google</h3>
                <p className="text-xs text-white/50 leading-relaxed font-medium mt-1">
                  Enter your Google Account email to continue. Other details will be filled automatically.
                </p>
              </div>
              
              <form onSubmit={handleGoogleModalSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-white/50 tracking-wider block uppercase">Google Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="name@gmail.com"
                    value={googleEmail}
                    onChange={(e) => setGoogleEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 focus:border-[#6366f1] outline-none text-white text-xs transition-all"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowGoogleModal(false)}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white font-bold text-xs transition-all cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 px-4 rounded-xl bg-[#6366f1] hover:bg-[#5053de] text-white font-bold text-xs transition-all shadow-md shadow-[#6366f1]/20 cursor-pointer text-center"
                  >
                    Continue
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
