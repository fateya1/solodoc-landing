"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Loader2, CheckCircle, CalendarPlus } from "lucide-react";
import { apiClient } from "@/lib/api";
import { format } from "date-fns";

interface FollowUpModalProps {
  appointmentId: string;
  patientName: string;
  onClose: () => void;
}

export function FollowUpModal({ appointmentId, patientName, onClose }: FollowUpModalProps) {
  const queryClient = useQueryClient();
  const [selectedSlotId, setSelectedSlotId] = useState("");
  const [reason, setReason] = useState("Follow-up appointment");
  const [saved, setSaved] = useState(false);

  // Get available slots for this doctor
  const { data: slots, isLoading } = useQuery({
    queryKey: ["follow-up-slots"],
    queryFn: async () => {
      const profile = await apiClient.get("/doctor/profile").then(r => r.data);
      const from = encodeURIComponent(new Date().toISOString());
      const to = encodeURIComponent(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString());
      return apiClient.get(`/availability/slots?doctorId=${profile.id}&from=${from}&to=${to}`)
        .then(r => r.data.filter((s: any) => s.isAvailable && !s.appointment));
    },
  });

  const followUpMutation = useMutation({
    mutationFn: () => apiClient.post(`/appointments/${appointmentId}/follow-up`, {
      slotId: selectedSlotId,
      reason,
    }),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["doctor-appointments"] });
      setTimeout(onClose, 1500);
    },
    onError: (err: any) => alert(err.response?.data?.message || "Failed to schedule follow-up."),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
              <CalendarPlus className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">Schedule Follow-up</h2>
              <p className="text-sm text-slate-500">Patient: {patientName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {saved ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <CheckCircle className="w-12 h-12 text-green-500" />
            <p className="font-semibold text-slate-900">Follow-up scheduled!</p>
            <p className="text-slate-500 text-sm">Patient has been notified.</p>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Reason</label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="input w-full"
                placeholder="Reason for follow-up"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Select Available Slot</label>
              {isLoading ? (
                <div className="flex items-center gap-2 py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                  <span className="text-sm text-slate-500">Loading slots...</span>
                </div>
              ) : !slots?.length ? (
                <p className="text-sm text-slate-400 bg-slate-50 rounded-xl p-4 text-center">
                  No available slots. Please add slots from the Availability tab first.
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {slots.map((slot: any) => (
                    <button
                      key={slot.id}
                      onClick={() => setSelectedSlotId(slot.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm ${
                        selectedSlotId === slot.id
                          ? "border-brand-500 bg-brand-50 text-brand-700"
                          : "border-slate-200 hover:border-slate-300 text-slate-700"
                      }`}
                    >
                      {format(new Date(slot.startTime), "EEEE, MMM d yyyy h:mm a")}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => followUpMutation.mutate()}
                disabled={!selectedSlotId || !reason || followUpMutation.isPending}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {followUpMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Schedule Follow-up
              </button>
              <button onClick={onClose} className="btn-secondary px-5">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}