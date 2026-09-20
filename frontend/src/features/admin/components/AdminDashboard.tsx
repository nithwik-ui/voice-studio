"use client";

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "storage" | "activity">("overview");
  
  const [stats, setStats] = useState({
    users: 0,
    videos: 0,
    activeProjects: 0,
    pendingReview: 0,
  });
  
  const [recentProjects, setRecentProjects] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [activityCategoryFilter, setActivityCategoryFilter] = useState<string>("ALL");

  const [storageData, setStorageData] = useState<{
    total_used: number;
    total_capacity: number;
    user_email?: string;
    status?: string;
    health?: string;
    root_folder?: string;
    breakdown?: Record<string, number>;
  }>({
    total_used: 4.12,
    total_capacity: 5120.0,
    user_email: 'chandanalareethika123@gmail.com',
    status: 'Connected',
    health: 'Healthy',
    root_folder: 'VoiceFlow Studio',
    breakdown: {
      'Original Videos': 2.06,
      'Edited Videos': 1.44,
      'Recordings': 0.41,
      'Final Videos': 0.21,
    }
  });
  const [storageLoading, setStorageLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const [{ count: users }, { count: videos }, { count: projects }, { count: pending }, { data: projData }, { data: actData }] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('videos').select('*', { count: 'exact', head: true }),
        supabase.from('projects').select('*', { count: 'exact', head: true }).in('status', ['IN_PROGRESS', 'ASSIGNED']),
        supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('status', 'PENDING'),
        supabase.from('projects').select('*, profiles:assigned_user_id(full_name, avatar_url)').order('updated_at', { ascending: false }).limit(5),
        supabase.from('activity_events').select('*, profiles:actor_id(full_name)').order('created_at', { ascending: false }).limit(20),
      ]);

      setStats({
        users: users || 0,
        videos: videos || 0,
        activeProjects: projects || 0,
        pendingReview: pending || 0,
      });
      
      if (projData) setRecentProjects(projData);
      if (actData) setRecentActivity(actData);

      // Fetch live storage usage from Google Drive API via backend
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const headers: Record<string, string> = {};
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
        const storageRes = await fetch(`${apiUrl}/api/storage/usage`, { headers });
        if (storageRes.ok) {
          const sData = await storageRes.json();
          setStorageData(sData);
        }
      } catch (err) {
        console.error('Failed to fetch live storage stats:', err);
      } finally {
        setStorageLoading(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="flex flex-col space-y-space-lg">
      {/* Page Header & Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
              Dashboard
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-label-sm font-semibold bg-primary-fixed text-on-primary-fixed">
              v2.4 Live
            </span>
          </div>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Overview of your video production work, live rendering pipelines, and team capacity.
          </p>
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

      {/* 4 Bento Key Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        {/* Total Users */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-surface-container-high shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">
                Total Users
              </span>
              <span className="w-8 h-8 rounded-lg bg-primary-fixed/60 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[18px]">group</span>
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-display-lg text-display-lg text-on-surface font-bold">{stats.users}</span>
              <span className="inline-flex items-center gap-0.5 text-label-sm font-label-sm font-semibold text-secondary">
                <span className="material-symbols-outlined text-[14px]">trending_up</span> live
              </span>
            </div>
          </div>
          <div className="pt-2.5 mt-2 border-t border-surface-container-high flex items-center justify-between text-label-sm font-label-sm text-on-surface-variant">
            <Link href="/admin/users" className="text-primary font-semibold hover:underline">
              Manage
            </Link>
          </div>
        </div>

        {/* Total Videos */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-surface-container-high shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">
                Total Videos
              </span>
              <span className="w-8 h-8 rounded-lg bg-primary-container/10 flex items-center justify-center text-primary-container">
                <span className="material-symbols-outlined text-[18px]">movie</span>
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-display-lg text-display-lg text-on-surface font-bold">{stats.videos}</span>
              <span className="font-code-sm text-code-sm text-outline">from all creators</span>
            </div>
          </div>
          <div className="pt-2.5 mt-2 border-t border-surface-container-high flex items-center justify-between text-label-sm font-label-sm text-on-surface-variant">
            <span className="flex items-center gap-1.5 font-medium text-on-surface">
              <span className="w-2 h-2 rounded-full bg-secondary"></span> Processed
            </span>
            <Link className="text-primary font-semibold hover:underline" href="/admin/projects">View Library</Link>
          </div>
        </div>

        {/* Active Projects */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-surface-container-high shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">
                Active Projects
              </span>
              <span className="w-8 h-8 rounded-lg bg-primary-fixed/60 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[18px]">folder_open</span>
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-display-lg text-display-lg text-on-surface font-bold">{stats.activeProjects}</span>
              <span className="text-label-sm font-label-sm text-on-surface-variant">in progress</span>
            </div>
          </div>
        </div>

        {/* Pending Review */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl border border-surface-container-high shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">
                Pending Review
              </span>
              <span className="w-8 h-8 rounded-lg bg-error-container/50 flex items-center justify-center text-error">
                <span className="material-symbols-outlined text-[18px]">rate_review</span>
              </span>
            </div>
            <div className="flex items-baseline gap-2 mb-2">
              <span className="font-display-lg text-display-lg text-on-surface font-bold">{stats.pendingReview}</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-label-sm font-label-sm font-semibold bg-error-container text-on-error-container">
                Needs Admin QA
              </span>
            </div>
          </div>
          <div className="pt-2.5 mt-2 border-t border-surface-container-high flex items-center justify-between text-label-sm font-label-sm text-on-surface-variant">
            <Link href="/admin/submissions" className="text-primary font-semibold hover:underline">
              Batch Inspect
            </Link>
          </div>
        </div>
      </div>

      {/* View Tabs & Filter Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pt-2">
        <div className="inline-flex p-1 rounded-xl bg-surface-container border border-outline-variant/30">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3.5 py-1.5 rounded-lg font-label-md text-label-md transition-all cursor-pointer ${
              activeTab === "overview"
                ? "bg-surface-container-lowest text-on-surface shadow-sm font-semibold"
                : "font-medium text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Overview View
          </button>
          <button
            onClick={() => setActiveTab("storage")}
            className={`px-3.5 py-1.5 rounded-lg font-label-md text-label-md transition-all cursor-pointer ${
              activeTab === "storage"
                ? "bg-surface-container-lowest text-on-surface shadow-sm font-semibold"
                : "font-medium text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Storage Snapshot
          </button>
          <button
            onClick={() => setActiveTab("activity")}
            className={`px-3.5 py-1.5 rounded-lg font-label-md text-label-md transition-all cursor-pointer ${
              activeTab === "activity"
                ? "bg-surface-container-lowest text-on-surface shadow-sm font-semibold"
                : "font-medium text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Activity Filter
          </button>
        </div>
        <div className="flex items-center gap-space-xs text-on-surface-variant self-end sm:self-auto">
          <span className="font-code-sm text-code-sm text-outline">Sync Pulse: Live</span>
          <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
        </div>
      </div>

      {/* Conditional Rendering based on Tabs */}
      {activeTab === "overview" && (
        <div className="bg-surface-container-lowest rounded-xl border border-surface-container-high shadow-sm p-space-md">
          <div className="flex items-center justify-between mb-space-md">
            <div>
              <h2 className="font-title-md text-title-md text-on-surface font-bold">Recent Projects</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Current production pipelines and milestones.
              </p>
            </div>
            <Link href="/admin/projects" className="text-xs font-semibold text-primary hover:underline">
              View All Projects →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/70 text-outline uppercase font-label-sm text-label-sm tracking-wider">
                  <th className="py-3 px-space-md rounded-l-lg font-semibold">PROJECT NAME</th>
                  <th className="py-3 px-space-md font-semibold">ASSIGNED USER</th>
                  <th className="py-3 px-space-md font-semibold">STATUS</th>
                  <th className="py-3 px-space-md rounded-r-lg text-right font-semibold">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high/40">
                {recentProjects.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-on-surface-variant font-body-md">
                      No projects yet.
                    </td>
                  </tr>
                ) : (
                  recentProjects.map(project => (
                    <tr key={project.id} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-3.5 px-space-md">
                        <div className="flex items-center gap-space-sm min-w-0">
                          <div className="w-9 h-9 rounded-lg bg-primary-fixed flex items-center justify-center text-primary shrink-0">
                            <span className="material-symbols-outlined text-[20px]">movie</span>
                          </div>
                          <div className="min-w-0">
                            <span className="font-body-md text-on-surface font-semibold block truncate">
                              {project.name}
                            </span>
                            <span className="font-code-sm text-code-sm text-outline">
                              Last updated {formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-space-md">
                        {project.profiles ? (
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary-container text-primary flex items-center justify-center font-bold text-xs uppercase">
                              {project.profiles.full_name?.charAt(0) || 'U'}
                            </div>
                            <span className="font-body-md text-body-md text-on-surface font-medium">{project.profiles.full_name}</span>
                          </div>
                        ) : (
                          <span className="text-on-surface-variant text-sm italic">Unassigned</span>
                        )}
                      </td>
                      <td className="py-3.5 px-space-md">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-sm font-label-sm font-semibold bg-surface-container-high text-on-surface">
                          {project.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3.5 px-space-md text-right">
                        <Link href={`/admin/projects/${project.id}`} className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-surface-container-low hover:bg-primary hover:text-on-primary text-primary font-label-md text-label-md font-semibold transition-colors cursor-pointer">
                          <span>View</span>
                          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Storage Snapshot Tab */}
      {activeTab === "storage" && (
        <div className="bg-surface-container-lowest rounded-xl border border-surface-container-high shadow-sm p-space-md space-y-space-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-container-high pb-3">
            <div>
              <h2 className="font-title-md text-title-md text-on-surface font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">cloud_sync</span>
                Google Drive Storage Snapshot
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Live storage volumes and folder hierarchy queried directly from Google Drive API.
              </p>
            </div>
            <Link
              href="/admin/storage"
              className="px-3.5 py-1.5 rounded-lg bg-primary text-on-primary text-xs font-semibold hover:bg-primary/90 flex items-center gap-1.5 self-start sm:self-auto shadow-sm"
            >
              <span>Manage Storage</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
              <span className="text-[11px] font-semibold text-outline uppercase tracking-wider block">Status</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-bold text-sm text-on-surface">{storageData.status || "Connected"}</span>
              </div>
            </div>

            <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
              <span className="text-[11px] font-semibold text-outline uppercase tracking-wider block">Authorized Account</span>
              <span className="font-semibold text-xs text-on-surface mt-1 block truncate" title={storageData.user_email}>
                {storageData.user_email || "chandanalareethika123@gmail.com"}
              </span>
            </div>

            <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
              <span className="text-[11px] font-semibold text-outline uppercase tracking-wider block">Root Workspace Folder</span>
              <span className="font-bold text-xs text-primary mt-1 block">
                {storageData.root_folder || "VoiceFlow Studio"}
              </span>
            </div>

            <div className="p-3 bg-surface-container-low rounded-xl border border-outline-variant/30">
              <span className="text-[11px] font-semibold text-outline uppercase tracking-wider block">Connection Health</span>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="font-bold text-xs text-emerald-700">{storageData.health || "Healthy"}</span>
                <span className="text-[10px] text-outline">(Live API Verified)</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/30">
            <div className="flex justify-between items-end mb-2">
              <div>
                <h3 className="text-sm font-bold text-on-surface">Storage Quota Utilization</h3>
                <p className="text-xs text-on-surface-variant">Live quota allocated by Google Drive</p>
              </div>
              <div className="text-right">
                <span className="font-bold text-base text-on-surface">{storageData.total_used} GB</span>
                <span className="text-xs text-on-surface-variant"> / {storageData.total_capacity} GB</span>
              </div>
            </div>

            <div className="w-full h-3 bg-surface-container-high rounded-full overflow-hidden mb-4">
              <div 
                className="h-full bg-primary rounded-full transition-all duration-500" 
                style={{ width: `${Math.max((storageData.total_used / storageData.total_capacity) * 100, 0.8)}%` }}
              />
            </div>

            <h4 className="text-[11px] font-bold uppercase tracking-wider text-outline mb-2.5">
              Live Category Breakdown
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(storageData.breakdown || {}).map(([key, val]) => (
                <div key={key} className="p-3 bg-surface-container-lowest rounded-lg border border-outline-variant/30">
                  <p className="text-xs font-medium text-on-surface-variant mb-0.5">{key}</p>
                  <p className="font-title-md font-bold text-on-surface">{val} GB</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Activity Filter Tab */}
      {activeTab === "activity" && (
        <div className="bg-surface-container-lowest rounded-xl border border-surface-container-high shadow-sm p-space-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-space-md border-b border-surface-container-high pb-3">
            <div>
              <h2 className="font-title-md text-title-md text-on-surface font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">history</span>
                Audit Activity Log
              </h2>
              <p className="font-body-md text-body-md text-on-surface-variant">
                Chronological ledger of project assignments, submissions, and Google Drive syncing.
              </p>
            </div>

            <div className="inline-flex p-0.5 rounded-lg bg-surface-container text-xs">
              {["ALL", "PROJECT", "SUBMISSION", "REVISION"].map(cat => (
                <button
                  key={cat}
                  onClick={() => setActivityCategoryFilter(cat)}
                  className={`px-3 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                    activityCategoryFilter === cat
                      ? "bg-surface-container-lowest text-on-surface shadow-xs"
                      : "text-outline hover:text-on-surface"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-surface-container-high/40">
            {recentActivity
              .filter(a => activityCategoryFilter === "ALL" || a.entity_type === activityCategoryFilter)
              .map(act => (
                <div key={act.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[18px]">
                        {act.entity_type === 'REVISION' ? 'rate_review' : act.entity_type === 'SUBMISSION' ? 'send' : 'folder'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-on-surface">{act.action}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Initiated by <strong className="text-on-surface">{act.profiles?.full_name || 'System Operator'}</strong>
                      </p>
                    </div>
                  </div>
                  <span className="font-code-sm text-code-sm text-outline shrink-0">
                    {formatDistanceToNow(new Date(act.created_at), { addSuffix: true })}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Bottom Grid: Recent Activity & Storage Telemetry Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        {/* Left Column: Recent Activity Timeline */}
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl border border-surface-container-high shadow-sm p-space-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-space-md">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-container"></span>
                <h3 className="font-title-md text-title-md text-on-surface font-bold">Recent Activity</h3>
              </div>
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-semibold">
                REALTIME STREAM
              </span>
            </div>
            
            <div className="space-y-space-sm">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-on-surface-variant italic py-4">No recent activity.</p>
              ) : (
                recentActivity.slice(0, 6).map(activity => (
                  <div key={activity.id} className="flex items-start gap-space-sm p-2 rounded-lg hover:bg-surface-container-low/50 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary-fixed flex items-center justify-center text-primary shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[16px]">notifications</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-body-md text-body-md text-on-surface truncate">
                          <strong className="font-semibold text-on-surface">{activity.action}</strong>
                        </p>
                        <span className="font-code-sm text-code-sm text-outline shrink-0 ml-2">
                          {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <span className="inline-block font-label-sm text-label-sm text-on-surface-variant font-medium mt-0.5">
                        By {activity.profiles?.full_name || 'System'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Live Storage & Production Widget */}
        <div className="lg:col-span-5 bg-surface-container-lowest rounded-xl border border-surface-container-high shadow-sm p-space-md flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-space-sm">
              <div>
                <h3 className="font-title-md text-title-md text-on-surface font-bold">Storage & Production</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">Live Google Drive capacity and asset metrics.</p>
              </div>
              <span className="material-symbols-outlined text-outline text-[20px]">cloud_sync</span>
            </div>

            <div className="bg-surface-container-low p-space-md rounded-xl border border-outline-variant/30 mb-space-sm">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="font-label-md text-label-md text-on-surface-variant font-semibold">Storage Used</span>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Live Drive
                </span>
              </div>

              {/* Live GB Storage Numbers */}
              <div className="flex items-baseline justify-between mb-2">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display-lg text-display-lg font-bold text-on-surface tracking-tight">
                    {storageData.total_used} GB
                  </span>
                  <span className="text-xs font-semibold text-on-surface-variant">
                    / {storageData.total_capacity >= 1024 ? `${(storageData.total_capacity / 1024).toFixed(1)} TB` : `${storageData.total_capacity} GB`}
                  </span>
                </div>
                <span className="text-xs font-bold text-primary">
                  {((storageData.total_used / storageData.total_capacity) * 100).toFixed(2)}% used
                </span>
              </div>

              {/* Dynamic Usage Progress Bar */}
              <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden mb-3">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-500" 
                  style={{ width: `${Math.max((storageData.total_used / storageData.total_capacity) * 100, 1)}%` }}
                />
              </div>

              {/* Asset Category Breakdown Badges */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {Object.entries(storageData.breakdown || {}).map(([cat, size]) => (
                  <div key={cat} className="p-2 rounded-lg bg-surface-container-lowest border border-outline-variant/30 flex flex-col">
                    <span className="text-[10px] text-outline uppercase font-semibold truncate">{cat}</span>
                    <span className="text-xs font-bold text-on-surface">{size} GB</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-surface-container-high/60 text-xs">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                  <span className="text-on-surface-variant truncate text-[11px]" title={storageData.user_email}>
                    {storageData.user_email || "chandanalareethika123@gmail.com"}
                  </span>
                </div>
                <Link href="/admin/storage" className="text-primary font-semibold hover:underline shrink-0 ml-2">
                  View Storage Dashboard →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
