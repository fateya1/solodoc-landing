"use client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, FileText, ClipboardList, Star, Calendar } from "lucide-react";
import { apiClient } from "@/lib/api";
import { format } from "date-fns";

export function MedicalHistory() {
  const { data, isLoading } = useQuery({
    queryKey: ["medical-history"],
    queryFn: () => apiClient.get("/medical-records/history/me").then(r => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    );
  }

  if (!data?.appointments?.length) {
    return (
      <div className="card text-center py-12">
        <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-400">No medical history yet.</p>
        <p className="text-slate-400 text-sm mt-1">Your consultation history will appear here.</p>
      </div>
    );
  }

  const completed = data.appointments.filter((a: any) => a.status === "COMPLETED");

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-2">
        {[
          { label: "Total visits", value: data.totalAppointments },
          { label: "Completed", value: data.completedAppointments },
          { label: "With records", value: completed.filter((a: any) => a.consultationNote).length },
        ].map(({ label, value }) => (
          <div key={label} className="card p-4">
            <p className="text-2xl font-bold text-slate-900">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="space-y-3">
        {data.appointments.map((appt: any) => (
          <div key={appt.id} className="card p-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
              <div>
                <p className="font-semibold text-slate-900">
                  Dr. {appt.availabilitySlot?.doctor?.user?.fullName ?? "Unknown"}
                </p>
                <p className="text-sm text-slate-500">
                  {appt.availabilitySlot?.startTime
                    ? format(new Date(appt.availabilitySlot.startTime), "EEEE, MMM d yyyy h:mm a")
                    : "N/A"}
                </p>
                {appt.reason && <p className="text-xs text-slate-400 mt-0.5">{appt.reason}</p>}
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full w-fit ${
                appt.status === "COMPLETED" ? "bg-blue-50 text-blue-700" :
                appt.status === "CONFIRMED" ? "bg-green-50 text-green-700" :
                appt.status === "CANCELLED" ? "bg-red-50 text-red-600" :
                "bg-slate-100 text-slate-500"
              }`}>{appt.status}</span>
            </div>

            {/* Consultation notes */}
            {appt.consultationNote && (
              <div className="bg-blue-50 rounded-xl p-4 mb-3">
                <div className="flex items-center gap-2 mb-3">
                  <ClipboardList className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-blue-800">Consultation Notes</span>
                </div>
                <div className="space-y-2">
                  {appt.consultationNote.subjective && (
                    <div>
                      <span className="text-xs font-semibold text-blue-700">Subjective: </span>
                      <span className="text-xs text-slate-700">{appt.consultationNote.subjective}</span>
                    </div>
                  )}
                  {appt.consultationNote.objective && (
                    <div>
                      <span className="text-xs font-semibold text-blue-700">Objective: </span>
                      <span className="text-xs text-slate-700">{appt.consultationNote.objective}</span>
                    </div>
                  )}
                  {appt.consultationNote.assessment && (
                    <div>
                      <span className="text-xs font-semibold text-blue-700">Assessment: </span>
                      <span className="text-xs text-slate-700">{appt.consultationNote.assessment}</span>
                    </div>
                  )}
                  {appt.consultationNote.plan && (
                    <div>
                      <span className="text-xs font-semibold text-blue-700">Plan: </span>
                      <span className="text-xs text-slate-700">{appt.consultationNote.plan}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Prescription summary */}
            {appt.prescription && (
              <div className="bg-teal-50 rounded-xl p-4 mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-teal-600" />
                  <span className="text-sm font-semibold text-teal-800">Prescription</span>
                  {appt.prescription.diagnosis && (
                    <span className="text-xs text-teal-600">— {appt.prescription.diagnosis}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(appt.prescription.medications) &&
                    appt.prescription.medications.map((med: any, i: number) => (
                      <span key={i} className="text-xs bg-white text-teal-700 px-2.5 py-1 rounded-lg border border-teal-200">
                        {med.name} {med.dosage}
                      </span>
                    ))
                  }
                </div>
              </div>
            )}

            {/* Review */}
            {appt.review && (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>You rated this {appt.review.rating}/5</span>
                {appt.review.comment && <span>— {appt.review.comment}</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}