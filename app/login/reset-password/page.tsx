'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { dbService } from '@/lib/db';
import { LucideLock, LucideArrowLeft, LucideCheckCircle } from 'lucide-react';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      await dbService.updatePassword(password);
      setSuccess('Your password has been reset successfully!');
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (err) {
      setError((err as Error).message || 'Failed to update password. Please check your reset link session.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-[#6366f1]/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-[#a855f7]/5 blur-[120px] pointer-events-none" />

      {/* Back to Login Button */}
      <Link 
        href="/login" 
        className="absolute top-6 left-6 z-50 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-sm font-medium"
      >
        <LucideArrowLeft size={16} />
        <span>Back to Login</span>
      </Link>

      <div className="w-full max-w-md space-y-8 z-10">
        <div className="text-center">
          <div className="inline-flex w-12 h-12 rounded-xl bg-[#6366f1]/10 border border-[#6366f1]/25 items-center justify-center text-[#6366f1] mb-4">
            <LucideLock size={24} />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-white mb-2">
            Create new password
          </h2>
          <p className="text-white/40 text-sm font-medium">
            Please enter your new password below.
          </p>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {success ? (
          <div className="p-6 rounded-2xl bg-[#0b0b0e] border border-white/10 text-center space-y-4">
            <div className="inline-flex w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 items-center justify-center text-emerald-400">
              <LucideCheckCircle size={20} />
            </div>
            <p className="text-emerald-400 text-sm font-bold">{success}</p>
            <p className="text-xs text-white/40">Redirecting to login page...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Password */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-white/60 tracking-wide block uppercase">New Password</label>
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

            {/* Confirm Password */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-white/60 tracking-wide block uppercase">Confirm Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-white/30 pointer-events-none">
                  <LucideLock size={18} />
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 focus:border-[#6366f1] focus:ring-1 focus:ring-[#6366f1] outline-none text-white text-sm transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-6 rounded-xl bg-[#6366f1] hover:bg-[#5053de] text-white font-bold transition-all shadow-lg shadow-[#6366f1]/20 flex justify-center items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>Reset Password</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
