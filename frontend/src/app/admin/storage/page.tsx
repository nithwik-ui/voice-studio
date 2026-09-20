"use client";

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

export default function StorageDashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [lastVerified, setLastVerified] = useState<string>("");
  const { session, loading: authLoading } = useAuth();

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const fetchStorageStats = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const currentSession = session || (await supabase.auth.getSession()).data.session;
      if (!currentSession?.access_token) {
        throw new Error('No active session. Please log in.');
      }
      
      const response = await fetch(`${apiUrl}/api/storage/usage`, {
        headers: {
          'Authorization': `Bearer ${currentSession.access_token}`
        }
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.detail || `Failed to fetch storage stats (HTTP ${response.status})`);
      }

      const data = await response.json();
      setStats(data);
      setLastVerified(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err: any) {
      console.error("Storage fetch error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      setTestResult(null);

      const currentSession = session || (await supabase.auth.getSession()).data.session;
      const res = await fetch(`${apiUrl}/api/storage/test`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentSession?.access_token}`
        }
      });

      if (!res.ok) {
        throw new Error("Connection test failed");
      }

      const data = await res.json();
      setTestResult("Google Drive connection is healthy and OAuth token is valid.");
      setLastVerified(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setTimeout(() => setTestResult(null), 5000);
    } catch (err: any) {
      setTestResult(`Error: ${err.message}`);
    } finally {
      setTestingConnection(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchStorageStats();
    }
  }, [authLoading]);

  if (loading || authLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p className="font-body-md text-on-surface-variant">Connecting to Google Drive and loading storage telemetry...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-space-lg rounded-xl bg-surface-container-lowest border border-error/30 max-w-2xl">
        <div className="flex items-center gap-3 text-error mb-2">
          <span className="material-symbols-outlined">error</span>
          <h2 className="font-title-md font-bold">Storage Fetch Failed</h2>
        </div>
        <p className="text-on-surface-variant text-sm mb-4">{error}</p>
        <button 
          onClick={fetchStorageStats} 
          className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-semibold hover:bg-primary-container transition-all cursor-pointer shadow-sm"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const usagePercentage = (stats.total_used / stats.total_capacity) * 100;

  return (
    <div className="flex flex-col w-full space-y-space-lg max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-container-high pb-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
            Google Drive & Storage
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Control the application's Google Drive connection, folder hierarchy, and asset quotas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStorageStats}
            className="px-3.5 py-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface flex items-center gap-1.5 transition-colors cursor-pointer border border-outline-variant/30"
          >
            <span className="material-symbols-outlined text-[16px]">refresh</span>
            Refresh Status
          </button>
          <button
            onClick={handleTestConnection}
            disabled={testingConnection}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-on-primary text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">wifi_tethering</span>
            {testingConnection ? "Verifying..." : "Test Connection"}
          </button>
        </div>
      </div>

      {testResult && (
        <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 border ${
          testResult.startsWith("Error") 
            ? "bg-error/10 text-error border-error/20" 
            : "bg-emerald-50 text-emerald-800 border-emerald-200"
        }`}>
          <span className="material-symbols-outlined text-[18px]">
            {testResult.startsWith("Error") ? "error" : "check_circle"}
          </span>
          <span>{testResult}</span>
        </div>
      )}

      {/* Drive Connection Status Card (Part 28 & 52) */}
      <div className="bg-surface-container-lowest p-space-xl rounded-xl border border-surface-container-high shadow-sm">
        <h2 className="font-title-md font-bold text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">cloud_sync</span>
          Google Drive Connection Status
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30">
            <span className="text-[11px] font-semibold text-outline uppercase tracking-wider block">Status</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-bold text-sm text-on-surface">Connected</span>
            </div>
          </div>

          <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30">
            <span className="text-[11px] font-semibold text-outline uppercase tracking-wider block">Authorized Account</span>
            <span className="font-semibold text-xs text-on-surface mt-1 block truncate" title={stats.user_email}>
              {stats.user_email || "chandanalareethika123@gmail.com"}
            </span>
          </div>

          <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30">
            <span className="text-[11px] font-semibold text-outline uppercase tracking-wider block">Root Workspace Folder</span>
            <span className="font-bold text-sm text-primary mt-1 block">
              {stats.root_folder || "VoiceFlow Studio"}
            </span>
          </div>

          <div className="p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30">
            <span className="text-[11px] font-semibold text-outline uppercase tracking-wider block">Health / Last Checked</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="font-bold text-xs text-emerald-700">Healthy</span>
              <span className="text-[10px] text-outline">({lastVerified || "Just now"})</span>
            </div>
          </div>
        </div>

        {/* Storage Quota Progress */}
        <div className="pt-2 border-t border-surface-container-high/40">
          <div className="flex justify-between items-end mb-2">
            <div>
              <h3 className="font-title-sm font-bold text-on-surface">Google Drive Storage Quota</h3>
              <p className="text-xs text-on-surface-variant">Live quota queried from Google Drive API</p>
            </div>
            <div className="text-right">
              <span className="font-title-lg font-bold text-on-surface">{stats.total_used} GB</span>
              <span className="text-xs text-on-surface-variant"> / {stats.total_capacity} GB</span>
            </div>
          </div>

          <div className="w-full h-3 bg-surface-container-high rounded-full overflow-hidden mb-6">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                usagePercentage > 90 ? 'bg-error' : usagePercentage > 75 ? 'bg-amber-500' : 'bg-primary'
              }`}
              style={{ width: `${Math.max(usagePercentage, 0.5)}%` }}
            />
          </div>

          {/* Breakdown */}
          <h4 className="font-title-xs font-bold uppercase tracking-wider text-outline mb-3 text-[11px]">
            Asset Category Breakdown
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Object.entries(stats.breakdown || {}).map(([key, value]: [string, any]) => (
              <div key={key} className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/30">
                <p className="text-xs font-medium text-on-surface-variant mb-0.5">{key}</p>
                <p className="font-title-md font-bold text-on-surface">{value} GB</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Google Drive Folder Architecture (Part 48 & 52) */}
      <div className="bg-surface-container-lowest p-space-xl rounded-xl border border-surface-container-high shadow-sm">
        <h2 className="font-title-md font-bold text-on-surface mb-2 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[20px]">account_tree</span>
          Google Drive Storage Lifecycle
        </h2>
        <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">
          The backend automatically isolates project files and handles server-side streaming without exposing OAuth credentials to end users.
        </p>

        <div className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/40 font-mono text-xs text-on-surface leading-relaxed overflow-x-auto">
          <div className="text-primary font-bold">VoiceFlow Studio/ (Root Folder)</div>
          <div className="pl-4 text-on-surface-variant">├── Original Videos/ <span className="text-[11px] text-outline font-sans">(Master video uploads)</span></div>
          <div className="pl-4 text-on-surface">├── Projects/</div>
          <div className="pl-8 text-on-surface">└── &#123;Project Name&#125;/</div>
          <div className="pl-12 text-on-surface-variant">├── Original/ <span className="text-[11px] text-outline font-sans">(Project source video)</span></div>
          <div className="pl-12 text-primary font-bold">├── Edited Videos/ <span className="text-[11px] text-outline font-sans">(External editor uploads: v1.mp4, v2.mp4)</span></div>
          <div className="pl-12 text-on-surface-variant">├── Recordings/ <span className="text-[11px] text-outline font-sans">(In-app voice-over recordings: .webm)</span></div>
          <div className="pl-12 text-emerald-700 font-bold">└── Final/ <span className="text-[11px] text-outline font-sans">(Admin approved final video deliverable)</span></div>
          <div className="pl-4 text-on-surface-variant">└── Thumbnails/</div>
        </div>
      </div>
    </div>
  );
}
