"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    users: 0,
    videos: 0,
    activeProjects: 0,
    pendingReview: 0,
  });

  useEffect(() => {
    async function fetchStats() {
      const [{ count: users }, { count: videos }, { count: projects }, { count: pending }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('videos').select('*', { count: 'exact', head: true }),
        supabase.from('projects').select('*', { count: 'exact', head: true }).in('status', ['IN_PROGRESS', 'ASSIGNED']),
        supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
      ]);

      setStats({
        users: users || 0,
        videos: videos || 0,
        activeProjects: projects || 0,
        pendingReview: pending || 0,
      });
    }

    fetchStats();
  }, []);

  return (
    <div className="flex flex-col w-full space-y-space-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">Dashboard</h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-label-sm font-semibold bg-primary-fixed text-on-primary-fixed">v2.4 Live</span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">Overview of your video production work, live rendering pipelines, and team capacity.</p>
        </div>
        <div className="flex items-center gap-space-sm flex-wrap">
          <Link href="/admin/projects/upload" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-container-lowest border border-outline-variant/60 text-on-surface hover:bg-surface-container-low transition-all shadow-sm active:scale-[0.99] cursor-pointer">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">upload_file</span>
            <span className="font-label-md text-label-md font-semibold">Upload Videos</span>
          </Link>
          <Link href="/admin/projects/create" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary-container text-on-primary hover:bg-primary transition-all shadow-sm active:scale-[0.99] cursor-pointer">
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span className="font-label-md text-label-md font-semibold">Create Project</span>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-surface-container-high shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">Total Users</span>
              <span className="w-8 h-8 rounded-lg bg-primary-fixed/60 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[18px]">group</span>
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-display-lg text-display-lg text-on-surface font-bold">{stats.users}</span>
            </div>
          </div>
          <div className="pt-2.5 mt-2 border-t border-surface-container-high flex items-center justify-between text-label-sm font-label-sm text-on-surface-variant">
            <Link className="text-primary font-semibold hover:underline" href="/admin/users">Manage</Link>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-surface-container-high shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">Total Videos</span>
              <span className="w-8 h-8 rounded-lg bg-primary-container/10 flex items-center justify-center text-primary-container">
                <span className="material-symbols-outlined text-[18px]">movie</span>
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-display-lg text-display-lg text-on-surface font-bold">{stats.videos}</span>
            </div>
          </div>
          <div className="pt-2.5 mt-2 border-t border-surface-container-high flex items-center justify-between text-label-sm font-label-sm text-on-surface-variant">
            <Link className="text-primary font-semibold hover:underline" href="/admin/projects">View Library</Link>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-surface-container-high shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">Active Projects</span>
              <span className="w-8 h-8 rounded-lg bg-primary-fixed/60 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[18px]">folder_open</span>
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-display-lg text-display-lg text-on-surface font-bold">{stats.activeProjects}</span>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-surface-container-high shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">Pending Review</span>
              <span className="w-8 h-8 rounded-lg bg-error-container/50 flex items-center justify-center text-error">
                <span className="material-symbols-outlined text-[18px]">rate_review</span>
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-display-lg text-display-lg text-on-surface font-bold">{stats.pendingReview}</span>
            </div>
          </div>
          <div className="pt-2.5 mt-2 border-t border-surface-container-high flex items-center justify-between text-label-sm font-label-sm text-on-surface-variant">
            <Link className="text-primary font-semibold hover:underline" href="/admin/submissions">Review Now</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
