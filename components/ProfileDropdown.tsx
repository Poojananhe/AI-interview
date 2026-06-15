'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { dbService, UserProfile } from '@/lib/db';
import { 
  LucideSettings, 
  LucideLogOut, 
  LucideCamera, 
  LucideLayoutDashboard, 
  LucideHistory, 
  LucideLightbulb 
} from 'lucide-react';

export default function ProfileDropdown() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    let active = true;
    dbService.getCurrentUser().then((profile) => {
      if (active) {
        setUser(profile);
      }
    });
    
    const handleProfileUpdate = () => {
      dbService.getCurrentUser().then((profile) => {
        if (active) {
          setUser(profile);
        }
      });
    };
    
    window.addEventListener('user-profile-updated', handleProfileUpdate);
    
    // Close dropdown on click outside
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      active = false;
      window.removeEventListener('user-profile-updated', handleProfileUpdate);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Image size must be less than 2MB.");
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;
        await dbService.updateUserProfile({
          avatar_url: base64
        });
      } catch (err) {
        console.error('Failed to upload avatar from dropdown:', err);
        alert('Failed to update profile picture.');
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      await dbService.logout();
      setShowDropdown(false);
      router.push('/');
      // Trigger user profile update so other components reload
      window.dispatchEvent(new Event('user-profile-updated'));
    }
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Button */}
      <button 
        onClick={() => setShowDropdown(!showDropdown)}
        className="w-9 h-9 rounded-full border border-white/10 overflow-hidden shadow-md cursor-pointer flex items-center justify-center bg-gradient-to-tr from-[#6366f1] to-[#a855f7] hover:scale-105 active:scale-95 transition-all"
        aria-label="Profile Menu"
      >
        {user.avatar_url && user.avatar_url.trim() !== '' ? (
          <img 
            src={user.avatar_url} 
            alt={user.full_name} 
            className="w-full h-full object-cover" 
          />
        ) : (
          <span className="text-xs font-black text-white">
            {user.full_name?.charAt(0).toUpperCase()}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <div className="absolute right-0 mt-2.5 w-60 rounded-2xl bg-[#0b0b0e] border border-white/10 p-2 shadow-2xl z-50 animate-in slide-in-from-top-2 duration-250">
          
          {/* Dropdown Header with Profile Photo Upload */}
          <div className="px-3.5 py-3.5 border-b border-white/5 text-left flex items-center gap-3">
            <div className="relative group/avatar w-10 h-10 rounded-full border border-white/10 overflow-hidden bg-gradient-to-tr from-[#6366f1] to-[#a855f7] flex items-center justify-center flex-shrink-0 cursor-pointer shadow-inner">
              {isUploading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : user.avatar_url && user.avatar_url.trim() !== '' ? (
                <img 
                  src={user.avatar_url} 
                  alt={user.full_name} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <span className="text-xs font-black text-white">
                  {user.full_name?.charAt(0).toUpperCase()}
                </span>
              )}
              
              {/* Camera Upload Overlay */}
              <label className="absolute inset-0 bg-black/60 opacity-0 group-hover/avatar:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                <LucideCamera size={14} className="text-white" />
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleAvatarChange} 
                  className="hidden" 
                />
              </label>
            </div>
            
            <div className="overflow-hidden flex-1">
              <p className="text-xs font-extrabold text-white truncate">{user.full_name}</p>
              <p className="text-[10px] font-medium text-white/40 truncate mt-0.5">{user.email}</p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="py-1.5 text-xs space-y-0.5">
            <button
              onClick={() => {
                setShowDropdown(false);
                router.push('/dashboard?tab=dashboard');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-white/70 hover:text-white hover:bg-white/5 transition-all cursor-pointer font-bold"
            >
              <LucideLayoutDashboard size={14} className="text-white/50" />
              <span>Dashboard</span>
            </button>
            
            <button
              onClick={() => {
                setShowDropdown(false);
                router.push('/dashboard?tab=history');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-white/70 hover:text-white hover:bg-white/5 transition-all cursor-pointer font-bold"
            >
              <LucideHistory size={14} className="text-white/50" />
              <span>My Interviews</span>
            </button>

            <button
              onClick={() => {
                setShowDropdown(false);
                router.push('/dashboard?tab=tips');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-white/70 hover:text-white hover:bg-white/5 transition-all cursor-pointer font-bold"
            >
              <LucideLightbulb size={14} className="text-white/50" />
              <span>Tips & Resources</span>
            </button>

            <button
              onClick={() => {
                setShowDropdown(false);
                router.push('/dashboard?tab=settings');
              }}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-white/70 hover:text-white hover:bg-white/5 transition-all cursor-pointer font-bold"
            >
              <LucideSettings size={14} className="text-white/50" />
              <span>Account Settings</span>
            </button>
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-red-400 hover:bg-red-500/5 transition-all cursor-pointer font-bold"
            >
              <LucideLogOut size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
