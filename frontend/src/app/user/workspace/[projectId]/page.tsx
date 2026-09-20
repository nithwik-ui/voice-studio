"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useNavigationGuard } from '@/hooks/useNavigationGuard';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type RecordingState = 
  | 'IDLE' 
  | 'MIC_PERMISSION_REQUIRED' 
  | 'READY' 
  | 'RECORDING' 
  | 'PAUSED' 
  | 'STOPPED' 
  | 'PREVIEW' 
  | 'UPLOADING' 
  | 'SAVED' 
  | 'FAILED';

export default function RecordingWorkspace() {
  const { projectId } = useParams() as { projectId: string };
  const router = useRouter();
  const { user, session } = useAuth();
  
  const [state, setState] = useState<RecordingState>('IDLE');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [project, setProject] = useState<any>(null);
  const [folderVideos, setFolderVideos] = useState<any[]>([]);
  const [activeVideo, setActiveVideo] = useState<any>(null);
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);
  
  // Microphone telemetry
  const [micLabel, setMicLabel] = useState<string>("Default Microphone");
  const [micSampleRate, setMicSampleRate] = useState<number | null>(null);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  // Timeline tracking
  const [timer, setTimer] = useState(0);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  // Protect against accidental navigation
  const isDirty = ['RECORDING', 'PAUSED', 'STOPPED', 'PREVIEW', 'UPLOADING'].includes(state);
  useNavigationGuard(isDirty, "You have an unsaved recording. Are you sure you want to leave?");

  useEffect(() => {
    checkPermissions();
    fetchProject();

    return () => {
      cleanup();
    };
  }, [projectId]);

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => null);
      audioContextRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  const fetchProject = async () => {
    try {
      setVideoLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*, videos(*)')
        .eq('id', projectId)
        .single();
        
      if (error) throw error;
      setProject(data);
      
      if (data.is_folder_project) {
        const currentSession = session || (await supabase.auth.getSession()).data.session;
        const res = await fetch(`${apiUrl}/api/projects/${projectId}/folder-videos`, {
          headers: {
            'Authorization': `Bearer ${currentSession?.access_token}`
          }
        });
        if (res.ok) {
          const vids = await res.json();
          setFolderVideos(vids || []);
          if (vids.length > 0) setActiveVideo(vids[0]);
        }
      } else {
        setActiveVideo(data.videos);
      }
    } catch (err) {
      console.error("Project fetch error:", err);
      setVideoError(true);
    } finally {
      setVideoLoading(false);
    }
  };

  const checkPermissions = async () => {
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices) {
        setState('READY');
        return;
      }

      // Check permission state without triggering an uninvited prompt on initial page load
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          if (status.state === 'denied') {
            setState('MIC_PERMISSION_REQUIRED');
            return;
          }
          if (status.state === 'prompt') {
            // Keep state as ready so user can click to record when ready without premature prompt
            setState('READY');
            return;
          }
        } catch {
          // Permissions query for microphone is not supported in all browsers
        }
      }

      // If already granted, discover available microphones
      const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
      const mics = devices.filter(d => d.kind === 'audioinput');
      setAudioDevices(mics);
      if (mics.length > 0) {
        setSelectedDeviceId(mics[0].deviceId);
        setMicLabel(mics[0].label || "Microphone Ready");
      }
      setState('READY');
    } catch {
      setState('READY');
    }
  };

  const requestMicPermission = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        alert("Your browser does not support audio recording.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Query sample rate
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          setMicSampleRate(ctx.sampleRate);
          ctx.close().catch(() => null);
        }
      } catch {
        // ignore
      }

      // Query input devices
      const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
      const mics = devices.filter(d => d.kind === 'audioinput');
      setAudioDevices(mics);
      if (mics.length > 0) {
        setSelectedDeviceId(mics[0].deviceId);
        setMicLabel(mics[0].label || "Microphone Ready");
      }

      stream.getTracks().forEach(track => track.stop());
      setState('READY');
    } catch (err: any) {
      // Don't call console.error to avoid triggering Next.js error overlay
      setState('MIC_PERMISSION_REQUIRED');
    }
  };

  const startRecording = async () => {
    if (state !== 'READY' && state !== 'PREVIEW' && state !== 'IDLE') return;

    try {
      const constraints: MediaStreamConstraints = {
        audio: selectedDeviceId ? { deviceId: { exact: selectedDeviceId } } : true
      };

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (err: any) {
        if (err.name === 'NotAllowedError' || err.message?.includes('Permission dismissed')) {
          setState('MIC_PERMISSION_REQUIRED');
          return;
        }
        throw err;
      }

      streamRef.current = stream;
      
      const track = stream.getAudioTracks()[0];
      if (track) {
        setMicLabel(track.label || "Connected Microphone");
        const settings = track.getSettings();
        if (settings.sampleRate) setMicSampleRate(settings.sampleRate);
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setAudioBlob(audioBlob);
        
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(t => t.stop());
          streamRef.current = null;
        }
        setState('PREVIEW');
      };

      // Reset Timeline & Synced Video
      setRecordingStartTime(Date.now());
      setTimer(0);
      setAudioUrl(null);
      audioChunksRef.current = [];

      mediaRecorder.start(250); // Emit data chunks every 250ms
      setState('RECORDING');

      // Video Synchronization: Start Video
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        videoRef.current.play().catch(e => console.log("Video play prevented:", e));
      }

      timerRef.current = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.message?.includes('Permission dismissed')) {
        setState('MIC_PERMISSION_REQUIRED');
      } else {
        console.warn('Recording start notice:', err);
        setState('FAILED');
      }
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && state === 'RECORDING') {
      mediaRecorderRef.current.pause();
      setState('PAUSED');
      
      // Synced Video: Pause
      if (videoRef.current) {
        videoRef.current.pause();
      }
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && state === 'PAUSED') {
      mediaRecorderRef.current.resume();
      setState('RECORDING');
      
      // Synced Video: Resume
      if (videoRef.current) {
        videoRef.current.play().catch(() => null);
      }
      
      timerRef.current = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      setState('STOPPED');
      mediaRecorderRef.current.stop();
      
      // Synced Video: Stop & pause
      if (videoRef.current) {
        videoRef.current.pause();
      }
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const discardRecording = () => {
    if (confirm("Are you sure you want to discard this take and re-record?")) {
      setAudioUrl(null);
      setAudioBlob(null);
      setTimer(0);
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
      }
      setState('READY');
    }
  };

  const saveRecording = async () => {
    if (!audioBlob) return;
    setState('UPLOADING');

    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, `recording_${projectId}.webm`);
      
      if (project?.is_folder_project && activeVideo) {
        formData.append('source_drive_file_id', activeVideo.id);
        formData.append('source_filename', activeVideo.name);
      }

      const currentSession = session || (await supabase.auth.getSession()).data.session;
      const response = await fetch(`${apiUrl}/api/projects/${projectId}/record`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${currentSession?.access_token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.detail || 'Drive upload failed');
      }

      setState('SAVED');
      alert('Recording saved successfully and uploaded to Google Drive!');
      router.push(`/user/projects/${projectId}`);
    } catch (err: any) {
      console.error('Error saving recording:', err);
      setState('FAILED');
      alert(`Error saving recording: ${err.message}`);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col w-full max-w-5xl mx-auto space-y-space-lg pb-12">
      {/* Header (No internal IDs!) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-surface-container-high pb-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
            Record Voice-Over
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Voice-over recording for <span className="font-semibold text-on-surface">{project?.name || "Video Project"}</span>
          </p>
        </div>

        <Link
          href={`/user/projects/${projectId}`}
          className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-xs font-semibold text-on-surface-variant flex items-center gap-1 self-start sm:self-auto cursor-pointer"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to Project
        </Link>
      </div>

      {state === 'MIC_PERMISSION_REQUIRED' && (
        <div className="bg-amber-500/10 text-amber-900 border border-amber-300/80 p-4 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-amber-600 text-3xl">mic_off</span>
            <div>
              <h3 className="font-title-sm font-bold text-on-surface">Microphone Access Needed</h3>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Microphone permission was dismissed or blocked. Click <strong>Allow Microphone</strong> or enable it in your browser address bar.
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={requestMicPermission} 
            className="ml-auto px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded-lg shadow-sm hover:bg-primary/90 cursor-pointer shrink-0"
          >
            Allow Microphone
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        {/* Left: Original Video Panel & Folder List */}
        <div className="lg:col-span-7 flex flex-col gap-space-lg">
          
          <div className="bg-surface-container-lowest p-space-md rounded-xl border border-surface-container-high shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-title-md font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">videocam</span>
                Original Video {activeVideo?.name ? `- ${activeVideo.name}` : ''}
              </h2>
              <span className="text-xs text-on-surface-variant font-medium">Google Drive Stream</span>
            </div>

            <div className="bg-black rounded-lg aspect-video w-full overflow-hidden flex items-center justify-center relative shadow-inner">
              {activeVideo?.drive_file_id || activeVideo?.id ? (
                <video 
                  key={activeVideo?.drive_file_id || activeVideo?.id}
                  ref={videoRef}
                  className="w-full h-full object-contain"
                  controls={state !== 'RECORDING' && state !== 'PAUSED'} 
                  preload="metadata"
                  src={`${apiUrl}/api/videos/${activeVideo?.drive_file_id || activeVideo?.id}/stream`}
                  onError={() => setVideoError(true)}
                />
              ) : videoLoading ? (
                <div className="flex flex-col items-center justify-center text-on-surface-variant p-8">
                  <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
                  <p className="text-xs">Loading media stream from Google Drive...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-on-surface-variant p-8 text-center">
                  <span className="material-symbols-outlined text-4xl mb-2 text-outline">error</span>
                  <p className="text-sm font-semibold">Unable to load the project video.</p>
                  <button
                    onClick={fetchProject}
                    className="mt-3 px-3 py-1 bg-surface-container-high hover:bg-surface-container text-xs rounded-md font-semibold cursor-pointer"
                  >
                    Retry
                  </button>
                </div>
              )}

              {state === 'RECORDING' && (
                <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-full text-white text-xs font-semibold backdrop-blur-md">
                  <span className="w-2.5 h-2.5 rounded-full bg-error animate-pulse"></span>
                  RECORDING
                </div>
              )}
              {state === 'PAUSED' && (
                <div className="absolute top-4 right-4 flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-full text-white text-xs font-semibold backdrop-blur-md">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  PAUSED
                </div>
              )}
            </div>

            <p className="text-xs text-on-surface-variant mt-3 leading-relaxed">
              The video will automatically play, pause, and synchronize with your microphone controls to prevent timing drift.
            </p>
          </div>

          {project?.is_folder_project && folderVideos.length > 0 && (
            <div className="bg-surface-container-lowest p-space-md rounded-xl border border-surface-container-high shadow-sm">
              <h3 className="font-title-sm font-bold text-on-surface mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">folder</span>
                Videos in this Folder Project
              </h3>
              <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
                {folderVideos.map((vid: any) => {
                  const isSelected = activeVideo?.id === vid.id;
                  return (
                    <button
                      key={vid.id}
                      onClick={() => {
                        if (state !== 'IDLE' && state !== 'READY') return;
                        setActiveVideo(vid);
                      }}
                      disabled={state !== 'IDLE' && state !== 'READY' && state !== 'FAILED'}
                      className={`text-left p-2.5 rounded-lg border text-sm flex items-center gap-3 transition-colors ${
                        isSelected 
                          ? "bg-primary/10 border-primary font-bold text-primary" 
                          : "bg-surface-container border-outline-variant/30 text-on-surface-variant hover:bg-surface-container-high"
                      } disabled:opacity-50`}
                    >
                      <span className="material-symbols-outlined text-[20px]">
                        {isSelected ? "play_circle" : "video_file"}
                      </span>
                      <span className="truncate flex-1">{vid.name}</span>
                      <span className="text-[11px] opacity-70 shrink-0">{vid.size_formatted}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Recording Panel & Controls */}
        <div className="lg:col-span-5 bg-surface-container-lowest p-space-xl rounded-xl border border-surface-container-high shadow-sm flex flex-col justify-between">
          <div>
            {/* Microphone Status */}
            <div className="p-3 bg-surface-container-low rounded-lg border border-outline-variant/30 mb-6 flex items-center justify-between">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${state === 'MIC_PERMISSION_REQUIRED' ? 'bg-error' : 'bg-emerald-500'}`} />
                <span className="text-xs font-semibold text-on-surface truncate" title={micLabel}>
                  {state === 'MIC_PERMISSION_REQUIRED' ? 'Microphone Blocked' : micLabel}
                </span>
              </div>
              {micSampleRate && (
                <span className="text-[11px] font-mono font-medium text-outline shrink-0 ml-2">
                  {Math.round(micSampleRate / 1000)} kHz
                </span>
              )}
            </div>

            {/* Timer Display */}
            <div className="text-center my-6">
              <div className="text-5xl font-mono font-bold text-on-surface tracking-wider">
                {formatTime(timer)}
              </div>
              <p className="text-xs font-semibold uppercase tracking-wider mt-2">
                {state === 'RECORDING' && <span className="text-error flex items-center justify-center gap-1.5"><span className="w-2 h-2 rounded-full bg-error animate-ping"></span> Live Recording</span>}
                {state === 'PAUSED' && <span className="text-amber-600">Recording Paused</span>}
                {state === 'PREVIEW' && <span className="text-primary">Preview Take</span>}
                {(state === 'READY' || state === 'IDLE') && <span className="text-outline">Ready to Record</span>}
                {state === 'UPLOADING' && <span className="text-primary animate-pulse">Uploading to Drive...</span>}
              </p>
            </div>

            {/* Audio Preview if Take is Complete */}
            {state === 'PREVIEW' && audioUrl && (
              <div className="mb-6 p-4 rounded-xl bg-surface-container-low border border-primary/20">
                <span className="text-xs font-bold text-primary block mb-2">Recording Preview:</span>
                <audio src={audioUrl} controls className="w-full h-8" />
              </div>
            )}
          </div>

          {/* Interactive State Controls */}
          <div className="flex flex-col gap-2 pt-4 border-t border-surface-container-high/40">
            {(state === 'READY' || state === 'IDLE' || state === 'FAILED') && (
              <button
                onClick={startRecording}
                className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-on-primary font-bold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">radio_button_checked</span>
                Start Recording
              </button>
            )}

            {state === 'RECORDING' && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={pauseRecording}
                  className="py-3 px-4 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">pause</span>
                  Pause
                </button>
                <button
                  onClick={stopRecording}
                  className="py-3 px-4 bg-error hover:bg-error/90 text-white font-bold text-sm rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">stop</span>
                  Stop Take
                </button>
              </div>
            )}

            {state === 'PAUSED' && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={resumeRecording}
                  className="py-3 px-4 bg-primary hover:bg-primary/90 text-on-primary font-bold text-sm rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">play_arrow</span>
                  Resume
                </button>
                <button
                  onClick={stopRecording}
                  className="py-3 px-4 bg-error hover:bg-error/90 text-white font-bold text-sm rounded-xl shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">stop</span>
                  Stop Take
                </button>
              </div>
            )}

            {state === 'PREVIEW' && (
              <div className="flex flex-col gap-2">
                <button
                  onClick={saveRecording}
                  className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[20px]">cloud_upload</span>
                  Save Recording to Google Drive
                </button>
                <button
                  onClick={discardRecording}
                  className="w-full py-2 px-3 bg-surface-container-high hover:bg-surface-container text-on-surface font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Re-record (Discard Take)
                </button>
              </div>
            )}

            {state === 'UPLOADING' && (
              <div className="p-3 bg-primary-container/20 rounded-xl text-center">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-xs font-semibold text-primary">Streaming recording to Google Drive...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
