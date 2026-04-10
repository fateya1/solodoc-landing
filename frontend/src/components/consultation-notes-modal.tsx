"use client";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, Loader2, CheckCircle, ClipboardList } from "lucide-react";
import { apiClient } from "@/lib/api";

interface ConsultationNotesModalProps {
  appointmentId: string;
  patientName: string;
  onClose: () => void;
}

export function ConsultationNotesModal({ appointmentId, patientName, onClose }: ConsultationNotesModalProps) {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const { data: existing, isLoading } = useQuery({
    queryKey: ["consultation-note", appointmentId],
    queryFn: () => apiClient.get(`/medical-records/notes/${appointmentId}`).then(r => r.data),
    retry: false,
  });

  const [subjective, setSubjective] = useState("");
  const [objective, setObjective] = useState("");
  const [assessment, setAssessment] = useState("");
  const [plan, setPlan] = useState("");
  const [privateNotes, setPrivateNotes] = useState("");

  // Populate fields when existing note loads
  useState(() => {
    if (existing) {
      setSubjective(existing.subjective ?? "");
      setObjective(existing.objective ?? "");
      setAssessment(existing.assessment ?? "");
      setPlan(existing.plan ?? "");
      setPrivateNotes(existing.privateNotes ?? "");
    }
  });

  const saveMutation = useMutation({
    mutationFn: () => apiClient.post("/medical-records/notes", {
      appointmentId,
      subjective: subjective || undefined,
      objective: objective || undefined,
      assessment: assessment || undefined,
      plan: plan || undefined,
      privateNotes: privateNotes || undefined,
    }),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["doctor-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["consultation-note", appointmentId] });
      setTimeout(onClose, 1500);
    },
    onError: (err: any) => alert(err.response?.data?.message || "Failed to save notes."),
  });

  const fields = [
    { key: "subjective", label: "S — Subjective", placeholder: "Patient's chief complaint, symptoms, history as described by the patient...", value: subjective, setter: setSubjective, color: "border-l-blue-400" },
    { key: "objective", label: "O — Objective", placeholder: "Physical examination findings, vital signs, test results...", value: objective, setter: setObjective, color: "border-l-green-400" },
    { key: "assessment", label: "A — Assessment", placeholder: "Diagnosis or differential diagnoses based on subjective and objective data...", value: assessment, setter: setAssessment, color: "border-l-amber-400" },
    { key: "plan", label: "P — Plan", placeholder: "Treatment plan, medications prescribed, follow-up instructions, referrals...", value: plan, setter: setPlan, color: "border-l-purple-400" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl my-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
              <ClipboardList className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">SOAP Notes</h2>
              <p className="text-sm text-slate-500">Patient: {patientName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {saved ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16">
            <CheckCircle className="w-14 h-14 text-green-500" />
            <p className="font-semibold text-slate-900 text-lg">Notes saved!</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {fields.map(({ key, label, placeholder, value, setter, color }) => (
              <div key={key} className={`border-l-4 ${color} pl-4`}>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
                <textarea
                  value={value}
                  onChange={(e) => setter(e.target.value)}
                  placeholder={placeholder}
                  rows={3}
                  className="input w-full resize-none text-sm"
                />
              </div>
            ))}

            <div className="border-l-4 border-l-red-300 pl-4">
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Private Notes
                <span className="ml-2 text-xs font-normal text-slate-400">(not visible to patient)</span>
              </label>
              <textarea
                value={privateNotes}
                onChange={(e) => setPrivateNotes(e.target.value)}
                placeholder="Internal notes, reminders, concerns not shared with patient..."
                rows={2}
                className="input w-full resize-none text-sm"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || (!subjective && !objective && !assessment && !plan)}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {existing ? "Update Notes" : "Save Notes"}
              </button>
              <button onClick={onClose} className="btn-secondary px-6">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}