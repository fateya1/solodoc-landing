"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRightLeft, Plus, CheckCircle, X, Clock,
  Loader2, User, Stethoscope, CalendarPlus, AlertTriangle,
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
  REQUESTED:  { label: "Needs Approval", color: "bg-amber-50 text-amber-700",   icon: AlertTriangle },
  PENDING:    { label: "Pending",        color: "bg-blue-50 text-blue-700",     icon: Clock },
  ACCEPTED:   { label: "Accepted",       color: "bg-teal-50 text-teal-700",     icon: CheckCircle },
  BOOKED:     { label: "Booked",         color: "bg-purple-50 text-purple-700", icon: CheckCircle },
  COMPLETED:  { label: "Completed",      color: "bg-green-50 text-green-700",   icon: CheckCircle },
  CANCELLED:  { label: "Cancelled",      color: "bg-slate-100 text-slate-500",  icon: X },
  REJECTED:   { label: "Rejected",       color: "bg-red-50 text-red-600",       icon: X },
};

export function DoctorReferralPanel({ patients }: { patients: { id: string; user: { fullName: string } }[] }) {
  const [view, setView] = useState<"outgoing" | "requests">("outgoing");
  const [showCreate, setShowCreate] = useState(false);
  const [bookingReferral, setBookingReferral] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: referrals = [], isLoading } = useQuery({
    queryKey: ["doctor-referrals"],
    queryFn: () => apiClient.get("/referrals/doctor").then(r => r.data),
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, specialistId }: { id: string; specialistId?: string }) =>
      apiClient.put(`/referrals/${id}/approve`, { specialistId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["doctor-referrals"] }),
    onError: (e: any) => alert(e.response?.data?.message || "Failed to approve"),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => apiClient.put(`/referrals/${id}/reject`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["doctor-referrals"] }),
    onError: (e: any) => alert(e.response?.data?.message || "Failed to reject"),
  });

  const pending  = referrals.filter((r: any) => r.status === "REQUESTED");
  const outgoing = referrals.filter((r: any) => r.status !== "REQUESTED");
  const displayed = view === "requests" ? pending : outgoing;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-brand-600" /> Referrals
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Manage patient referrals to specialists</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="btn-primary text-sm flex items-center gap-1.5 touch-manipulation">
          <Plus className="w-4 h-4" /> New referral
        </button>
      </div>

      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(["outgoing","requests"] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all touch-manipulation relative capitalize ${
              view === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}>
            {v === "outgoing" ? `Outgoing (${outgoing.length})` : `Requests (${pending.length})`}
            {v === "requests" && pending.length > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {pending.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-brand-600" /></div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          <Stethoscope className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium text-sm">
            {view === "requests" ? "No pending requests" : "No referrals yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((ref: any) => {
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
                      {ref.requestedByPatient && (
                        <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-medium">
                          Patient request
                        </span>
                      )}
                    </div>
                    <p className="font-semibold text-slate-900">{ref.speciality}</p>
                    <p className="text-sm text-slate-600 mt-0.5">{ref.reason}</p>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {ref.patient?.user?.fullName}
                      {ref.specialist && ` â†’ Dr. ${ref.specialist.user?.fullName}`}
                      {" Â· "}{format(new Date(ref.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <span className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full shrink-0 ${cfg.color}`}>
                    <Icon className="w-3 h-3" />{cfg.label}
                  </span>
                </div>
                <div className="flex gap-2 mt-3">
                  {ref.status === "REQUESTED" && (
                    <>
                      <button onClick={() => approveMutation.mutate({ id: ref.id })}
                        disabled={approveMutation.isPending}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 touch-manipulation disabled:opacity-50">
                        <CheckCircle className="w-3.5 h-3.5" /> Approve
                      </button>
                      <button
                        onClick={() => { if (confirm("Reject this referral request?")) rejectMutation.mutate(ref.id); }}
                        disabled={rejectMutation.isPending}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 touch-manipulation disabled:opacity-50">
                        <X className="w-3.5 h-3.5" /> Reject
                      </button>
                    </>
                  )}
                  {["PENDING","ACCEPTED"].includes(ref.status) && (
                    <button onClick={() => setBookingReferral(ref)}
                      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-brand-50 text-brand-700 rounded-lg hover:bg-brand-100 touch-manipulation">
                      <CalendarPlus className="w-3.5 h-3.5" /> Book appointment
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <CreateReferralModal patients={patients}
          onClose={() => setShowCreate(false)}
          onCreated={() => { queryClient.invalidateQueries({ queryKey: ["doctor-referrals"] }); setShowCreate(false); }} />
      )}
      {bookingReferral && (
        <BookAppointmentModal referral={bookingReferral}
          onClose={() => setBookingReferral(null)}
          onBooked={() => { queryClient.invalidateQueries({ queryKey: ["doctor-referrals"] }); setBookingReferral(null); }} />
      )}
    </div>
  );
}

function CreateReferralModal({ patients, onClose, onCreated }:
  { patients: { id: string; user: { fullName: string } }[]; onClose: () => void; onCreated: () => void }) {
  const [patientId, setPatientId]     = useState(patients[0]?.id ?? "");
  const [speciality, setSpeciality]   = useState("");
  const [specialistId, setSpecialistId] = useState("");
  const [reason, setReason]           = useState("");
  const [notes, setNotes]             = useState("");
  const [urgency, setUrgency]         = useState("ROUTINE");

  const { data: specialists = [] } = useQuery({
    queryKey: ["specialists", speciality],
    queryFn: () => apiClient.get(`/referrals/doctors${speciality ? `?speciality=${speciality}` : ""}`).then(r => r.data),
    enabled: !!speciality,
  });

  const mutation = useMutation({
    mutationFn: () => apiClient.post("/referrals", {
      patientId, speciality, specialistId: specialistId || undefined,
      reason, notes: notes || undefined, urgency,
    }),
    onSuccess: onCreated,
    onError: (e: any) => alert(e.response?.data?.message || "Failed to create referral"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-brand-600" /> Create Referral
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 touch-manipulation"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Patient *</label>
            <select value={patientId} onChange={e => setPatientId(e.target.value)} className="input w-full">
              {patients.map(p => <option key={p.id} value={p.id}>{p.user.fullName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Speciality *</label>
            <select value={speciality} onChange={e => { setSpeciality(e.target.value); setSpecialistId(""); }} className="input w-full">
              <option value="">Select speciality...</option>
              {SPECIALITIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          {speciality && specialists.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Specific specialist <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <select value={specialistId} onChange={e => setSpecialistId(e.target.value)} className="input w-full">
                <option value="">Any available specialist</option>
                {specialists.map((d: any) => <option key={d.id} value={d.id}>Dr. {d.user.fullName}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Urgency</label>
            <div className="flex gap-2">
              {["ROUTINE","URGENT","EMERGENCY"].map(u => (
                <button key={u} onClick={() => setUrgency(u)}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-all touch-manipulation ${
                    urgency === u
                      ? u === "EMERGENCY" ? "bg-red-500 text-white border-red-500"
                        : u === "URGENT" ? "bg-orange-500 text-white border-orange-500"
                        : "bg-brand-600 text-white border-brand-600"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}>
                  {u.charAt(0) + u.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Clinical reason *</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              placeholder="Clinical indication for referral..." className="input w-full resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Notes <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              placeholder="Additional clinical notes..." className="input w-full resize-none" />
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-slate-100">
          <button onClick={() => mutation.mutate()}
            disabled={!patientId || !speciality || !reason.trim() || mutation.isPending}
            className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 touch-manipulation">
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Send referral
          </button>
          <button onClick={onClose} className="btn-secondary touch-manipulation">Cancel</button>
        </div>
      </div>
    </div>
  );
}

function BookAppointmentModal({ referral, onClose, onBooked }:
  { referral: any; onClose: () => void; onBooked: () => void }) {
  const [slotId, setSlotId] = useState("");

  const { data: slots = [], isLoading } = useQuery({
    queryKey: ["slots-for-referral", referral.specialistId],
    queryFn: () => apiClient.get(
      `/availability${referral.specialistId ? `?doctorId=${referral.specialistId}` : ""}`
    ).then(r => r.data.filter((s: any) => s.isAvailable)),
  });

  const mutation = useMutation({
    mutationFn: () => apiClient.post("/referrals/book", { referralId: referral.id, availabilitySlotId: slotId }),
    onSuccess: onBooked,
    onError: (e: any) => alert(e.response?.data?.message || "Booking failed"),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <CalendarPlus className="w-4 h-4 text-brand-600" /> Book Specialist Appointment
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 touch-manipulation"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 text-sm">
            <p className="font-medium text-brand-800">{referral.patient?.user?.fullName}</p>
            <p className="text-brand-600 text-xs mt-0.5">{referral.speciality} â€” {referral.referralCode}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Available slot *</label>
            {isLoading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-brand-600" /></div>
            ) : slots.length === 0 ? (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                No available slots found for this specialist.
              </p>
            ) : (
              <select value={slotId} onChange={e => setSlotId(e.target.value)} className="input w-full">
                <option value="">Select a slot...</option>
                {slots.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    Dr. {s.doctor?.user?.fullName} â€” {format(new Date(s.startTime), "EEE MMM d, yyyy h:mm a")}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-slate-100">
          <button onClick={() => mutation.mutate()} disabled={!slotId || mutation.isPending}
            className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 touch-manipulation">
            {mutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirm booking
          </button>
          <button onClick={onClose} className="btn-secondary touch-manipulation">Cancel</button>
        </div>
      </div>
    </div>
  );
}
