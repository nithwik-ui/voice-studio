"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface DriveVideo {
  id: string;
  name: string;
  mime_type: string;
  size_bytes: number;
  size_formatted: string;
  modified_time: string;
  web_view_link: string;
  thumbnail_link?: string | null;
}

export default function UploadVideoPage() {
  const [sourceMode, setSourceMode] = useState<"drive" | "upload">("drive");
  const [routerPushing, setRouterPushing] = useState(false);

  // Form fields
  const [title, setTitle] = useState('');
  const [assignedUserId, setAssignedUserId] = useState('');
  const [instructions, setInstructions] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Local Upload State
  const [file, setFile] = useState<File | null>(null);

  // Drive Import State
  const [driveVideos, setDriveVideos] = useState<DriveVideo[]>([]);
  const [loadingDriveVideos, setLoadingDriveVideos] = useState(false);
  const [driveSearch, setDriveSearch] = useState('');
  const [selectedDriveVideo, setSelectedDriveVideo] = useState<DriveVideo | null>(null);

  const router = useRouter();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    async function loadUsers() {
      const { data } = await supabase
        .from('profiles')
        .select('id, auth_user_id, full_name, email, role')
        .eq('status', 'ACTIVE')
        .order('full_name');
      if (data) setUsers(data);
    }
    loadUsers();
    loadDriveVideos();
  }, []);

  const loadDriveVideos = async () => {
    try {
      setLoadingDriveVideos(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch(`${apiUrl}/api/drive/videos`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (res.ok) {
        const videos = await res.json();
        setDriveVideos(videos || []);
      }
    } catch (err) {
      console.error("Failed to load Google Drive videos:", err);
    } finally {
      setLoadingDriveVideos(false);
    }
  };

  const handleSelectDriveVideo = (vid: DriveVideo) => {
    setSelectedDriveVideo(vid);
    // Suggest a clean project title from filename
    const cleanTitle = vid.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
    setTitle(cleanTitle);
  };

  const handleCreateProjectFromDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDriveVideo || !title.trim()) {
      setError("Please select a video from Google Drive and provide a project title.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Authentication required. Please log in as an Admin.');
      }

      const payload = {
        title: title.trim(),
        drive_file_id: selectedDriveVideo.id,
        original_filename: selectedDriveVideo.name,
        assigned_user_id: assignedUserId || null,
        instructions: instructions.trim() || null,
        file_size_bytes: selectedDriveVideo.size_bytes || 0
      };

      const res = await fetch(`${apiUrl}/api/projects/create-from-drive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.detail || `Failed to create project from Drive (HTTP ${res.status})`);
      }

      const result = await res.json();
      setRouterPushing(true);
      router.push(`/admin/projects/${result.project.id}`);
    } catch (err: any) {
      console.error("Drive project creation error:", err);
      setError(err.message || 'Error creating project from Google Drive');
    } finally {
      setLoading(false);
    }
  };

  const handleLocalUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !title.trim()) return;

    setLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('video', file);
    formData.append('title', title.trim());
    if (assignedUserId) {
      formData.append('assigned_user_id', assignedUserId);
    }
    if (instructions.trim()) {
      formData.append('instructions', instructions.trim());
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('You must be logged in as an Admin to upload videos.');
      }
      
      const response = await fetch(`${apiUrl}/api/videos/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.detail || `Upload failed (Status ${response.status})`);
      }

      const result = await response.json();
      setRouterPushing(true);
      router.push(`/admin/projects/${result.project_id || ''}`);
    } catch (err: any) {
      console.error("Upload error:", err);
      setError(err.message || 'Error uploading video');
    } finally {
      setLoading(false);
    }
  };

  const filteredDriveVideos = driveVideos.filter(v => 
    v.name.toLowerCase().includes(driveSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col w-full max-w-4xl mx-auto space-y-space-lg pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-container-high pb-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
            New Project & Video Ingestion
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Import existing videos directly from your connected Google Drive or stream new uploads to Drive storage.
          </p>
        </div>

        <Link
          href="/admin/projects"
          className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface-variant flex items-center gap-1 self-start sm:self-auto cursor-pointer border border-outline-variant/30"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Video Library
        </Link>
      </div>

      {/* Mode Selector Tabs */}
      <div className="inline-flex p-1 rounded-xl bg-surface-container border border-outline-variant/30 self-start">
        <button
          type="button"
          onClick={() => setSourceMode("drive")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-label-md text-label-md transition-all cursor-pointer ${
            sourceMode === "drive"
              ? "bg-surface-container-lowest text-primary shadow-sm font-bold"
              : "font-medium text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">cloud_download</span>
          <span>Import from Google Drive</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
            Live Account
          </span>
        </button>

        <button
          type="button"
          onClick={() => setSourceMode("upload")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-label-md text-label-md transition-all cursor-pointer ${
            sourceMode === "upload"
              ? "bg-surface-container-lowest text-primary shadow-sm font-bold"
              : "font-medium text-on-surface-variant hover:text-on-surface"
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">upload_file</span>
          <span>Upload Local File to Drive</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-error-container text-on-error-container text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">error</span>
          <span>{error}</span>
        </div>
      )}

      {/* Mode 1: Import from Google Drive */}
      {sourceMode === "drive" && (
        <form onSubmit={handleCreateProjectFromDrive} className="space-y-6">
          <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-surface-container-high shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-title-md font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[20px]">movie</span>
                  Select Video from Google Drive
                </h2>
                <p className="text-xs text-on-surface-variant">
                  Media files available in <strong className="text-on-surface">chandanalareethika123@gmail.com</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative w-64">
                  <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-outline text-[16px]">
                    search
                  </span>
                  <input
                    type="text"
                    value={driveSearch}
                    onChange={(e) => setDriveSearch(e.target.value)}
                    placeholder="Search drive videos..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-outline-variant/40 bg-surface text-on-surface focus:outline-primary"
                  />
                </div>
                <button
                  type="button"
                  onClick={loadDriveVideos}
                  disabled={loadingDriveVideos}
                  className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs border border-outline-variant/30 cursor-pointer"
                  title="Refresh Drive List"
                >
                  <span className={`material-symbols-outlined text-[16px] ${loadingDriveVideos ? 'animate-spin' : ''}`}>
                    refresh
                  </span>
                </button>
              </div>
            </div>

            {loadingDriveVideos ? (
              <div className="py-12 text-center text-on-surface-variant flex flex-col items-center justify-center gap-2">
                <div className="w-7 h-7 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs">Querying Google Drive API for video files...</span>
              </div>
            ) : filteredDriveVideos.length === 0 ? (
              <div className="py-10 text-center text-on-surface-variant bg-surface-container-low rounded-xl border border-outline-variant/30">
                <span className="material-symbols-outlined text-3xl text-outline mb-1">videocam_off</span>
                <p className="text-xs font-semibold">No video files found in Google Drive.</p>
                <p className="text-[11px] text-outline mt-0.5">Upload a video to Google Drive or use the local upload tab.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
                {filteredDriveVideos.map((vid) => {
                  const isSelected = selectedDriveVideo?.id === vid.id;
                  return (
                    <div
                      key={vid.id}
                      onClick={() => handleSelectDriveVideo(vid)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                        isSelected
                          ? "bg-primary/10 border-primary ring-2 ring-primary/30"
                          : "bg-surface-container-low/60 hover:bg-surface-container-low border-outline-variant/40"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-primary text-on-primary" : "bg-primary-fixed text-primary"
                        }`}>
                          <span className="material-symbols-outlined text-[20px]">
                            {isSelected ? "check" : "video_file"}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-on-surface truncate" title={vid.name}>
                            {vid.name}
                          </p>
                          <p className="text-[11px] text-on-surface-variant flex items-center gap-2 mt-0.5">
                            <span className="font-semibold text-primary">{vid.size_formatted}</span>
                            <span>•</span>
                            <span>{new Date(vid.modified_time).toLocaleDateString()}</span>
                          </p>
                        </div>
                      </div>

                      <a
                        href={vid.web_view_link}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] text-outline hover:text-primary p-1 shrink-0"
                        title="Open in Google Drive"
                      >
                        <span className="material-symbols-outlined text-[16px]">open_in_new</span>
                      </a>
                    </div>
                  );
                })}
              </div>
            )}

            {selectedDriveVideo && (
              <div className="mt-4 p-3 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-emerald-700 text-[18px]">check_circle</span>
                  <span className="truncate">
                    Selected: <strong>{selectedDriveVideo.name}</strong> ({selectedDriveVideo.size_formatted})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDriveVideo(null)}
                  className="text-emerald-700 font-semibold text-[11px] hover:underline shrink-0 ml-2"
                >
                  Change
                </button>
              </div>
            )}
          </div>

          {/* Project Details */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-surface-container-high shadow-sm space-y-4">
            <h3 className="font-title-sm font-bold text-on-surface">Project Information</h3>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">Project Title</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Training Video Batch 04"
                required 
                className="w-full px-3.5 py-2.5 rounded-lg border border-outline-variant/50 bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium" 
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">Assign Voice Talent</label>
              <select
                value={assignedUserId}
                onChange={(e) => setAssignedUserId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-outline-variant/50 bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
              >
                <option value="">Unassigned (Draft)</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.email}) - {u.role}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">Instructions for Talent (Optional)</label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Provide directions on tone, pronunciation, pacing, or key terms..."
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-lg border border-outline-variant/50 bg-surface text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading || !selectedDriveVideo || !title.trim()}
              className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Creating Project & Initializing Google Drive Hierarchy...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">cloud_done</span>
                  <span>Import Video & Create Project</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Mode 2: Upload Local File to Drive */}
      {sourceMode === "upload" && (
        <form onSubmit={handleLocalUpload} className="space-y-6">
          <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-surface-container-high shadow-sm space-y-4">
            <h2 className="font-title-md font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">upload_file</span>
              Upload Video File
            </h2>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">Project Title</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Product Launch Demo"
                required 
                className="w-full px-3.5 py-2.5 rounded-lg border border-outline-variant/50 bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium" 
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">Assign Voice Talent</label>
              <select
                value={assignedUserId}
                onChange={(e) => setAssignedUserId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-outline-variant/50 bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
              >
                <option value="">Unassigned (Draft)</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.email}) - {u.role}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">Video File (MP4)</label>
              <div className="border-2 border-dashed border-outline-variant/60 rounded-xl p-8 text-center hover:bg-surface-container-low transition-colors">
                <input 
                  type="file" 
                  accept="video/mp4,video/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0] || null;
                    setFile(f);
                    if (f && !title) {
                      setTitle(f.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " "));
                    }
                  }}
                  required
                  className="w-full text-sm text-on-surface-variant file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
                />
                {file && (
                  <p className="mt-3 text-xs text-primary font-semibold flex items-center justify-center gap-1">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    <span>Selected: {file.name} ({(file.size / (1024 * 1024)).toFixed(1)} MB)</span>
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">Instructions for Talent (Optional)</label>
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Provide directions on tone, pronunciation, pacing, or key terms..."
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-lg border border-outline-variant/50 bg-surface text-on-surface text-xs focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
              />
            </div>

            <button 
              type="submit" 
              disabled={loading || !file || !title.trim()}
              className="w-full py-3 px-4 rounded-xl bg-primary hover:bg-primary/90 text-on-primary font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Streaming Media to Google Drive & Saving...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
                  <span>Upload Video & Create Project</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
