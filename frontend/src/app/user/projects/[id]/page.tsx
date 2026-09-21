"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { getDeterministicProgress, formatStatus } from '@/lib/projectProgress';
import VideoPlayer from '@/components/VideoPlayer';

export default function UserProjectDetailsPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { user, profile, session, loading: authLoading } = useAuth();
  
  const [projectData, setProjectData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Uploading state
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatusText, setUploadStatusText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Submit modal state
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submissionNotes, setSubmissionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Preview video state
  const [activePreviewDriveId, setActivePreviewDriveId] = useState<string | null>(null);
  const [activePreviewTitle, setActivePreviewTitle] = useState<string>("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const fetchFullProject = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentSession = session || (await supabase.auth.getSession()).data.session;
      if (!currentSession?.access_token) {
        throw new Error("Authentication session required.");
      }

      const res = await fetch(`${apiUrl}/api/projects/${id}/files`, {
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`
        }
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.detail || `Failed to fetch project files (HTTP ${res.status})`);
      }

      const data = await res.json();
      setProjectData(data);
    } catch (err: any) {
      console.error("Project fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && id) {
      fetchFullProject();
    }
  }, [id, authLoading]);

  // Handle Edited Video File Selection & Upload
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('video/mp4') && !file.name.endsWith('.mp4') && !file.type.includes('video/webm')) {
      alert("Please select a valid MP4 or WebM video file.");
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(10);
      setUploadStatusText("Preparing file for upload...");

      const currentSession = session || (await supabase.auth.getSession()).data.session;
      const formData = new FormData();
      formData.append("video", file);

      setUploadProgress(35);
      setUploadStatusText("Streaming to VoiceFlow Studio Google Drive...");

      const response = await fetch(`${apiUrl}/api/projects/${id}/edited-video`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${currentSession?.access_token}`
        },
        body: formData
      });

      setUploadProgress(85);
      setUploadStatusText("Registering version metadata...");

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.detail || "Upload to Google Drive failed.");
      }

      setUploadProgress(100);
      setUploadStatusText("Uploaded successfully!");

      // Refresh project files
      await fetchFullProject();
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      console.error("Upload error:", err);
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadStatusText("");
    }
  };

  // Handle Submit for Review
  const handleSubmitForReview = async () => {
    try {
      setSubmitting(true);
      const currentSession = session || (await supabase.auth.getSession()).data.session;
      
      const formData = new FormData();
      if (submissionNotes) {
        formData.append("notes", submissionNotes);
      }

      const res = await fetch(`${apiUrl}/api/projects/${id}/submit`, {
        method: "POST",
        headers: {
          'Authorization': `Bearer ${currentSession?.access_token}`
        },
        body: formData
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.detail || "Submission failed.");
      }

      setShowSubmitModal(false);
      setSubmissionNotes("");
      await fetchFullProject();
      alert("Submission received. Your videos are being processed. You will be notified when they are ready for review.");
    } catch (err: any) {
      console.error("Submit error:", err);
      alert(`Submission error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="font-body-md text-on-surface-variant">Loading project details and video assets...</p>
      </div>
    );
  }

  if (error || !projectData) {
    return (
      <div className="p-space-lg rounded-xl bg-surface-container-lowest border border-error/30 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 text-error mb-2">
          <span className="material-symbols-outlined">error</span>
          <h2 className="font-title-md font-bold">Unable to Load Project</h2>
        </div>
        <p className="text-on-surface-variant text-sm mb-4">{error || "Project not found or access denied."}</p>
        <button 
          onClick={fetchFullProject} 
          className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all cursor-pointer shadow-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  const { project, original_video, edited_videos, recordings, submissions, final_video } = projectData;
  const progress = getDeterministicProgress(project.status);
  const statusInfo = formatStatus(project.status);
  const latestEdited = edited_videos?.[0];
  const isUnderReview = project.status === 'UNDER_REVIEW' || project.status === 'SUBMITTED' || project.status === 'RESUBMITTED' || project.status === 'READY_FOR_REVIEW';
  const isProcessing = project.status === 'PROCESSING';
  const isRevisionRequired = project.status === 'REVISION_REQUIRED' || project.status === 'REVISION_REQUESTED';
  const isCompleted = project.status === 'COMPLETED' || project.status === 'APPROVED';

  // Latest revision feedback note if applicable
  const latestRevision = submissions?.[0]?.revision_requests?.[0];
  const revisionNote = latestRevision?.message || project.notes;

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto space-y-space-lg pb-12">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md border-b border-surface-container-high pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
              {project.name}
            </h1>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${statusInfo.colorClass}`}>
              {statusInfo.label}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-on-surface-variant">
            <span>Assigned: {new Date(project.created_at).toLocaleDateString()}</span>
            <span>Due: {project.deadline ? new Date(project.deadline).toLocaleDateString() : 'Flexible'}</span>
            <span>Progress: <strong className="text-on-surface">{progress}%</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/user/workspace/${id}`}
            className="px-4 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-outline-variant/30"
          >
            <span className="material-symbols-outlined text-[18px] text-primary">mic</span>
            Recording Workspace
          </Link>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-surface-container-lowest p-4 rounded-xl border border-surface-container-high shadow-xs">
        <div className="flex justify-between text-xs font-semibold mb-2">
          <span className="text-on-surface-variant uppercase tracking-wider">Overall Workflow Completion</span>
          <span className="text-primary font-bold">{progress}%</span>
        </div>
        <div className="w-full h-2.5 bg-surface-container-high rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isCompleted ? 'bg-emerald-500' : progress >= 70 ? 'bg-primary' : 'bg-secondary'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Revision Required Prominent Banner (Part 11) */}
      {isRevisionRequired && (
        <div className="bg-error/10 border border-error/30 p-5 rounded-xl text-on-surface flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-error text-white flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">rate_review</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className="font-title-md font-bold text-error">Revision Required</h3>
              <span className="text-xs text-on-surface-variant">Reviewer: Administrator</span>
            </div>
            <p className="text-xs text-on-surface-variant mb-2">
              The administrator reviewed your previous submission and requested changes:
            </p>
            <div className="p-3.5 bg-surface-container-lowest rounded-lg border border-error/20 text-sm font-medium text-on-surface">
              "{revisionNote || "Please review the notes and upload a revised version."}"
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-error text-white text-xs font-semibold rounded-lg shadow-sm hover:bg-error/90 transition-colors cursor-pointer"
              >
                Upload Revised Version
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Under Review Notice (Part 10 & 35) */}
      {isUnderReview && (
        <div className="bg-amber-50 border border-amber-200 p-5 rounded-xl text-amber-900 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">hourglass_top</span>
          </div>
          <div className="flex-1">
            <h3 className="font-title-md font-bold">Submission Under Admin Review</h3>
            <p className="text-sm mt-1">
              Your latest version ({latestEdited ? `v${latestEdited.version}` : 'submission'}) has been submitted for review.
              The administrator will evaluate your work and either approve or provide revision feedback.
            </p>
          </div>
        </div>
      )}

      {/* Completed Notice (Part 27 & 35) */}
      {isCompleted && (
        <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-xl text-emerald-900 flex items-start gap-4">
          <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-2xl">verified</span>
          </div>
          <div className="flex-1">
            <h3 className="font-title-md font-bold">Project Approved & Completed</h3>
            <p className="text-sm mt-1">
              Congratulations! This video has been fully approved by the administrator and registered in the final production archive.
            </p>
          </div>
        </div>
      )}

      {/* Grid: Original Video & Current Work */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        {/* Left: Original Video Player */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="bg-surface-container-lowest p-space-md rounded-xl border border-surface-container-high shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-title-md font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">videocam</span>
                Original Video
              </h2>
              <span className="text-xs text-on-surface-variant font-medium">Source: Google Drive</span>
            </div>

            <VideoPlayer
              driveFileId={original_video?.drive_file_id}
              token={session?.access_token}
              label={original_video?.original_filename || 'Master Video File'}
              wrapperClassName="w-full"
            />

            <div className="mt-3 text-xs text-on-surface-variant flex items-center justify-between border-t border-surface-container-high/40 pt-2">
              <span className="truncate max-w-[240px]">
                {original_video?.original_filename || "Master Video File"}
              </span>
              <span>Authorized backend streaming</span>
            </div>
          </div>

          {/* Project Instructions */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl border border-surface-container-high shadow-sm">
            <h3 className="font-title-sm font-bold text-on-surface mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">info</span>
              Admin Instructions
            </h3>
            <div className="p-3 bg-surface-container-low rounded-lg text-xs text-on-surface-variant leading-relaxed">
              {project.notes || "Follow the original audio timing and ensure clean pronunciation for the complete video."}
            </div>
          </div>
        </div>

        {/* Right: Edited Video Workflow (Part 9 & 10) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-surface-container-lowest p-space-md rounded-xl border border-surface-container-high shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-title-md font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">movie_edit</span>
                Edited Video
              </h2>
              <span className="text-xs text-on-surface-variant font-medium">External Editor</span>
            </div>

            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="video/mp4,video/webm"
              className="hidden"
            />

            {/* Current Work State */}
            {latestEdited ? (
              <div className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="px-2 py-0.5 rounded-md bg-primary-container text-primary font-bold text-xs uppercase tracking-wider">
                      Version {latestEdited.version}
                    </span>
                    <h4 className="font-title-sm font-bold text-on-surface mt-1.5 truncate max-w-[200px]" title={latestEdited.filename}>
                      {latestEdited.filename}
                    </h4>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">
                      Uploaded: {new Date(latestEdited.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setActivePreviewDriveId(latestEdited.drive_file_id);
                      setActivePreviewTitle(`Preview Version ${latestEdited.version}`);
                    }}
                    className="p-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors cursor-pointer"
                    title="Preview uploaded video"
                  >
                    <span className="material-symbols-outlined text-[18px]">play_circle</span>
                  </button>
                </div>

                <div className="flex items-center justify-between text-xs text-on-surface-variant border-t border-outline-variant/20 pt-2">
                  <span>Destination: Google Drive</span>
                  <span className="font-semibold text-primary">Ready for Review</span>
                </div>

                {/* Submit for Review Button (Separate from upload!) */}
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    onClick={() => setShowSubmitModal(true)}
                    disabled={isUnderReview || isCompleted || uploading || isProcessing || submitting}
                    className="w-full py-2.5 px-4 rounded-lg bg-primary hover:bg-primary/90 text-on-primary font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="material-symbols-outlined text-[16px]">send</span>
                    {submitting ? "Submitting..." : isProcessing ? "Processing videos..." : isUnderReview ? "Submitted & Awaiting Review" : "Submit for Review"}
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || isUnderReview || isProcessing}
                    className="w-full py-2 px-3 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Upload New Version (v{(latestEdited.version || 1) + 1})
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-surface-container-low border border-dashed border-outline-variant/60 text-center flex flex-col items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-outline mb-2">cloud_upload</span>
                <p className="font-title-sm font-bold text-on-surface">No edited version uploaded yet</p>
                <p className="text-xs text-on-surface-variant max-w-xs mt-1 mb-4">
                  Export your complete edited video from Premiere Pro, DaVinci Resolve, or CapCut (MP4 format) and upload it here.
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-4 py-2 bg-primary hover:bg-primary/90 text-on-primary font-semibold text-xs rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  Upload Edited Video
                </button>
              </div>
            )}

            {/* Upload progress indicator */}
            {uploading && (
              <div className="mt-4 p-4 rounded-lg bg-primary-container/20 border border-primary/30">
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-primary">{uploadStatusText}</span>
                  <span className="text-primary font-bold">{uploadProgress}%</span>
                </div>
                <div className="w-full h-2 bg-primary/20 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Microphone Recording Shortcut */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl border border-surface-container-high shadow-sm">
            <h3 className="font-title-sm font-bold text-on-surface mb-1">Voice-Over Audio</h3>
            <p className="text-xs text-on-surface-variant mb-3">
              Record microphone voice-over synchronized with the original video directly inside VoiceFlow Studio.
            </p>
            <Link
              href={`/user/workspace/${id}`}
              className="w-full py-2 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-outline-variant/30"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">mic</span>
              Open Recording Studio
            </Link>
          </div>
        </div>
      </div>

      {/* Version History Table (Part 6 & 12) */}
      <div className="bg-surface-container-lowest p-space-md rounded-xl border border-surface-container-high shadow-sm">
        <h2 className="font-title-md font-bold text-on-surface mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">history</span>
          Version History
        </h2>

        {!edited_videos || edited_videos.length === 0 ? (
          <p className="text-xs text-on-surface-variant p-4 text-center">No edited versions uploaded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-surface-container-low/70 text-outline uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-3 rounded-l-lg">VERSION</th>
                  <th className="py-2.5 px-3">FILENAME</th>
                  <th className="py-2.5 px-3">UPLOADED DATE</th>
                  <th className="py-2.5 px-3">DESTINATION</th>
                  <th className="py-2.5 px-3 rounded-r-lg text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container-high/40">
                {edited_videos.map((ver: any) => (
                  <tr key={ver.id} className="hover:bg-surface-container-low/40">
                    <td className="py-2.5 px-3 font-bold text-primary">
                      v{ver.version}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-on-surface">
                      {ver.filename}
                    </td>
                    <td className="py-2.5 px-3 text-on-surface-variant">
                      {new Date(ver.created_at).toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-on-surface-variant">
                      Google Drive / Edited Videos
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => {
                          setActivePreviewDriveId(ver.drive_file_id);
                          setActivePreviewTitle(`Preview v${ver.version} (${ver.filename})`);
                        }}
                        className="px-2.5 py-1 rounded bg-primary-container text-primary hover:bg-primary hover:text-on-primary font-semibold text-[11px] transition-colors cursor-pointer"
                      >
                        Preview
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submission History Table (Part 12) */}
      <div className="bg-surface-container-lowest p-space-md rounded-xl border border-surface-container-high shadow-sm">
        <h2 className="font-title-md font-bold text-on-surface mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">assignment_turned_in</span>
          Submission & QA History
        </h2>

        {!submissions || submissions.length === 0 ? (
          <p className="text-xs text-on-surface-variant p-4 text-center">No submissions made yet.</p>
        ) : (
          <div className="space-y-3">
            {submissions.map((sub: any, index: number) => {
              const rev = sub.revision_requests?.[0];
              const isApproved = sub.status === 'APPROVED';
              const isRevision = sub.status === 'REVISION_REQUESTED';

              return (
                <div key={sub.id} className="p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-on-surface">
                        Submission #{submissions.length - index}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-surface-container text-on-surface-variant">
                        Version {sub.version || 1}
                      </span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      isApproved ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                      isRevision ? 'bg-error/10 text-error border-error/20' :
                      'bg-amber-50 text-amber-800 border-amber-200'
                    }`}>
                      {sub.status.replace('_', ' ')}
                    </span>
                  </div>

                  <p className="text-xs text-on-surface-variant">
                    Submitted: {new Date(sub.submitted_at).toLocaleString()}
                  </p>

                  {rev && (
                    <div className="mt-1 p-3 bg-error/5 rounded-lg border border-error/20 text-xs">
                      <strong className="text-error block mb-0.5">Admin Review Feedback:</strong>
                      <p className="text-on-surface">{rev.message}</p>
                    </div>
                  )}

                  {isApproved && (
                    <div className="mt-1 p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-xs text-emerald-800">
                      <strong>Review Result:</strong> Approved. Deliverable registered as Final.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Submit for Review Confirmation Modal (Part 10) */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-md w-full p-6 shadow-2xl border border-outline-variant/40 animate-in fade-in zoom-in-95">
            <h3 className="font-title-lg font-bold text-on-surface mb-2">Submit for Admin Review?</h3>
            <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">
              Once submitted, this version ({latestEdited ? `v${latestEdited.version}` : 'latest work'}) will enter the Admin Review queue. You won't be able to modify this submission until the admin completes the review.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-on-surface mb-1">
                Optional Notes for Reviewer:
              </label>
              <textarea
                value={submissionNotes}
                onChange={(e) => setSubmissionNotes(e.target.value)}
                placeholder="E.g., Added audio synchronization for all sections..."
                rows={3}
                className="w-full p-2.5 rounded-lg text-xs bg-surface-container-low border border-outline-variant/40 text-on-surface focus:outline-primary"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSubmitModal(false)}
                disabled={submitting}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-on-surface-variant hover:bg-surface-container cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitForReview}
                disabled={submitting}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-primary text-on-primary hover:bg-primary/90 transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Confirm & Submit for Review"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Video Preview Modal */}
      {activePreviewDriveId && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-3xl w-full p-4 shadow-2xl border border-outline-variant/40">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-surface-container-high">
              <h3 className="font-title-md font-bold text-on-surface text-sm">{activePreviewTitle}</h3>
              <button
                onClick={() => setActivePreviewDriveId(null)}
                className="p-1 rounded-full text-on-surface-variant hover:bg-surface-container cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <VideoPlayer
              driveFileId={activePreviewDriveId}
              token={session?.access_token}
              autoPlay={true}
              label={activePreviewTitle}
              wrapperClassName="w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
