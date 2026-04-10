"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightLeft, Plus, CheckCircle, X, Clock,
  Loader2, Stethoscope,
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { format } from "date-fns";

const SPECIALITIES = [
  "Cardiology","Dermatology","Endocrinology","ENT","Gastroenterology",
  "General Surgery","Gynaecology","Nephrology","Neurology","Oncology",
  "Ophthalmology","Orthopaedics","Paediatrics","Psychiatry",
  "Pulmonology","Rheumatology","Urology","Other",
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  REQUESTED:  { label: "Awaiting Approval", color: "bg-amber-50 text-amber-700",   icon: Clock },
  PENDING:    { label: "Pending",           color: "bg-blue-50 text-blue-700",     icon: Clock },
  ACCEPTED:   { label: "Accepted",          color: "bg-teal-50 text-teal-700",     icon: CheckCircle },
  BOOKED:     { label: "Booked",            color: "bg-purple-50 text-purple-700", icon: CheckCircle },
  COMPLETED:  { label: "Completed",         color: "bg-green-50 text-green-700",   icon: CheckCircle },
  CANCELLED:  { label: "Cancelled",         color: "bg-slate-100 text-slate-500",  icon: X },
  REJECTED:   { label: "Rejected",          color: "bg-red-50 text-red-600",       icon: X },
};

const URGENCY_COLOR: Record<string, string> = {
  ROUTINE:   "bg-slate-100 text-slate-600",
  URGENT:    "bg-orange-50 text-orange-700",
  EMERGENCY: "bg-red-50 text-red-700",
};

export function ReferralPanel() {
  const [showRequest, setShowRequest] = useState(false);
  const queryClient = useQueryClient();

  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ["patient-referrals"],
    queryFn: () => apiClient.get("/referrals/my").then(r => r.data),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-brand-600" /> Referrals
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Specialist referrals from your doctor</p>
        </div>
        <button onClick={() => setShowRequest(true)}
          className="btn-primary text-sm flex items-center gap-1.5 touch-manipulation">
          <Plus className="w-4 h-4" /> Request referral
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
        </div>
      ) : referrals.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          <Stethoscope className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium text-sm">No referrals yet</p>
          <p className="text-slate-400 text-xs mt-1">Your doctor will send referrals here, or you can request one</p>
        </div>
      ) : (
        <div className="space-y-3">
          {referrals.map((ref: any) => {
            const cfg = STATUS_CONFIG[ref.status] ?? STATUS_CONFIG.PENDING;
            const Icon = cfg.icon;
            return (
              <div key={ref.id} className="bg-white border border-slate-100 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-lg">
                        {ref.referralCode}
                      </code>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${URGENCY_COLOR[ref.urgency]}`}>
                        {ref.urgency}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-900">{ref.speciality}</p>
                    <p className="text-sm text-slate-600 mt-0.5">{ref.reason}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      From Dr. {ref.referringDoctor?.user?.fullName}
                      {ref.specialist && ` â†’ Dr. ${ref.specialist.user?.fullName}`}
                      {" Â· "}{format(new Date(ref.createdAt), "MMM d, yyyy")}
                    </p>
                    {ref.notes && (
                      <p className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 mt-2">{ref.notes}</p>
                    )}
                  </div>
                  <span className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full shrink-0 ${cfg.color}`}>
                    <Icon className="w-3 h-3" />{cfg.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showRequest && (
        <RequestReferralModal
          onClose={() => setShowRequest(false)}
          onSubmitted={() => {
            queryClient.invalidateQueries({ queryKey: ["patient-referrals"] });
            setShowRequest(false);
          }}
        />
      )}
    </div>
  );
}

function RequestReferralModal({ onClose, onSubmitted }: { onClose: () => void; onSubmitted: () => void }) {
  const [speciality, setSpeciality] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: () => apiClient.post("/referrals/request", { speciality, reason, notes: notes || undefined }),
    onSuccess: onSubmitted,
    onError: (e: any) => alert(e.response?.data?.message || "Failed to submit request"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-brand-600" /> Request a Referral
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 touch-manipulation">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            Your doctor will review and approve this request before it is processed.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Speciality needed *</label>
            <select value={speciality} onChange={e => setSpeciality(e.target.value)} className="input w-full">
              <option value="">Select speciality...</option>
              {SPECIALITIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Reason *</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              placeholder="Briefly describe why you need this referral..."
              className="input w-full resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Additional notes <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Any other relevant information..."
              className="input w-full resize-none" />
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-slate-100">
          <button onClick={() => mutation.mutate()}
            disabled={!speciality || !reason.trim() || mutation.isPending}
            className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 touch-manipulation">
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Submit request
          </button>
          <button onClick={onClose} className="btn-secondary touch-manipulation">Cancel</button>
        </div>
      </div>
    </div>
  );
}
