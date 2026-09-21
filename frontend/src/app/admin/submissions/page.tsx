"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import VideoPlayer from "@/components/VideoPlayer";

export default function AdminSubmissionsPage() {
  const { session, profile, loading: authLoading } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [filter, setFilter] = useState<string>("AWAITING");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Review modal
  const [activeReviewSubmission, setActiveReviewSubmission] = useState<any | null>(null);
  const [reviewAction, setReviewAction] = useState<"APPROVE" | "REVISION" | null>(null);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      setError(null);

      const currentSession = session || (await supabase.auth.getSession()).data.session;
      if (!currentSession?.access_token) throw new Error("Authentication required");

      const res = await fetch(`${apiUrl}/api/admin/submissions`, {
        headers: {
          Authorization: `Bearer ${currentSession.access_token}`,
        },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.detail || "Failed to fetch submissions");
      }

      const data = await res.json();
      setSubmissions(data || []);
    } catch (err: any) {
      console.error("Submissions fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchSubmissions();
    }
  }, [authLoading]);

  const handleReviewSubmit = async () => {
    if (!activeReviewSubmission || !reviewAction) return;

    if (reviewAction === "REVISION" && !revisionNotes.trim()) {
      alert("Please provide specific feedback explaining the required revisions.");
      return;
    }

    try {
      setSubmittingReview(true);
      const currentSession = session || (await supabase.auth.getSession()).data.session;
      const formData = new FormData();
      formData.append("action", reviewAction);
      if (revisionNotes.trim()) {
        formData.append("notes", revisionNotes.trim());
      }

      const res = await fetch(`${apiUrl}/api/projects/${activeReviewSubmission.project_id}/review`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${currentSession?.access_token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        throw new Error(errJson?.detail || "Review action failed");
      }

      alert(reviewAction === "APPROVE" ? "Project approved and final deliverable registered!" : "Revision feedback sent to talent.");
      setActiveReviewSubmission(null);
      setReviewAction(null);
      setRevisionNotes("");
      await fetchSubmissions();
    } catch (err: any) {
      console.error("Review submit error:", err);
      alert(`Error submitting review: ${err.message}`);
    } finally {
      setSubmittingReview(false);
    }
  };

  const filteredSubmissions = submissions.filter((sub) => {
    if (filter === "AWAITING") return sub.status === "PENDING" || sub.projects?.status === "UNDER_REVIEW";
    if (filter === "REVISION") return sub.status === "REVISION_REQUESTED" || sub.projects?.status === "REVISION_REQUIRED";
    if (filter === "APPROVED") return sub.status === "APPROVED" || sub.projects?.status === "APPROVED" || sub.projects?.status === "COMPLETED";
    return true;
  });

  return (
    <div className="flex flex-col gap-space-lg w-full max-w-6xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-container-high pb-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
            Submissions & QA Queue
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Review voice-overs and edited videos submitted by talent.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-surface-container border border-outline-variant/30 self-start">
        {[
          { id: "AWAITING", label: "Awaiting Review", count: submissions.filter((s) => s.status === "PENDING" || s.projects?.status === "UNDER_REVIEW").length },
          { id: "REVISION", label: "Revision Requested", count: submissions.filter((s) => s.status === "REVISION_REQUESTED" || s.projects?.status === "REVISION_REQUIRED").length },
          { id: "APPROVED", label: "Approved / Completed", count: submissions.filter((s) => s.status === "APPROVED" || s.projects?.status === "APPROVED" || s.projects?.status === "COMPLETED").length },
          { id: "ALL", label: "All Submissions", count: submissions.length },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              filter === tab.id
                ? "bg-surface-container-lowest text-on-surface shadow-xs"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 bg-surface-container-lowest rounded-xl border border-surface-container-high">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="font-body-md text-on-surface-variant">Loading submissions queue...</p>
        </div>
      ) : error ? (
        <div className="p-8 rounded-xl bg-surface-container-lowest border border-error/30 text-center">
          <p className="text-sm font-semibold text-error mb-2">{error}</p>
          <button
            onClick={fetchSubmissions}
            className="px-4 py-2 bg-primary text-on-primary rounded-lg text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      ) : filteredSubmissions.length === 0 ? (
        <div className="p-16 flex flex-col items-center justify-center gap-3 bg-surface-container-lowest rounded-xl border border-surface-container-high text-center">
          <span className="material-symbols-outlined text-4xl text-outline mb-1">done_all</span>
          <p className="font-title-md font-bold text-on-surface">No submissions awaiting review.</p>
          <p className="font-body-sm text-on-surface-variant max-w-sm">
            All submitted talent recordings and edited videos have been evaluated.
          </p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-xl border border-surface-container-high shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-container-low/70 text-outline uppercase tracking-wider font-semibold">
                <th className="py-3 px-4">PROJECT & TALENT</th>
                <th className="py-3 px-4">VERSION</th>
                <th className="py-3 px-4">SUBMITTED DATE</th>
                <th className="py-3 px-4">STATUS</th>
                <th className="py-3 px-4 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high/40">
              {filteredSubmissions.map((sub) => {
                const projName = sub.projects?.name || "Project";
                const talentName = sub.profiles?.full_name || sub.projects?.profiles?.full_name || "Talent Artist";
                const talentEmail = sub.profiles?.email || sub.projects?.profiles?.email || "";
                const isPending = sub.status === "PENDING" || sub.projects?.status === "UNDER_REVIEW";

                return (
                  <tr key={sub.id} className="hover:bg-surface-container-low/40 transition-colors">
                    <td className="py-3.5 px-4">
                      <div>
                        <span className="font-bold text-on-surface text-sm block truncate max-w-xs">{projName}</span>
                        <span className="text-on-surface-variant text-xs mt-0.5 block">
                          Talent: <strong className="text-on-surface">{talentName}</strong> ({talentEmail})
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-primary-container text-primary font-bold text-xs">
                        v{sub.version || 1}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-on-surface-variant">
                      {new Date(sub.submitted_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          sub.status === "APPROVED"
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : sub.status === "REVISION_REQUESTED"
                            ? "bg-error/10 text-error border-error/20"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        }`}
                      >
                        {sub.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {sub.drive_file_id && (
                          <button
                            onClick={() => {
                              setActiveReviewSubmission(sub);
                              setReviewAction(null);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-on-surface font-semibold text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[16px]">play_circle</span>
                            Play
                          </button>
                        )}

                        {isPending && (
                          <>
                            <button
                              onClick={() => {
                                setActiveReviewSubmission(sub);
                                setReviewAction("APPROVE");
                              }}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setActiveReviewSubmission(sub);
                                setReviewAction("REVISION");
                              }}
                              className="px-3 py-1.5 rounded-lg bg-error hover:bg-error/90 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
                            >
                              Request Revision
                            </button>
                          </>
                        )}

                        <Link
                          href={`/admin/projects/${sub.project_id}`}
                          className="px-3 py-1.5 rounded-lg bg-primary-container text-primary hover:bg-primary hover:text-on-primary font-semibold text-xs transition-colors cursor-pointer"
                        >
                          Project
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Review & Playback Modal */}
      {activeReviewSubmission && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-3xl w-full p-6 shadow-2xl border border-outline-variant/40 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
              <div>
                <h3 className="font-title-lg font-bold text-on-surface">
                  {activeReviewSubmission.projects?.name} (v{activeReviewSubmission.version || 1})
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Submitted by {activeReviewSubmission.profiles?.full_name || "Talent"} on{" "}
                  {new Date(activeReviewSubmission.submitted_at).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveReviewSubmission(null);
                  setReviewAction(null);
                  setRevisionNotes("");
                }}
                className="p-1 rounded-full text-on-surface-variant hover:bg-surface-container cursor-pointer"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>

            {/* Video player for the submitted asset */}
            <VideoPlayer
              driveFileId={activeReviewSubmission.drive_file_id}
              token={session?.access_token}
              autoPlay={true}
              label={`v${activeReviewSubmission.version || 1} — ${activeReviewSubmission.projects?.name || 'Submission'}`}
              wrapperClassName="w-full"
            />

            {/* Actions / Decision Form */}
            {reviewAction === "REVISION" ? (
              <div className="p-4 rounded-xl bg-error/10 border border-error/30 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-error font-bold text-sm">
                  <span className="material-symbols-outlined text-[20px]">rate_review</span>
                  Request Revision Feedback (Required)
                </div>
                <textarea
                  value={revisionNotes}
                  onChange={(e) => setRevisionNotes(e.target.value)}
                  placeholder="E.g., Please improve audio synchronization in the final 30 seconds and reduce background hiss..."
                  rows={3}
                  className="w-full p-3 rounded-lg text-xs bg-surface-container-lowest border border-error/30 text-on-surface focus:outline-error"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setReviewAction(null)}
                    disabled={submittingReview}
                    className="px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReviewSubmit}
                    disabled={submittingReview || !revisionNotes.trim()}
                    className="px-4 py-2 bg-error text-white font-semibold text-xs rounded-lg hover:bg-error/90 disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {submittingReview ? "Sending..." : "Submit Revision Request"}
                  </button>
                </div>
              </div>
            ) : reviewAction === "APPROVE" ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                  <span className="material-symbols-outlined text-[20px]">verified</span>
                  Approve and Finalize Submission
                </div>
                <p className="text-xs text-emerald-900 leading-relaxed">
                  Approving this submission will register this version as the final video, move the project to COMPLETED status, copy the deliverable to Google Drive's Final/ directory, and notify the talent artist.
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setReviewAction(null)}
                    disabled={submittingReview}
                    className="px-3 py-1.5 text-xs font-semibold text-on-surface-variant hover:bg-surface-container rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReviewSubmit}
                    disabled={submittingReview}
                    className="px-4 py-2 bg-emerald-600 text-white font-semibold text-xs rounded-lg hover:bg-emerald-700 disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {submittingReview ? "Finalizing..." : "Confirm Approval"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-on-surface-variant font-medium">Evaluate submitted video</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setReviewAction("REVISION")}
                    className="px-4 py-2 rounded-lg bg-error hover:bg-error/90 text-white font-semibold text-xs cursor-pointer shadow-xs"
                  >
                    Request Revision
                  </button>
                  <button
                    onClick={() => setReviewAction("APPROVE")}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs cursor-pointer shadow-xs"
                  >
                    Approve Submission
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
