"use client";

import React, { forwardRef, useState } from 'react';

interface VideoPlayerProps {
  /** Google Drive file ID */
  driveFileId: string | null | undefined;
  /** Supabase JWT access token — appended as ?token= so <video> can auth without custom headers */
  token: string | null | undefined;
  /** Optional label shown as overlay at the bottom of the player */
  label?: string;
  /** autoPlay the video when src is ready */
  autoPlay?: boolean;
  /** Whether to show native controls (default true) */
  controls?: boolean;
  /** Extra CSS classes applied to the outer wrapper div */
  wrapperClassName?: string;
  /** Called when the video element encounters a load/network error */
  onError?: () => void;
  /** Called when the video can begin playback */
  onCanPlay?: () => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * VideoPlayer
 *
 * Renders a <video> that streams via the authorized backend proxy.
 * Appends the Supabase JWT as ?token= so the browser can authenticate
 * without custom HTTP headers (which <video src> does not support).
 *
 * HTTP Range requests are fully supported for seeking large MP4 files.
 * Use forwardRef to allow parent components (e.g. RecordingWorkspace)
 * to control playback directly via ref.
 */
const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  (
    {
      driveFileId,
      token,
      label,
      autoPlay = false,
      controls = true,
      wrapperClassName = '',
      onError,
      onCanPlay,
    },
    ref
  ) => {
    const [hasError, setHasError] = useState(false);
    const [reloadKey, setReloadKey] = useState(0);

    const handleError = () => {
      setHasError(true);
      onError?.();
    };

    const handleRetry = () => {
      setHasError(false);
      setReloadKey((k) => k + 1);
    };

    // Build authenticated stream URL — token in query string for <video> compatibility
    const streamUrl =
      driveFileId && token
        ? `${API_URL}/api/videos/${driveFileId}/stream?token=${encodeURIComponent(token)}`
        : null;

    // No file / no token states
    if (!streamUrl) {
      return (
        <div
          className={`aspect-video bg-black rounded-lg flex flex-col items-center justify-center text-white text-center p-8 ${wrapperClassName}`}
        >
          <span className="material-symbols-outlined text-4xl text-white/40 mb-2">
            videocam_off
          </span>
          <p className="text-sm font-semibold text-white/60">
            {!driveFileId ? 'No video available' : 'Authentication required'}
          </p>
        </div>
      );
    }

    // Error state with retry
    if (hasError) {
      return (
        <div
          className={`aspect-video bg-black rounded-lg flex flex-col items-center justify-center text-white text-center p-8 ${wrapperClassName}`}
        >
          <span className="material-symbols-outlined text-4xl text-red-400 mb-2">
            error
          </span>
          <p className="text-sm font-semibold text-white/80 mb-1">
            Unable to load video stream
          </p>
          <p className="text-xs text-white/40 mb-3">
            The file may still be processing or a network error occurred.
          </p>
          <button
            onClick={handleRetry}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      );
    }

    return (
      <div
        className={`aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center relative shadow-inner ${wrapperClassName}`}
      >
        <video
          key={`${driveFileId}-${reloadKey}`}
          ref={ref}
          src={streamUrl}
          controls={controls}
          autoPlay={autoPlay}
          preload="metadata"
          playsInline
          className="w-full h-full object-contain"
          onError={handleError}
          onCanPlay={onCanPlay}
        />
        {label && (
          <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between pointer-events-none">
            <span className="text-[10px] text-white/50 bg-black/50 px-2 py-0.5 rounded-full truncate max-w-[75%] backdrop-blur-sm">
              {label}
            </span>
            <span className="text-[10px] text-white/30 bg-black/50 px-2 py-0.5 rounded-full shrink-0 backdrop-blur-sm">
              🔒 Secure Stream
            </span>
          </div>
        )}
      </div>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;
