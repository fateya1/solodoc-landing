"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Plus, Trash2, Loader2, CheckCircle, FileText } from "lucide-react";
import { apiClient } from "@/lib/api";

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface PrescriptionModalProps {
  appointmentId: string;
  patientName: string;
  existingPrescription?: any;
  onClose: () => void;
}

const emptyMed = (): Medication => ({
  name: "", dosage: "", frequency: "", duration: "", instructions: "",
});

export function PrescriptionModal({ appointmentId, patientName, existingPrescription, onClose }: PrescriptionModalProps) {
  const queryClient = useQueryClient();
  const [medications, setMedications] = useState<Medication[]>(
    existingPrescription?.medications ?? [emptyMed()]
  );
  const [diagnosis, setDiagnosis] = useState(existingPrescription?.diagnosis ?? "");
  const [notes, setNotes] = useState(existingPrescription?.notes ?? "");
  const [validUntil, setValidUntil] = useState(
    existingPrescription?.validUntil
      ? new Date(existingPrescription.validUntil).toISOString().split("T")[0]
      : ""
  );
  const [saved, setSaved] = useState(false);

  const saveMutation = useMutation({
    mutationFn: () => apiClient.post("/prescriptions", {
      appointmentId,
      medications: medications.filter(m => m.name.trim()),
      diagnosis: diagnosis || undefined,
      notes: notes || undefined,
      validUntil: validUntil || undefined,
    }),
    onSuccess: () => {
      setSaved(true);
      queryClient.invalidateQueries({ queryKey: ["doctor-appointments"] });
      setTimeout(onClose, 1500);
    },
    onError: (err: any) => alert(err.response?.data?.message || "Failed to save prescription."),
  });

  const updateMed = (idx: number, field: keyof Medication, value: string) => {
    setMedications(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const addMed = () => setMedications(prev => [...prev, emptyMed()]);
  const removeMed = (idx: number) => setMedications(prev => prev.filter((_, i) => i !== idx));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-50 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">
                {existingPrescription ? "Edit Prescription" : "Write Prescription"}
              </h2>
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
            <p className="font-semibold text-slate-900 text-lg">Prescription saved!</p>
            <p className="text-slate-500 text-sm">The patient can now download it.</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Diagnosis */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Diagnosis</label>
              <input
                value={diagnosis}
                onChange={(e) => setDiagnosis(e.target.value)}
                placeholder="e.g. Acute upper respiratory infection"
                className="input w-full"
              />
            </div>

            {/* Medications */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-semibold text-slate-700">Medications</label>
                <button onClick={addMed} className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium">
                  <Plus className="w-3.5 h-3.5" /> Add medication
                </button>
              </div>
              <div className="space-y-4">
                {medications.map((med, idx) => (
                  <div key={idx} className="bg-slate-50 rounded-xl p-4 relative">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-slate-500">Medication {idx + 1}</span>
                      {medications.length > 1 && (
                        <button onClick={() => removeMed(idx)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Drug Name *</label>
                        <input value={med.name} onChange={(e) => updateMed(idx, "name", e.target.value)}
                          placeholder="e.g. Amoxicillin" className="input w-full text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Dosage *</label>
                        <input value={med.dosage} onChange={(e) => updateMed(idx, "dosage", e.target.value)}
                          placeholder="e.g. 500mg" className="input w-full text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Frequency *</label>
                        <select value={med.frequency} onChange={(e) => updateMed(idx, "frequency", e.target.value)}
                          className="input w-full text-sm">
                          <option value="">Select frequency</option>
                          <option>Once daily</option>
                          <option>Twice daily</option>
                          <option>Three times daily</option>
                          <option>Four times daily</option>
                          <option>Every 4 hours</option>
                          <option>Every 6 hours</option>
                          <option>Every 8 hours</option>
                          <option>Every 12 hours</option>
                          <option>As needed (PRN)</option>
                          <option>At bedtime</option>
                          <option>Once weekly</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Duration *</label>
                        <select value={med.duration} onChange={(e) => updateMed(idx, "duration", e.target.value)}
                          className="input w-full text-sm">
                          <option value="">Select duration</option>
                          <option>3 days</option>
                          <option>5 days</option>
                          <option>7 days</option>
                          <option>10 days</option>
                          <option>14 days</option>
                          <option>21 days</option>
                          <option>1 month</option>
                          <option>2 months</option>
                          <option>3 months</option>
                          <option>6 months</option>
                          <option>Ongoing</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs text-slate-500 mb-1">Special Instructions</label>
                        <input value={med.instructions} onChange={(e) => updateMed(idx, "instructions", e.target.value)}
                          placeholder="e.g. Take with food, avoid alcohol" className="input w-full text-sm" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes and valid until */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Additional Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Follow-up instructions, lifestyle advice..."
                  rows={3} className="input w-full resize-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Valid Until</label>
                <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="input w-full" />
                <p className="text-xs text-slate-400 mt-1">Leave blank for no expiry</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => saveMutation.mutate()}
                disabled={medications.every(m => !m.name.trim()) || saveMutation.isPending}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {existingPrescription ? "Update Prescription" : "Save Prescription"}
              </button>
              <button onClick={onClose} className="btn-secondary px-6">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}