"use client";

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [activeTab, setActiveTab] = useState<'admin' | 'user' | 'forgot'>('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      // After successful login, route based on their role
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role')
        .eq('auth_user_id', data.user?.id)
        .single();

      if (profileData?.role === 'ADMIN') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background text-slate-800 font-sans min-h-screen antialiased flex flex-col">
      <header className="bg-white border-b border-slate-200/80 px-6 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold shadow-xs">
            <span className="material-symbols-outlined text-[16px]">mic</span>
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-slate-900">
              VoiceFlow<span className="text-indigo-600 font-semibold text-xs ml-1 px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-100 uppercase">Auth Hub</span>
            </span>
          </div>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs font-medium text-slate-600">
          <button 
            onClick={() => setActiveTab('admin')} 
            className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${activeTab === 'admin' ? 'text-indigo-700 bg-white shadow-xs' : 'hover:text-slate-900'}`}
          >
            <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span>
            1. Admin Login
          </button>
          <button 
            onClick={() => setActiveTab('user')} 
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${activeTab === 'user' ? 'text-indigo-700 bg-white shadow-xs' : 'hover:text-slate-900'}`}
          >
            <span className="material-symbols-outlined text-[14px]">person</span>
            2. Talent Login
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 sm:p-10 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl pointer-events-none"></div>

        <div className="w-full max-w-[440px] transition-all duration-300 relative z-10">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-200/50 p-8 sm:p-10">
            <div className="flex flex-col items-center text-center mb-8">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white mb-4 shadow-md ${activeTab === 'admin' ? 'bg-indigo-600 shadow-indigo-200' : 'bg-purple-600 shadow-purple-200'}`}>
                <span className="material-symbols-outlined text-[24px]">login</span>
              </div>
              <span className={`text-xs font-semibold uppercase tracking-widest mb-1 ${activeTab === 'admin' ? 'text-indigo-600' : 'text-purple-600'}`}>
                VoiceFlow {activeTab === 'admin' ? 'Studio Admin' : 'Artist Portal'}
              </span>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Welcome back</h1>
              <p className="text-sm text-slate-500 mt-1">Sign in to {activeTab === 'admin' ? 'manage your video projects' : 'continue your assigned work'}.</p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded bg-error-container text-on-error-container text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">Email</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium" 
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">Password</label>
                </div>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium" 
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
              >
                <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
