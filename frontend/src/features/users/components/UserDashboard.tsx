"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";

export default function UserDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchUserProjects() {
      if (!user) return;
      try {
        setIsLoading(true);
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("auth_user_id", user.id)
          .single();

        const profileId = profile?.id || user.id;

        const { data, error } = await supabase
          .from("projects")
          .select("*, videos(*)")
          .or(`assigned_user_id.eq.${profileId},assigned_user_id.eq.${user.id}`)
          .order("updated_at", { ascending: false });

        if (error) throw error;
        if (data) setProjects(data);
      } catch (err) {
        console.error("Failed to fetch user projects:", err);
      } finally {
        setIsLoading(false);
      }
    }

    if (!authLoading && user) {
      fetchUserProjects();
    }
  }, [user, authLoading]);

  const assignedCount = projects.filter(p => p.status === 'ASSIGNED' || p.status === 'DRAFT').length;
  const inProgressCount = projects.filter(p => p.status === 'IN_PROGRESS').length;
  const underReviewCount = projects.filter(p => p.status === 'UNDER_REVIEW').length;
  const completedCount = projects.filter(p => p.status === 'APPROVED').length;

  const activeProject = projects.find(p => p.status === 'IN_PROGRESS' || p.status === 'ASSIGNED') || projects[0];
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Artist";

  return (
    <div className="flex flex-col gap-space-xl">
      {/* 1. Header Section */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-space-md pb-space-sm">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="font-label-sm text-label-sm uppercase tracking-widest text-primary font-bold">Voice Artist Workspace</span>
            <span className="w-1 h-1 rounded-full bg-outline-variant"></span>
            <span className="font-code-sm text-code-sm text-on-surface-variant">Live Studio</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">
            Welcome back, {displayName}
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Here are your real-time video assignments and voice-over production tasks.
          </p>
        </div>
      </section>

      {/* 2. Section: Real Metrics Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
        {/* Assigned */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow group border border-surface-container-high">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-md text-label-md text-on-surface-variant font-semibold">Assigned</span>
            <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-primary font-label-sm text-label-sm font-bold border border-outline-variant/30">
              Queue
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-auto">
            <span className="font-display-lg text-display-lg text-on-surface font-bold">{assignedCount}</span>
            <span className="text-on-surface-variant font-label-sm text-label-sm">Ready to record</span>
          </div>
        </div>
        
        {/* In Progress */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow group border border-surface-container-high">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-md text-label-md text-on-surface-variant font-semibold">In Progress</span>
            <span className="px-2 py-0.5 rounded-full bg-primary-fixed text-on-primary-fixed-variant font-label-sm text-label-sm font-bold border border-primary/20">
              Active
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-auto">
            <span className="font-display-lg text-display-lg text-primary font-bold">{inProgressCount}</span>
            <span className="text-primary font-label-sm text-label-sm">Recording in progress</span>
          </div>
        </div>

        {/* Under Review */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow group border border-surface-container-high">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-md text-label-md text-on-surface-variant font-semibold">Under QA Review</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-label-sm text-label-sm font-bold border border-amber-300">
              Review
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-auto">
            <span className="font-display-lg text-display-lg text-amber-900 font-bold">{underReviewCount}</span>
            <span className="text-amber-800 font-label-sm text-label-sm">Awaiting QA</span>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow group border border-surface-container-high">
          <div className="flex items-center justify-between mb-space-sm">
            <span className="font-label-md text-label-md text-on-surface-variant font-semibold">Approved</span>
            <span className="px-2 py-0.5 rounded-full bg-secondary-container/30 text-on-secondary-fixed-variant font-label-sm text-label-sm font-bold border border-secondary/20">
              Passed
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-auto">
            <span className="font-display-lg text-display-lg text-secondary font-bold">{completedCount}</span>
            <span className="text-secondary font-label-sm text-label-sm">Delivered</span>
          </div>
        </div>
      </section>

      {/* 3. Section: Active Task Hero or Empty State */}
      {isLoading ? (
        <div className="p-12 text-center text-on-surface-variant flex flex-col items-center justify-center gap-3 bg-surface-container-lowest rounded-xl border border-surface-container-high">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span>Loading assigned projects...</span>
        </div>
      ) : activeProject ? (
        <section className="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container-high p-space-lg relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-stretch gap-space-lg relative z-10">
            {/* Video preview block */}
            <div className="w-full lg:w-80 h-52 shrink-0 rounded-lg bg-surface-container-low relative overflow-hidden flex flex-col justify-between p-space-md border border-surface-container-high">
              <div className="relative flex items-center justify-between w-full">
                <span className="px-2 py-0.5 rounded bg-surface-container-high/90 text-on-surface font-label-sm text-label-sm font-semibold flex items-center gap-1 border border-outline-variant/30">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span> Assigned Video
                </span>
                <span className="font-code-sm text-code-sm text-on-surface-variant bg-surface-container/80 px-2 py-0.5 rounded border border-outline-variant/30">
                  {activeProject.status.replace('_', ' ')}
                </span>
              </div>
              
              <div className="relative mx-auto w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg cursor-pointer">
                <span className="material-symbols-outlined text-[24px]">movie</span>
              </div>
              
              <div className="text-center truncate text-xs text-on-surface-variant font-code-sm">
                {activeProject.videos?.original_filename || "Video Asset"}
              </div>
            </div>
            
            {/* Details and Actions */}
            <div className="flex flex-col justify-between flex-1 py-1">
              <div>
                <div className="flex items-center justify-between flex-wrap gap-2 mb-space-xs">
                  <span className="font-label-sm text-label-sm text-primary font-bold uppercase tracking-wider">Active Workspace Task</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-label-sm font-semibold bg-surface-container-high text-on-surface">
                    Status: {activeProject.status.replace('_', ' ')}
                  </span>
                </div>
                <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight mb-2">
                  {activeProject.name}
                </h2>
                <p className="font-body-md text-body-md text-on-surface-variant font-medium">
                  Source media: <span className="font-semibold text-on-surface">{activeProject.videos?.original_filename || "Original Video"}</span>
                </p>
                {activeProject.notes && (
                  <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-900">
                    <strong>Admin Note:</strong> {activeProject.notes}
                  </div>
                )}
              </div>
              
              {/* CTA Controls */}
              <div className="flex items-center flex-wrap gap-space-sm pt-space-md">
                <Link 
                  href={`/user/workspace/${activeProject.id}`} 
                  className="px-space-lg py-2.5 bg-primary hover:bg-primary-container text-on-primary rounded-lg font-label-md text-label-md font-bold flex items-center gap-space-xs shadow-sm active:scale-[0.99] transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">mic</span>
                  <span>Open Recording Workspace</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container-high p-space-xl text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-3xl">mic</span>
          </div>
          <h2 className="font-title-lg font-bold text-on-surface mb-2">No Projects Assigned Yet</h2>
          <p className="text-on-surface-variant text-sm max-w-md mx-auto">
            Your studio administrator hasn't assigned any videos to your account yet. When a project is assigned, it will appear here for voice-over recording.
          </p>
        </section>
      )}

      {/* 4. Section: All Assigned Projects Table */}
      {projects.length > 0 && (
        <section className="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container-high overflow-hidden">
          <div className="p-space-md border-b border-surface-container-high">
            <h3 className="font-title-md font-bold text-on-surface">All Assigned Projects ({projects.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-body-md text-body-md border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">
                  <th className="py-3 px-space-md font-semibold">Project Name</th>
                  <th className="py-3 px-space-md font-semibold">Source Video</th>
                  <th className="py-3 px-space-md font-semibold">Status</th>
                  <th className="py-3 px-space-md text-right font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high">
                {projects.map(p => (
                  <tr key={p.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="py-3 px-space-md font-semibold text-on-surface">{p.name}</td>
                    <td className="py-3 px-space-md text-on-surface-variant font-code-sm text-xs">{p.videos?.original_filename || "N/A"}</td>
                    <td className="py-3 px-space-md">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-container-high text-on-surface">
                        {p.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-space-md text-right">
                      <Link 
                        href={`/user/workspace/${p.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-primary text-on-primary rounded-lg text-xs font-semibold hover:bg-primary-container transition-colors"
                      >
                        <span className="material-symbols-outlined text-[14px]">mic</span>
                        <span>Record</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
