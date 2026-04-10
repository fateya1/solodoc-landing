"use client";
import { useState } from "react";
import { Video, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/api";
import { VideoCall } from "./video-call";
import { useAuthStore } from "@/store/auth";

interface VideoButtonProps {
  appointmentId: string;
  role: "doctor" | "patient";
  disabled?: boolean;
}

export function VideoButton({ appointmentId, role, disabled }: VideoButtonProps) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [callData, setCallData] = useState<{ token: string | null; roomUrl: string } | null>(null);
  const [error, setError] = useState("");

  const startCall = async () => {
    setLoading(true);
    setError("");
    try {
      const endpoint =
        role === "doctor"
          ? `/video/doctor/${appointmentId}/token`
          : `/video/patient/${appointmentId}/token`;
      const res = await apiClient.post(endpoint);
      setCallData({ token: res.data.token ?? null, roomUrl: res.data.roomUrl });
    } catch (err: any) {
      setError(err.response?.data?.message ?? "Failed to start video call");
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = () => setCallData(null);

  if (callData) {
    return (
      <VideoCall
        token={callData.token}
        roomUrl={callData.roomUrl}
        participantName={user?.fullName ?? "Participant"}
        onLeave={handleLeave}
      />
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={startCall}
        disabled={loading || disabled}
        className="flex items-center gap-1.5 text-xs bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 touch-manipulation"
      >
        {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Video className="w-3 h-3" />}
        {role === "doctor"
          ? loading ? "Starting..." : "Start Video"
          : loading ? "Joining..." : "Join Video"}
      </button>
      {error && <p className="text-xs text-red-500 max-w-xs">{error}</p>}
    </div>
  );
}