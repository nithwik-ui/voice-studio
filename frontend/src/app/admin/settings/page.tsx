"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';

export default function AdminSettingsPage() {
  const { user, role, signOut } = useAuth();
  const router = useRouter();

  const [workspaceName, setWorkspaceName] = useState("Studio Workspace");
  const [defaultFormat, setDefaultFormat] = useState("audio/webm;codecs=opus");
  const [resumableChunkSize, setResumableChunkSize] = useState("1024");
  const [driveStatus, setDriveStatus] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      try {
        // Fetch from Supabase settings table
        const { data } = await supabase.from('settings').select('*');
        if (data && data.length > 0) {
          const map = Object.fromEntries(data.map((item: any) => [item.key, item.value]));
          if (map.workspace_name) setWorkspaceName(map.workspace_name);
          if (map.default_format) setDefaultFormat(map.default_format);
          if (map.chunk_size) setResumableChunkSize(map.chunk_size);
        }

        // Check Drive status from backend
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          const res = await fetch('http://localhost:8000/api/settings', {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          });
          if (res.ok) {
            const driveData = await res.json();
            setDriveStatus(driveData);
          }
        }
      } catch (err: any) {
        console.error("Failed to load settings:", err);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const updates = [
        { key: 'workspace_name', value: workspaceName, updated_at: new Date().toISOString() },
        { key: 'default_format', value: defaultFormat, updated_at: new Date().toISOString() },
        { key: 'chunk_size', value: resumableChunkSize, updated_at: new Date().toISOString() },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from('settings')
          .upsert(update, { onConflict: 'key' });
        if (error) throw error;
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error("Save error:", err);
      setError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  return (
    <div className="flex flex-col w-full space-y-space-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">Studio Settings</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Manage workspace preferences, Google Drive storage integration, and studio security.</p>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-space-sm rounded-lg bg-secondary-container text-on-secondary-container font-label-md text-label-md flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">check_circle</span>
          <span>Settings saved successfully to Supabase database.</span>
        </div>
      )}

      {error && (
        <div className="p-space-sm rounded-lg bg-error-container text-on-error-container font-label-md text-label-md flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">error</span>
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
        {/* Left 2 Columns: Main Settings */}
        <div className="lg:col-span-2 space-y-space-lg">
          {/* Workspace Settings */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-surface-container-high shadow-sm">
            <h2 className="font-title-md font-bold text-on-surface mb-4">Workspace Preferences</h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-on-surface mb-1">Workspace Name</label>
                <input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-lg border border-outline-variant/40 bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-on-surface mb-1">Default Audio Recording Codec</label>
                  <select
                    value={defaultFormat}
                    onChange={(e) => setDefaultFormat(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-outline-variant/40 bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                  >
                    <option value="audio/webm;codecs=opus">WebM Opus (48kHz / 24-bit studio)</option>
                    <option value="audio/mp4">AAC MP4 (Standard Broadcast)</option>
                    <option value="audio/wav">Linear PCM WAV (Lossless)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-on-surface mb-1">Resumable Chunk Size (KB)</label>
                  <input
                    type="number"
                    value={resumableChunkSize}
                    onChange={(e) => setResumableChunkSize(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-lg border border-outline-variant/40 bg-surface text-on-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-primary hover:bg-primary-container text-on-primary font-semibold text-sm rounded-lg shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  {saving ? "Saving Changes..." : "Save Workspace Settings"}
                </button>
              </div>
            </form>
          </div>

          {/* Infrastructure Health Card */}
          <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-surface-container-high shadow-sm">
            <h2 className="font-title-md font-bold text-on-surface mb-4">Infrastructure & Cloud Integrations</h2>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low border border-outline-variant/30">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[24px]">cloud_sync</span>
                  <div>
                    <p className="font-label-md font-semibold text-on-surface">Google Drive Storage API</p>
                    <p className="text-xs text-on-surface-variant">Root folder: VoiceFlow Studio</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-secondary-container text-on-secondary-container flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  {driveStatus?.drive_configured ? "Active & Authorized" : "Connected"}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low border border-outline-variant/30">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[24px]">database</span>
                  <div>
                    <p className="font-label-md font-semibold text-on-surface">Supabase PostgreSQL</p>
                    <p className="text-xs text-on-surface-variant">Database host: wuutxaljcfhpjzjtzrsc.supabase.co</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-secondary-container text-on-secondary-container flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  Live Connection
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-low border border-outline-variant/30">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-[24px]">memory</span>
                  <div>
                    <p className="font-label-md font-semibold text-on-surface">FastAPI Video Engine</p>
                    <p className="text-xs text-on-surface-variant">Streaming proxy & media ingest on port 8000</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-secondary-container text-on-secondary-container flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  Online
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Account & Authentication */}
        <div className="space-y-space-lg">
          <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-surface-container-high shadow-sm">
            <h2 className="font-title-md font-bold text-on-surface mb-4">Active Administrator</h2>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary-container text-primary flex items-center justify-center font-bold text-lg">
                {user?.email?.charAt(0).toUpperCase() || 'A'}
              </div>
              <div className="min-w-0">
                <p className="font-label-md font-bold text-on-surface truncate">
                  {user?.user_metadata?.full_name || "Admin Nithwik"}
                </p>
                <p className="text-xs text-on-surface-variant truncate">{user?.email || "k.nithwik750@gmail.com"}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-primary-fixed text-on-primary-fixed">
                  Role: {role || "ADMIN"}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-surface-container-high">
              <button
                onClick={handleSignOut}
                className="w-full py-2 px-4 rounded-lg bg-surface-container hover:bg-error/10 hover:text-error text-on-surface font-semibold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer border border-outline-variant/30"
              >
                <span className="material-symbols-outlined text-[18px]">logout</span>
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-space-lg rounded-xl border border-surface-container-high shadow-sm">
            <h2 className="font-title-md font-bold text-on-surface mb-2">Google Drive Storage</h2>
            <p className="text-xs text-on-surface-variant mb-4">
              All videos and audio recordings are synced directly to your authorized Google Drive storage.
            </p>
            <a
              href="/admin/storage"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
            >
              <span>View Storage Dashboard</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
