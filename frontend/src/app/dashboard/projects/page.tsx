"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { getDeterministicProgress, formatStatus } from "@/lib/projectProgress";

export default function UserProjectsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"NEWEST" | "OLDEST" | "DUE_DATE">("NEWEST");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProjects() {
      if (!profile?.id) return;
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("projects")
          .select("*, videos(*)")
          .eq("assigned_user_id", profile.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        if (data) setProjects(data);
      } catch (err) {
        console.error("Failed to fetch user projects:", err);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchProjects();
    }
  }, [profile?.id, authLoading]);

  const filteredProjects = projects
    .filter(p => {
      // Status filter
      if (filter === "IN_PROGRESS") return ['IN_PROGRESS', 'ASSIGNED', 'EDITED_VIDEO_UPLOADED'].includes(p.status);
      if (filter === "AWAITING_REVIEW") return ['UNDER_REVIEW', 'SUBMITTED', 'RESUBMITTED'].includes(p.status);
      if (filter === "REVISION_REQUIRED") return ['REVISION_REQUIRED', 'REVISION_REQUESTED'].includes(p.status);
      if (filter === "APPROVED") return p.status === 'APPROVED';
      if (filter === "COMPLETED") return p.status === 'COMPLETED' || p.status === 'APPROVED';
      return true;
    })
    .filter(p => {
      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || (p.notes && p.notes.toLowerCase().includes(q));
    })
    .sort((a, b) => {
      if (sortBy === "NEWEST") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "OLDEST") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === "DUE_DATE") {
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
      }
      return 0;
    });

  return (
    <div className="flex flex-col gap-space-lg w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">My Projects</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">View and manage the projects assigned to you.</p>
        </div>
      </div>

      {/* Controls: Filters & Search */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-surface-container border border-outline-variant/30">
          {[
            { id: "ALL", label: "All", count: projects.length },
            { id: "IN_PROGRESS", label: "In Progress", count: projects.filter(p => ['IN_PROGRESS', 'ASSIGNED', 'EDITED_VIDEO_UPLOADED'].includes(p.status)).length },
            { id: "AWAITING_REVIEW", label: "Awaiting Review", count: projects.filter(p => ['UNDER_REVIEW', 'SUBMITTED', 'RESUBMITTED'].includes(p.status)).length },
            { id: "REVISION_REQUIRED", label: "Revision Required", count: projects.filter(p => ['REVISION_REQUIRED', 'REVISION_REQUESTED'].includes(p.status)).length },
            { id: "APPROVED", label: "Approved", count: projects.filter(p => p.status === 'APPROVED').length },
            { id: "COMPLETED", label: "Completed", count: projects.filter(p => p.status === 'COMPLETED' || p.status === 'APPROVED').length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                filter === tab.id
                  ? "bg-surface-container-lowest text-on-surface shadow-xs"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-[18px] text-outline">search</span>
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg text-sm bg-surface-container-lowest border border-outline-variant/40 focus:outline-primary text-on-surface"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e: any) => setSortBy(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface-container-lowest border border-outline-variant/40 text-on-surface cursor-pointer"
          >
            <option value="NEWEST">Newest First</option>
            <option value="OLDEST">Oldest First</option>
            <option value="DUE_DATE">Due Date</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 bg-surface-container-lowest rounded-xl border border-surface-container-high">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="font-body-md text-on-surface-variant">Loading projects...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 bg-surface-container-lowest rounded-xl border border-surface-container-high text-center">
          <span className="material-symbols-outlined text-4xl text-outline mb-1">folder_open</span>
          <p className="font-title-md font-bold text-on-surface">No projects assigned yet.</p>
          <p className="font-body-sm text-on-surface-variant max-w-sm">
            {searchQuery ? "No projects match your search query." : "When an admin assigns a video project to you, it will appear here."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
          {filteredProjects.map((project) => {
            const progress = getDeterministicProgress(project.status);
            const statusInfo = formatStatus(project.status);
            const assignedDate = new Date(project.created_at).toLocaleDateString();
            const dueDate = project.deadline ? new Date(project.deadline).toLocaleDateString() : "Flexible";

            return (
              <div
                key={project.id}
                className="flex flex-col bg-surface-container-lowest rounded-xl border border-surface-container-high shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                <div className="p-space-md flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusInfo.colorClass}`}>
                        {statusInfo.label}
                      </span>
                      <span className="text-[11px] font-semibold text-outline">
                        Assigned: {assignedDate}
                      </span>
                    </div>

                    <h3 className="font-title-md font-bold text-on-surface line-clamp-1 mb-1" title={project.name}>
                      {project.name}
                    </h3>
                    <p className="font-body-sm text-on-surface-variant line-clamp-2 mb-4 text-xs">
                      {project.notes || "Complete video voice-over and editing project."}
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-surface-container-high/40">
                    <div>
                      <div className="flex justify-between text-xs font-semibold mb-1">
                        <span className="text-on-surface-variant">Progress</span>
                        <span className="text-on-surface">{progress}%</span>
                      </div>
                      <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            progress === 100 ? 'bg-emerald-500' : progress >= 70 ? 'bg-primary' : 'bg-secondary'
                          }`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-on-surface-variant">
                      <span>Due: {dueDate}</span>
                      <span className="text-[11px]">
                        {project.videos?.original_filename ? "Google Drive Video" : "Video Project"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Link
                        href={`/user/projects/${project.id}`}
                        className="flex-1 py-2 px-3 rounded-lg bg-primary text-on-primary hover:bg-primary/90 text-center font-label-md text-xs font-semibold transition-colors cursor-pointer shadow-xs"
                      >
                        Open Project
                      </Link>
                      <Link
                        href={`/user/workspace/${project.id}`}
                        className="py-2 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-center font-label-md text-xs font-semibold transition-colors cursor-pointer"
                        title="Open Recording Workspace"
                      >
                        <span className="material-symbols-outlined text-[16px] align-middle">mic</span>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
