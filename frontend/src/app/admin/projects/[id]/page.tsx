"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { getDeterministicProgress, formatStatus } from '@/lib/projectProgress';

export default function AdminProjectReviewPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const { session, loading: authLoading } = useAuth();
  
  const [projectData, setProjectData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Video tabs: "ORIGINAL" vs "SUBMISSION"
  const [videoTab, setVideoTab] = useState<"SUBMISSION" | "ORIGINAL">("SUBMISSION");

  // Review states
  const [submitting, setSubmitting] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const fetchProjectDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentSession = session || (await supabase.auth.getSession()).data.session;
      if (!currentSession?.access_token) throw new Error("Authentication required");

      const res = await fetch(`${apiUrl}/api/projects/${id}/files`, {
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`
        }
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || "Failed to load project details");
      }

      const data = await res.json();
      setProjectData(data);

      // If no submitted edited video, default to original
      if (!data.edited_videos?.length && !data.submissions?.length) {
        setVideoTab("ORIGINAL");
      }
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && id) {
      fetchProjectDetails();
    }
  }, [id, authLoading]);

  const handleReviewAction = async (action: "APPROVE" | "REVISION") => {
    if (action === "REVISION" && !revisionNotes.trim()) {
      alert("Please provide revision feedback instructions.");
      return;
    }

    try {
      setSubmitting(true);
      const currentSession = session || (await supabase.auth.getSession()).data.session;
      const formData = new FormData();
      formData.append("action", action);
      if (revisionNotes.trim()) {
        formData.append("notes", revisionNotes.trim());
      }

      const res = await fetch(`${apiUrl}/api/projects/${id}/review`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentSession?.access_token}`
        },
        body: formData
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || "Review failed");
      }

      alert(action === "APPROVE" ? "Project approved and final video registered!" : "Revision requested from talent artist.");
      setShowApproveModal(false);
      setShowRevisionForm(false);
      setRevisionNotes("");
      await fetchProjectDetails();
    } catch (err: any) {
      console.error("Review action error:", err);
      alert(`Error submitting review: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="font-body-md text-on-surface-variant">Loading project details and video streams...</p>
      </div>
    );
  }

  if (error || !projectData) {
    return (
      <div className="p-8 rounded-xl bg-surface-container-lowest border border-error/30 text-center max-w-lg mx-auto">
        <p className="text-sm font-semibold text-error mb-4">{error || "Project not found"}</p>
        <button onClick={fetchProjectDetails} className="px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-semibold">
          Retry
        </button>
      </div>
    );
  }

  const { project, original_video, edited_videos, submissions, final_video } = projectData;
  const progress = getDeterministicProgress(project.status);
  const statusInfo = formatStatus(project.status);
  const latestEdited = edited_videos?.[0];
  const latestSubmission = submissions?.[0];
  const isUnderReview = project.status === 'UNDER_REVIEW' || project.status === 'SUBMITTED' || project.status === 'RESUBMITTED';
  const isApproved = project.status === 'APPROVED' || project.status === 'COMPLETED';
  const isRevision = project.status === 'REVISION_REQUIRED' || project.status === 'REVISION_REQUESTED';

  // Video source to play
  const activeVideoDriveId = videoTab === "SUBMISSION" 
    ? (latestSubmission?.drive_file_id || latestEdited?.drive_file_id || original_video?.drive_file_id)
    : original_video?.drive_file_id;

  return (
    <div className="flex flex-col w-full max-w-6xl mx-auto space-y-space-lg pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-container-high pb-4">
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
            <span>Created: {new Date(project.created_at).toLocaleDateString()}</span>
            <span>Due: {project.deadline ? new Date(project.deadline).toLocaleDateString() : 'Flexible'}</span>
            <span>Progress: <strong className="text-on-surface">{progress}%</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/submissions"
            className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface-variant flex items-center gap-1 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Submissions
          </Link>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-surface-container-lowest p-4 rounded-xl border border-surface-container-high shadow-xs">
        <div className="flex justify-between text-xs font-semibold mb-2">
          <span className="text-on-surface-variant uppercase tracking-wider">Project Progress</span>
          <span className="text-primary font-bold">{progress}%</span>
        </div>
        <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isApproved ? 'bg-emerald-500' : progress >= 70 ? 'bg-primary' : 'bg-secondary'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        {/* Left: Video Player Panel */}
        <div className="lg:col-span-7 bg-surface-container-lowest p-space-md rounded-xl border border-surface-container-high shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-title-md font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">play_circle</span>
              Video Review Player
            </h2>

            {/* Switch video tabs */}
            <div className="flex items-center gap-1 p-0.5 rounded-lg bg-surface-container border border-outline-variant/30">
              <button
                onClick={() => setVideoTab("SUBMISSION")}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                  videoTab === "SUBMISSION" ? "bg-surface-container-lowest text-on-surface shadow-xs" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Submitted Video ({latestEdited ? `v${latestEdited.version}` : 'None'})
              </button>
              <button
                onClick={() => setVideoTab("ORIGINAL")}
                className={`px-2.5 py-1 rounded text-xs font-semibold transition-all cursor-pointer ${
                  videoTab === "ORIGINAL" ? "bg-surface-container-lowest text-on-surface shadow-xs" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Original Video
              </button>
            </div>
          </div>

          <div className="bg-black rounded-lg aspect-video w-full overflow-hidden flex items-center justify-center relative shadow-inner">
            {activeVideoDriveId ? (
              <video
                key={activeVideoDriveId}
                src={`${apiUrl}/api/videos/${activeVideoDriveId}/stream`}
                controls
                className="w-full h-full object-contain"
                preload="metadata"
              />
            ) : (
              <div className="text-center p-8 text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl text-outline mb-2">videocam_off</span>
                <p className="text-sm font-semibold">No video available for preview.</p>
              </div>
            )}
          </div>

          <div className="mt-3 text-xs text-on-surface-variant flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-surface-container-high/40 pt-2.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="truncate">
                {videoTab === "SUBMISSION" ? (latestEdited?.filename || "Latest Submission") : (original_video?.original_filename || "Original Master")}
              </span>
            </div>

            {activeVideoDriveId && (
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`https://drive.google.com/file/d/${activeVideoDriveId}/view`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 rounded-md bg-surface-container hover:bg-surface-container-high text-on-surface text-[11px] font-semibold flex items-center gap-1 border border-outline-variant/30 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  <span>Open in Drive</span>
                </a>
                <a
                  href={`${apiUrl}/api/videos/${activeVideoDriveId}/stream`}
                  download
                  className="px-2.5 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-semibold flex items-center gap-1 transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">download</span>
                  <span>Export Video</span>
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Right: Review Actions Panel */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="bg-surface-container-lowest p-space-md rounded-xl border border-surface-container-high shadow-sm flex flex-col justify-between">
            <div>
              <h2 className="font-title-md font-bold text-on-surface mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">rate_review</span>
                Review Decision
              </h2>

              {isApproved ? (
                <div className="p-5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-emerald-700 text-2xl">verified</span>
                    <h3 className="font-bold text-sm">Project Approved & Completed</h3>
                  </div>
                  <p className="text-xs leading-relaxed">
                    This project has passed QA. The deliverable is finalized and archived in Google Drive's Final/ directory.
                  </p>
                </div>
              ) : isRevision ? (
                <div className="p-5 rounded-xl bg-error/10 border border-error/30 text-on-surface">
                  <div className="flex items-center gap-2 mb-2 text-error">
                    <span className="material-symbols-outlined text-2xl">assignment_return</span>
                    <h3 className="font-bold text-sm">Revision Requested</h3>
                  </div>
                  <p className="text-xs text-on-surface-variant mb-2">Your previous feedback notes sent to talent:</p>
                  <div className="p-3 bg-surface-container-lowest rounded-lg border border-error/20 text-xs font-medium">
                    "{project.notes}"
                  </div>
                  <p className="text-[11px] text-outline mt-2">Waiting for talent to upload a revised version.</p>
                </div>
              ) : isUnderReview ? (
                <div className="p-5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="material-symbols-outlined text-amber-700 text-2xl">hourglass_empty</span>
                    <h3 className="font-bold text-sm">Submission Awaiting Your Review</h3>
                  </div>
                  <p className="text-xs leading-relaxed">
                    Talent submitted version {latestEdited ? `v${latestEdited.version}` : '1'}. Evaluate the video and click Approve or Request Revision below.
                  </p>
                </div>
              ) : (
                <div className="p-5 rounded-xl bg-surface-container-low border border-outline-variant/30 text-on-surface">
                  <h3 className="font-bold text-sm mb-1">Project in Progress</h3>
                  <p className="text-xs text-on-surface-variant">
                    Talent artist is currently recording or editing. Once they submit for review, decisions will be enabled.
                  </p>
                </div>
              )}
            </div>

            {/* Decision Buttons */}
            <div className="pt-4 mt-4 border-t border-surface-container-high/40 flex flex-col gap-2">
              {showRevisionForm ? (
                <div className="flex flex-col gap-3 p-3 bg-error/5 rounded-xl border border-error/20">
                  <label className="text-xs font-bold text-error">Revision Instructions (Required)</label>
                  <textarea
                    value={revisionNotes}
                    onChange={(e) => setRevisionNotes(e.target.value)}
                    placeholder="Provide specific timecodes or notes for the talent..."
                    rows={3}
                    className="w-full p-2.5 rounded-lg text-xs bg-surface-container-lowest border border-error/30 text-on-surface focus:outline-error"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowRevisionForm(false)}
                      disabled={submitting}
                      className="px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleReviewAction("REVISION")}
                      disabled={submitting || !revisionNotes.trim()}
                      className="px-4 py-2 bg-error text-white font-semibold text-xs rounded-lg hover:bg-error/90 disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      {submitting ? "Sending..." : "Submit Revision Request"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setShowRevisionForm(true)}
                    disabled={submitting || isApproved}
                    className="py-2.5 px-3 rounded-lg bg-error/10 hover:bg-error/20 text-error font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">rate_review</span>
                    Request Revision
                  </button>

                  <button
                    onClick={() => setShowApproveModal(true)}
                    disabled={submitting || isApproved}
                    className="py-2.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    Approve Project
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Project Details Box */}
          <div className="bg-surface-container-lowest p-space-md rounded-xl border border-surface-container-high shadow-sm">
            <h3 className="font-title-sm font-bold text-on-surface mb-2">Project Metadata</h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-surface-container-high/40">
                <span className="text-on-surface-variant">Storage Location</span>
                <span className="font-semibold text-on-surface">VoiceFlow Studio / Projects</span>
              </div>
              <div className="flex justify-between py-1 border-b border-surface-container-high/40">
                <span className="text-on-surface-variant">Edited Versions</span>
                <span className="font-semibold text-on-surface">{edited_videos?.length || 0} version(s)</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-on-surface-variant">Total Submissions</span>
                <span className="font-semibold text-on-surface">{submissions?.length || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Approve Confirmation Modal */}
      {showApproveModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-md w-full p-6 shadow-2xl border border-outline-variant/40">
            <h3 className="font-title-lg font-bold text-on-surface mb-2">Approve Project Submission?</h3>
            <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">
              This will approve the project, update status to COMPLETED, save the final video to Google Drive's Final/ directory, and notify the talent artist.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowApproveModal(false)}
                disabled={submitting}
                className="px-4 py-2 text-xs font-semibold text-on-surface-variant hover:bg-surface-container rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReviewAction("APPROVE")}
                disabled={submitting}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
              >
                {submitting ? "Approving..." : "Confirm Approval"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
