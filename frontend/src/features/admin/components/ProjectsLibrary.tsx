"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ProjectsLibrary() {
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [projects, setProjects] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Export State
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    async function fetchProjects() {
      try {
        const { data, error } = await supabase
          .from("projects")
          .select("*, videos(*), profiles:assigned_user_id(*)")
          .order("created_at", { ascending: false });
          
        if (error) throw error;
        if (data) setProjects(data);
      } catch (err) {
        console.error("Failed to fetch projects", err);
      } finally {
        setLoading(false);
      }
    }
    fetchProjects();
  }, []);

  const handleExportAll = async (format: 'json' | 'csv') => {
    try {
      setExporting(true);
      setExportSuccess(null);
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch(`${apiUrl}/api/projects/export-all`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (!res.ok) {
        throw new Error(`Export failed (Status ${res.status})`);
      }

      const exportData = await res.json();

      let blob: Blob;
      let filename: string;

      if (format === 'json') {
        blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        filename = `voiceflow_production_manifest_${new Date().toISOString().split('T')[0]}.json`;
      } else {
        // CSV conversion
        const headers = ["Project Name", "Status", "Assigned User", "Original Video Filename", "Drive File ID", "Google Drive URL", "Edited Versions", "Created Date"];
        const rows = (exportData.projects || []).map((p: any) => [
          `"${p.project_name.replace(/"/g, '""')}"`,
          p.status,
          `"${(p.assigned_user || 'Unassigned').replace(/"/g, '""')}"`,
          `"${(p.original_video?.filename || '').replace(/"/g, '""')}"`,
          p.original_video?.drive_file_id || '',
          p.original_video?.drive_url || '',
          p.edited_versions_count || 0,
          p.created_at
        ]);

        const csvContent = [headers.join(','), ...rows.map((r: any[]) => r.join(','))].join('\n');
        blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        filename = `voiceflow_production_manifest_${new Date().toISOString().split('T')[0]}.csv`;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportSuccess(`Export completed! Downloaded ${filename}`);
      setTimeout(() => setExportSuccess(null), 4000);
    } catch (err: any) {
      console.error("Export error:", err);
      alert(`Export error: ${err.message}`);
    } finally {
      setExporting(false);
    }
  };

  const filteredProjects = projects.filter(p => 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.videos?.original_filename?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.profiles?.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col w-full space-y-space-lg">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
        <div className="flex flex-col">
          <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight">Video Library</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-0.5">
            Manage production projects, Google Drive assets, and assigned voice workflows.
          </p>
        </div>
        <div className="flex items-center gap-space-sm flex-wrap">
          {/* Export All Action */}
          <button
            type="button"
            onClick={() => setExportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-space-md py-space-xs bg-surface-container-lowest hover:bg-surface-container-low text-on-surface border border-outline-variant/60 font-label-md text-label-md font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px] text-primary">download</span>
            <span>Export All</span>
          </button>

          <Link 
            href="/admin/projects/upload" 
            className="inline-flex items-center gap-1.5 px-space-md py-space-xs bg-primary hover:bg-primary-container text-on-primary font-label-md text-label-md font-semibold rounded-lg shadow-sm hover:shadow-md transition-all active:scale-[0.99] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>+ Ingest Video</span>
          </Link>
        </div>
      </div>

      {exportSuccess && (
        <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>{exportSuccess}</span>
        </div>
      )}

      {/* Controls & Filters Strip */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md bg-surface-container-lowest p-space-sm rounded-xl shadow-sm border border-surface-container-high">
        <div className="relative w-full lg:w-80">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-space-md py-space-xs bg-surface text-on-surface placeholder:text-outline font-body-md text-body-md rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all" 
            placeholder="Search projects, talent, or files..." 
          />
        </div>
        <div className="flex items-center gap-space-xs self-end lg:self-auto">
          <div className="inline-flex p-0.5 rounded-lg bg-surface-container">
            <button 
              onClick={() => setViewMode("table")}
              className={`p-1 rounded-md transition-all cursor-pointer ${viewMode === 'table' ? 'bg-surface-container-lowest text-on-surface shadow-xs' : 'text-outline hover:text-on-surface'}`}
              title="Table View"
            >
              <span className="material-symbols-outlined text-[18px]">table_rows</span>
            </button>
            <button 
              onClick={() => setViewMode("grid")}
              className={`p-1 rounded-md transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-surface-container-lowest text-on-surface shadow-xs' : 'text-outline hover:text-on-surface'}`}
              title="Grid View"
            >
              <span className="material-symbols-outlined text-[18px]">grid_view</span>
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-on-surface-variant flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span>Loading projects from Supabase...</span>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="p-12 text-center text-on-surface-variant bg-surface-container-lowest rounded-xl border border-surface-container-high">
          {projects.length === 0 ? "No projects found. Upload or import a video to get started." : "No projects matched your search."}
        </div>
      ) : (
        <>
          {/* Table Container */}
          {viewMode === "table" && (
            <div className="w-full bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden border border-surface-container-high">
              <div className="overflow-x-auto">
                <table className="w-full text-left font-body-md text-body-md border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low text-on-surface-variant font-label-md text-label-md uppercase tracking-wider">
                      <th className="py-space-sm px-space-sm font-semibold" scope="col">Thumbnail</th>
                      <th className="py-space-sm px-space-sm font-semibold" scope="col">Project Name</th>
                      <th className="py-space-sm px-space-sm font-semibold" scope="col">Original Video</th>
                      <th className="py-space-sm px-space-sm font-semibold" scope="col">Assigned To</th>
                      <th className="py-space-sm px-space-sm font-semibold" scope="col">Status</th>
                      <th className="py-space-sm pr-space-md pl-space-sm text-right font-semibold" scope="col">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-high">
                    {filteredProjects.map(project => (
                      <tr key={project.id} className="hover:bg-surface-container-low/50 transition-colors group">
                        <td className="py-space-sm px-space-sm pl-space-md">
                          <Link href={`/admin/projects/${project.id}`} className="relative w-24 h-14 rounded-lg overflow-hidden bg-surface-container-high flex items-center justify-center text-primary group-hover:shadow-sm transition-all cursor-pointer block">
                            <span className="material-symbols-outlined">movie</span>
                          </Link>
                        </td>
                        <td className="py-space-sm px-space-sm font-medium text-on-surface">
                          <div className="flex flex-col">
                            <Link href={`/admin/projects/${project.id}`} className="font-title-md text-body-lg font-semibold hover:text-primary transition-colors">
                              {project.name}
                            </Link>
                          </div>
                        </td>
                        <td className="py-space-sm px-space-sm text-on-surface font-code-sm text-code-sm">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate max-w-xs">{project.videos?.original_filename || "N/A"}</span>
                            {project.videos?.drive_file_id && (
                              <a
                                href={`https://drive.google.com/file/d/${project.videos.drive_file_id}/view`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-outline hover:text-primary shrink-0"
                                title="Open in Google Drive"
                              >
                                <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="py-space-sm px-space-sm">
                          {project.profiles ? (
                            <div className="flex items-center gap-space-xs">
                              <div className="w-6 h-6 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-xs font-bold">
                                {project.profiles.full_name?.charAt(0) || 'U'}
                              </div>
                              <span className="font-body-md text-body-md text-on-surface font-medium">{project.profiles.full_name}</span>
                            </div>
                          ) : (
                            <span className="text-on-surface-variant italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-space-sm px-space-sm">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-sm text-label-sm font-semibold shadow-sm">
                            {project.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-space-sm pr-space-md pl-space-sm text-right">
                          <Link href={`/admin/projects/${project.id}`} className="px-space-sm py-1 rounded-lg bg-surface-container-high hover:bg-primary hover:text-on-primary text-on-surface font-label-md text-label-md font-medium transition-colors cursor-pointer inline-block">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {viewMode === "grid" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-space-md">
              {filteredProjects.map(project => (
                <div key={project.id} className="bg-surface-container-lowest rounded-xl shadow-sm border border-surface-container-high overflow-hidden flex flex-col hover:shadow-md transition-shadow group">
                  <Link href={`/admin/projects/${project.id}`} className="aspect-video bg-surface-container-low relative flex items-center justify-center cursor-pointer border-b border-surface-container-high overflow-hidden">
                    <span className="material-symbols-outlined text-4xl text-outline group-hover:text-primary transition-colors">movie</span>
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md transform scale-90 group-hover:scale-100">
                        <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                      </div>
                    </div>
                  </Link>
                  <div className="p-space-md flex-1 flex flex-col">
                    <div className="flex justify-between items-start mb-2 gap-2">
                      <Link href={`/admin/projects/${project.id}`} className="font-title-md font-semibold text-on-surface hover:text-primary line-clamp-2">
                        {project.name}
                      </Link>
                    </div>
                    <p className="font-code-sm text-on-surface-variant text-xs mb-3 truncate" title={project.videos?.original_filename}>
                      {project.videos?.original_filename || "No source file"}
                    </p>
                    <div className="mt-auto pt-3 border-t border-surface-container-high flex items-center justify-between">
                      <div className="flex items-center gap-2">
                         {project.profiles ? (
                           <div className="w-6 h-6 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-xs font-bold" title={project.profiles.full_name}>
                             {project.profiles.full_name?.charAt(0) || 'U'}
                           </div>
                         ) : (
                           <span className="text-xs text-on-surface-variant italic">Unassigned</span>
                         )}
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-surface-container text-on-surface">
                        {project.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Export All Modal */}
      {exportModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-lg w-full p-6 shadow-2xl border border-outline-variant/40 space-y-4">
            <div className="flex items-center justify-between border-b border-surface-container-high pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">cloud_download</span>
                <h3 className="font-title-lg font-bold text-on-surface">Export Production Manifest</h3>
              </div>
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              Generate and download the production audit manifest containing all <strong className="text-on-surface">{projects.length} projects</strong>, talent assignments, version counts, and direct Google Drive URLs for original master media, edited takes, and approved final deliverables.
            </p>

            <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-on-surface-variant font-medium">Google Drive Workspace:</span>
                <span className="font-bold text-primary">VoiceFlow Studio</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-on-surface-variant font-medium">Connected Account:</span>
                <span className="font-semibold text-on-surface">chandanalareethika123@gmail.com</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleExportAll('json')}
                disabled={exporting}
                className="py-2.5 px-4 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">data_object</span>
                {exporting ? "Generating..." : "Download JSON"}
              </button>

              <button
                type="button"
                onClick={() => handleExportAll('csv')}
                disabled={exporting}
                className="py-2.5 px-4 rounded-xl bg-surface-container-high hover:bg-surface-container text-on-surface font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 border border-outline-variant/40"
              >
                <span className="material-symbols-outlined text-[18px]">table_view</span>
                {exporting ? "Generating..." : "Download CSV"}
              </button>
            </div>

            <div className="pt-2 border-t border-surface-container-high flex justify-between items-center text-xs">
              <a
                href="https://drive.google.com"
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Open Google Drive Workspace</span>
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </a>
              <button
                type="button"
                onClick={() => setExportModalOpen(false)}
                className="text-on-surface-variant hover:text-on-surface font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
