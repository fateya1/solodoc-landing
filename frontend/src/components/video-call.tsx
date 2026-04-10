"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { PhoneOff, Loader2, AlertCircle, Users } from "lucide-react";

interface VideoCallProps {
  token: string | null;
  roomUrl: string;
  onLeave: () => void;
  participantName: string;
}

export function VideoCall({ token, roomUrl, onLeave, participantName }: VideoCallProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Build the Daily prebuilt URL with participant name
  const callUrl = `${roomUrl}?userName=${encodeURIComponent(participantName)}${token ? `&t=${token}` : ""}`;

  const handleLoad = useCallback(() => {
    setLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setError("Failed to load video call. Please check your internet connection and try again.");
    setLoading(false);
  }, []);

  useEffect(() => {
    // Safety timeout — if iframe hasn't loaded in 30s, show error
    const timeout = setTimeout(() => {
      if (loading) {
        setError("Video call is taking too long to load. Please try again.");
        setLoading(false);
      }
    }, 30000);
    return () => clearTimeout(timeout);
  }, [loading]);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-white font-semibold">SoloDoc Video Consultation</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <Users className="w-4 h-4" />
            <span>In session</span>
          </div>
          <button
            onClick={onLeave}
            title="Leave call"
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl transition-colors text-sm"
          >
            <PhoneOff className="w-4 h-4" />
            Leave
          </button>
        </div>
      </div>

      {/* Video area */}
      <div className="flex-1 relative">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900 z-10">
            <Loader2 className="w-10 h-10 animate-spin text-blue-400" />
            <p className="text-slate-300 font-medium">Loading video call...</p>
            <p className="text-slate-500 text-sm">Please allow camera and microphone access when prompted</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-900 z-10 p-6">
            <AlertCircle className="w-12 h-12 text-red-400" />
            <p className="text-red-300 text-center max-w-sm">{error}</p>
            <div className="flex gap-3">
              <button
                onClick={() => { setError(""); setLoading(true); }}
                className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-500"
              >
                Try Again
              </button>
              <button
                onClick={onLeave}
                className="px-6 py-2 bg-slate-700 text-white rounded-xl hover:bg-slate-600"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {!error && (
          <iframe
            ref={iframeRef}
            src={callUrl}
            allow="camera; microphone; autoplay; display-capture; fullscreen"
            className="w-full h-full border-0"
            onLoad={handleLoad}
            onError={handleError}
          />
        )}
      </div>
    </div>
  );
}