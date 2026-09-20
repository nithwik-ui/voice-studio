"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { getDeterministicProgress, formatStatus } from '@/lib/projectProgress';

export default function UserDashboard() {
  const { user, profile, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.id) return;

    async function loadDashboardData() {
      try {
        setLoading(true);
        // 1. Fetch assigned projects
        const { data: projs, error: pErr } = await supabase
          .from('projects')
          .select('*, videos(*)')
          .eq('assigned_user_id', profile!.id)
          .order('created_at', { ascending: false });

        if (pErr) console.error("Error fetching projects:", pErr);
        setProjects(projs || []);

        // 2. Fetch user's recent activity
        const { data: acts, error: aErr } = await supabase
          .from('activity_events')
          .select('*')
          .eq('actor_id', profile!.id)
          .order('created_at', { ascending: false })
          .limit(6);

        if (aErr) console.error("Error fetching activity:", aErr);
        setActivities(acts || []);
      } catch (err) {
        console.error("Dashboard load failed:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [profile?.id]);

  // Metric counts
  const totalAssigned = projects.length;
  const inProgress = projects.filter(p => ['IN_PROGRESS', 'EDITED_VIDEO_UPLOADED'].includes(p.status)).length;
  const awaitingReview = projects.filter(p => ['UNDER_REVIEW', 'SUBMITTED', 'RESUBMITTED'].includes(p.status)).length;
  const revisionRequired = projects.filter(p => ['REVISION_REQUIRED', 'REVISION_REQUESTED'].includes(p.status)).length;
  const completed = projects.filter(p => ['APPROVED', 'COMPLETED'].includes(p.status)).length;

  if (authLoading || (loading && !projects.length)) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="font-body-md text-on-surface-variant">Loading your projects and activity...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full space-y-space-lg">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">Talent Dashboard</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Manage your assigned projects, recordings, uploads, and reviews.
          </p>
        </div>
      </div>

      {/* Real Summary Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="p-4 bg-surface-container-lowest rounded-xl border border-surface-container-high shadow-sm">
          <span className="text-xs font-semibold text-outline uppercase tracking-wider block">Assigned Projects</span>
          <span className="font-headline-md font-bold text-on-surface mt-1 block">{totalAssigned}</span>
        </div>
        <div className="p-4 bg-surface-container-lowest rounded-xl border border-surface-container-high shadow-sm">
          <span className="text-xs font-semibold text-outline uppercase tracking-wider block">In Progress</span>
          <span className="font-headline-md font-bold text-on-surface mt-1 block">{inProgress}</span>
        </div>
        <div className="p-4 bg-surface-container-lowest rounded-xl border border-surface-container-high shadow-sm">
          <span className="text-xs font-semibold text-outline uppercase tracking-wider block">Awaiting Review</span>
          <span className="font-headline-md font-bold text-amber-600 mt-1 block">{awaitingReview}</span>
        </div>
        <div className="p-4 bg-surface-container-lowest rounded-xl border border-surface-container-high shadow-sm">
          <span className="text-xs font-semibold text-outline uppercase tracking-wider block">Revision Required</span>
          <span className="font-headline-md font-bold text-error mt-1 block">{revisionRequired}</span>
        </div>
        <div className="p-4 bg-surface-container-lowest rounded-xl border border-surface-container-high shadow-sm">
          <span className="text-xs font-semibold text-outline uppercase tracking-wider block">Completed</span>
          <span className="font-headline-md font-bold text-emerald-600 mt-1 block">{completed}</span>
        </div>
      </div>

      {/* Real Assigned Projects Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-surface-container-high shadow-sm p-space-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-title-md text-title-md text-on-surface font-bold">Assigned Projects</h2>
          <Link href="/dashboard/projects" className="text-xs font-semibold text-primary hover:underline">
            View all projects
          </Link>
        </div>
        
        {projects.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant">
            <span className="material-symbols-outlined text-4xl text-outline mb-2 block">folder_open</span>
            <p className="font-title-sm font-semibold">No projects assigned yet.</p>
            <p className="text-xs text-on-surface-variant mt-1">
              When an administrator assigns a video project to you, it will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/70 text-outline uppercase font-label-sm text-label-sm tracking-wider">
                  <th className="py-3 px-space-md rounded-l-lg font-semibold">PROJECT NAME</th>
                  <th className="py-3 px-space-md font-semibold">PROGRESS</th>
                  <th className="py-3 px-space-md font-semibold">STATUS</th>
                  <th className="py-3 px-space-md font-semibold">DUE DATE</th>
                  <th className="py-3 px-space-md rounded-r-lg text-right font-semibold">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high/40">
                {projects.map((proj) => {
                  const progress = getDeterministicProgress(proj.status);
                  const statusInfo = formatStatus(proj.status);
                  const dueDateStr = proj.deadline ? new Date(proj.deadline).toLocaleDateString() : "Flexible";
                  
                  return (
                    <tr key={proj.id} className="hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-3.5 px-space-md">
                        <div className="flex items-center gap-space-sm min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-surface-container flex items-center justify-center text-primary shrink-0">
                            <span className="material-symbols-outlined text-[18px]">movie</span>
                          </div>
                          <div className="min-w-0">
                            <span className="font-body-md text-on-surface font-semibold block truncate">{proj.name}</span>
                            <span className="text-[11px] text-on-surface-variant block truncate">
                              {proj.videos?.original_filename || "Complete Video"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-space-md min-w-[160px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-surface-container-high rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${progress === 100 ? 'bg-emerald-500' : progress >= 70 ? 'bg-primary' : 'bg-secondary'}`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="font-label-sm text-label-sm text-on-surface font-semibold">{progress}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-space-md">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-sm font-label-sm font-semibold border ${statusInfo.colorClass}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-space-md">
                        <span className="text-xs text-on-surface-variant font-medium">{dueDateStr}</span>
                      </td>
                      <td className="py-3.5 px-space-md text-right">
                        <Link 
                          href={`/user/projects/${proj.id}`} 
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-primary-container text-on-primary hover:bg-primary font-label-md text-label-md font-semibold transition-colors cursor-pointer shadow-sm"
                        >
                          Open Project
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Real Recent Activity */}
      <div className="bg-surface-container-lowest rounded-xl border border-surface-container-high shadow-sm p-space-md">
        <h2 className="font-title-md text-title-md text-on-surface font-bold mb-4">Recent Activity</h2>
        {activities.length === 0 ? (
          <div className="p-8 text-center text-on-surface-variant text-sm">
            <span className="material-symbols-outlined text-3xl text-outline mb-1 block">history</span>
            No recent activity recorded yet.
          </div>
        ) : (
          <ul className="divide-y divide-surface-container-high/40">
            {activities.map(act => (
              <li key={act.id} className="py-3 flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-primary-container/40 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <span className="material-symbols-outlined text-[16px]">bolt</span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-on-surface">{act.action}</p>
                  <p className="text-xs text-on-surface-variant mt-0.5">
                    {new Date(act.created_at).toLocaleDateString()} at {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
