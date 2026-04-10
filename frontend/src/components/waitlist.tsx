"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Bell, BellOff, Loader2, CheckCircle } from "lucide-react";
import { apiClient } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { format } from "date-fns";

// ─── WaitlistButton ───────────────────────────────────────────────────────────
// Shows on doctor cards — lets patient join/leave waitlist
export function WaitlistButton({ doctorProfileId, doctorName }: { doctorProfileId: string; doctorName: string }) {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [joined, setJoined] = useState(false);

  const { data: statusData, isLoading: statusLoading } = useQuery({
    queryKey: ["waitlist-status", doctorProfileId],
    queryFn: () => apiClient.get(`/waitlist/status/${doctorProfileId}`).then((r) => r.data),
    enabled: !!token,
  });

  const joinMutation = useMutation({
    mutationFn: () => apiClient.post(`/waitlist/join/${doctorProfileId}`),
    onSuccess: () => {
      setJoined(true);
      queryClient.invalidateQueries({ queryKey: ["waitlist-status", doctorProfileId] });
      queryClient.invalidateQueries({ queryKey: ["my-waitlist"] });
    },
    onError: (err: any) => alert(err.response?.data?.message || "Failed to join waitlist."),
  });

  const leaveMutation = useMutation({
    mutationFn: () => apiClient.delete(`/waitlist/leave/${doctorProfileId}`),
    onSuccess: () => {
      setJoined(false);
      queryClient.invalidateQueries({ queryKey: ["waitlist-status", doctorProfileId] });
      queryClient.invalidateQueries({ queryKey: ["my-waitlist"] });
    },
    onError: (err: any) => alert(err.response?.data?.message || "Failed to leave waitlist."),
  });

  if (!token) return null;
  if (statusLoading) return null;

  const onWaitlist = statusData?.onWaitlist || joined;
  const isPending = joinMutation.isPending || leaveMutation.isPending;

  if (onWaitlist) {
    return (
      <div className="flex items-center gap-2 mt-3">
        <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-lg">
          <Bell className="w-3.5 h-3.5" />
          On waitlist — you will be notified when a slot opens
        </div>
        <button
          onClick={() => leaveMutation.mutate()}
          disabled={isPending}
          className="text-xs text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
        >
          {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <BellOff className="w-3 h-3" />}
          Leave
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => joinMutation.mutate()}
      disabled={isPending}
      className="mt-3 w-full flex items-center justify-center gap-2 text-xs border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 px-3 py-2 rounded-lg transition-colors font-medium"
    >
      {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
      {isPending ? "Joining waitlist..." : `Join waitlist for Dr. ${doctorName}`}
    </button>
  );
}

// ─── WaitlistPanel ────────────────────────────────────────────────────────────
// Shows in patient dashboard waitlist tab
export function WaitlistPanel() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: waitlist, isLoading } = useQuery({
    queryKey: ["my-waitlist"],
    queryFn: () => apiClient.get("/waitlist/my").then((r) => r.data),
    enabled: !!token,
  });

  const leaveMutation = useMutation({
    mutationFn: (doctorProfileId: string) => apiClient.delete(`/waitlist/leave/${doctorProfileId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["my-waitlist"] }),
    onError: (err: any) => alert(err.response?.data?.message || "Failed to leave waitlist."),
  });

  if (isLoading) {
    return (
      <div className="card flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
        <Bell className="w-5 h-5 text-amber-500" /> My Waitlist
      </h2>
      <p className="text-sm text-slate-500 mb-5">
        You will be notified by email when a slot opens with any of these doctors.
      </p>

      {!waitlist?.length ? (
        <div className="text-center py-10">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-7 h-7 text-slate-400" />
          </div>
          <p className="text-slate-500 font-medium">No active waitlists</p>
          <p className="text-slate-400 text-sm mt-1">
            When a doctor has no available slots, you can join their waitlist from the Find Doctors tab.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {waitlist.map((entry: any) => (
            <div key={entry.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-100 rounded-xl flex items-center justify-center font-bold text-brand-600">
                  {entry.doctorProfile?.user?.fullName?.charAt(0) ?? "D"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    Dr. {entry.doctorProfile?.user?.fullName}
                  </p>
                  <p className="text-xs text-slate-500">
                    {entry.doctorProfile?.specialty ?? "General Practice"}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Joined {format(new Date(entry.createdAt), "MMM d, yyyy")}
                    {entry.expiresAt && ` · Expires ${format(new Date(entry.expiresAt), "MMM d")}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  entry.status === "WAITING" ? "bg-amber-50 text-amber-700" :
                  entry.status === "NOTIFIED" ? "bg-green-50 text-green-700" :
                  "bg-slate-100 text-slate-500"
                }`}>
                  {entry.status === "NOTIFIED" ? "✓ Slot Available!" : "Waiting"}
                </span>
                <button
                  onClick={() => leaveMutation.mutate(entry.doctorProfileId)}
                  disabled={leaveMutation.isPending}
                  className="text-xs text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
                >
                  Leave
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}