"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  X, Loader2, CheckCircle, ChevronRight, ChevronLeft,
  Pill, AlertTriangle, ClipboardList, HeartPulse, Plus, Trash2
} from "lucide-react";
import { apiClient } from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────────────────
export interface IntakeFormData {
  symptoms: string[];
  symptomNotes: string;
  symptomDuration: string;
  allergies: string[];
  allergyNotes: string;
  medications: MedEntry[];
  bloodPressure: string;
  weight: string;
  additionalNotes: string;
}

interface MedEntry { name: string; dosage: string; frequency: string }

interface Props {
  appointmentId: string;
  doctorName: string;
  appointmentDate: string;
  existingForm?: Partial<IntakeFormData>;
  profileAllergies?: string[];
  onClose: () => void;
  onSubmitted: () => void;
}

// ── Symptom options (Kenya-relevant) ─────────────────────────────────────────
const SYMPTOM_OPTIONS = [
  "Fever / High temperature",
  "Headache",
  "Cough",
  "Sore throat",
  "Shortness of breath",
  "Chest pain",
  "Stomach / Abdominal pain",
  "Nausea",
  "Vomiting",
  "Diarrhea",
  "Fatigue / Weakness",
  "Dizziness",
  "Body / Joint aches",
  "Skin rash",
  "Loss of appetite",
  "Swelling",
  "Back pain",
  "Frequent urination",
  "Eye problems",
  "Ear pain",
];

const DURATION_OPTIONS = ["Today only", "1–2 days", "3–5 days", "1 week", "2 weeks", "More than 2 weeks", "Ongoing / Chronic"];
const FREQUENCY_OPTIONS = ["Once daily", "Twice daily", "Three times daily", "As needed", "Weekly", "Other"];

const STEPS = [
  { label: "Symptoms", icon: HeartPulse },
  { label: "Allergies & Meds", icon: Pill },
  { label: "Review & Submit", icon: ClipboardList },
];

// ── Main component ────────────────────────────────────────────────────────────
export function IntakeFormModal({
  appointmentId, doctorName, appointmentDate,
  existingForm, profileAllergies = [],
  onClose, onSubmitted,
}: Props) {
  const isEdit = !!existingForm;
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  // Form state
  const [symptoms, setSymptoms] = useState<string[]>(existingForm?.symptoms ?? []);
  const [symptomNotes, setSymptomNotes] = useState(existingForm?.symptomNotes ?? "");
  const [symptomDuration, setSymptomDuration] = useState(existingForm?.symptomDuration ?? "");
  const [allergies, setAllergies] = useState<string[]>(
    existingForm?.allergies ?? profileAllergies
  );
  const [allergyInput, setAllergyInput] = useState("");
  const [allergyNotes, setAllergyNotes] = useState(existingForm?.allergyNotes ?? "");
  const [medications, setMedications] = useState<MedEntry[]>(
    existingForm?.medications ?? [{ name: "", dosage: "", frequency: "" }]
  );
  const [bloodPressure, setBloodPressure] = useState(existingForm?.bloodPressure ?? "");
  const [weight, setWeight] = useState(existingForm?.weight ?? "");
  const [additionalNotes, setAdditionalNotes] = useState(existingForm?.additionalNotes ?? "");

  // ── Mutations ──────────────────────────────────────────────────────────────
  const submitMutation = useMutation({
    mutationFn: () =>
      apiClient.post(`/intake-forms/appointment/${appointmentId}`, {
        symptoms,
        symptomNotes: symptomNotes || undefined,
        symptomDuration: symptomDuration || undefined,
        allergies,
        allergyNotes: allergyNotes || undefined,
        medications: medications.filter((m) => m.name.trim()),
        bloodPressure: bloodPressure || undefined,
        weight: weight || undefined,
        additionalNotes: additionalNotes || undefined,
      }),
    onSuccess: () => {
      setSubmitted(true);
      setTimeout(() => { onSubmitted(); onClose(); }, 2000);
    },
    onError: (err: any) => alert(err.response?.data?.message || "Failed to submit form. Please try again."),
  });

  // ── Symptom helpers ────────────────────────────────────────────────────────
  function toggleSymptom(s: string) {
    setSymptoms((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  // ── Allergy helpers ────────────────────────────────────────────────────────
  function addAllergy() {
    const val = allergyInput.trim();
    if (val && !allergies.includes(val)) setAllergies((prev) => [...prev, val]);
    setAllergyInput("");
  }
  function removeAllergy(a: string) { setAllergies((prev) => prev.filter((x) => x !== a)); }

  // ── Medication helpers ─────────────────────────────────────────────────────
  function addMed() { setMedications((prev) => [...prev, { name: "", dosage: "", frequency: "" }]); }
  function removeMed(i: number) { setMedications((prev) => prev.filter((_, idx) => idx !== i)); }
  function updateMed(i: number, field: keyof MedEntry, value: string) {
    setMedications((prev) => prev.map((m, idx) => idx === i ? { ...m, [field]: value } : m));
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-brand-600" />
              {isEdit ? "Edit Intake Form" : "Patient Intake Form"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Dr. {doctorName} · {appointmentDate}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        {!submitted && (
          <div className="flex items-center gap-0 px-5 pt-4 pb-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const active = i === step;
              const done = i < step;
              return (
                <div key={s.label} className="flex items-center flex-1 last:flex-none">
                  <div className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                    active ? "text-brand-600" : done ? "text-green-600" : "text-slate-400"
                  }`}>
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      active ? "bg-brand-600 text-white" : done ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400"
                    }`}>
                      {done ? <CheckCircle className="w-3.5 h-3.5" /> : <Icon className="w-3 h-3" />}
                    </div>
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-px mx-2 ${i < step ? "bg-green-300" : "bg-slate-100"}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {submitted ? (
            /* ── Success ── */
            <div className="text-center py-8">
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1">Form submitted!</h3>
              <p className="text-sm text-slate-500">
                Your doctor will review this before your appointment.
              </p>
            </div>
          ) : step === 0 ? (
            /* ── Step 1: Symptoms ── */
            <div className="space-y-5">
              <div>
                <p className="text-sm font-medium text-slate-700 mb-3">
                  What symptoms are you experiencing?{" "}
                  <span className="text-slate-400 font-normal">(select all that apply)</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {SYMPTOM_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSymptom(s)}
                      className={`text-xs px-3 py-2 rounded-lg border text-left transition-all touch-manipulation ${
                        symptoms.includes(s)
                          ? "bg-brand-50 border-brand-300 text-brand-700 font-medium"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {symptoms.includes(s) && <span className="mr-1">✓</span>}
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  How long have you had these symptoms?
                </label>
                <div className="flex flex-wrap gap-2">
                  {DURATION_OPTIONS.map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSymptomDuration(d)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-all touch-manipulation ${
                        symptomDuration === d
                          ? "bg-brand-600 text-white border-brand-600"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Describe your symptoms in more detail <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={symptomNotes}
                  onChange={(e) => setSymptomNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. The headache is worse in the morning and comes with light sensitivity..."
                  className="input w-full resize-none"
                />
              </div>
            </div>
          ) : step === 1 ? (
            /* ── Step 2: Allergies + Medications ── */
            <div className="space-y-6">
              {/* Allergies */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <p className="text-sm font-medium text-slate-700">Known allergies</p>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Pre-filled from your profile. Add or remove as needed.
                </p>
                <div className="flex gap-2 mb-3">
                  <input
                    value={allergyInput}
                    onChange={(e) => setAllergyInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addAllergy(); } }}
                    placeholder="Type allergy and press Enter"
                    className="input flex-1 text-sm"
                  />
                  <button onClick={addAllergy} className="btn-primary px-3 touch-manipulation">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 min-h-[32px]">
                  {allergies.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No allergies listed — add any if applicable</p>
                  ) : (
                    allergies.map((a) => (
                      <span key={a} className="flex items-center gap-1 text-xs bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-full">
                        {a}
                        <button onClick={() => removeAllergy(a)} className="hover:text-red-900 touch-manipulation">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
                <textarea
                  value={allergyNotes}
                  onChange={(e) => setAllergyNotes(e.target.value)}
                  rows={2}
                  placeholder="Any notes about your allergies or reactions... (optional)"
                  className="input w-full resize-none mt-3 text-sm"
                />
              </div>

              {/* Medications */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Pill className="w-4 h-4 text-blue-500" />
                    <p className="text-sm font-medium text-slate-700">Current medications</p>
                  </div>
                  <button onClick={addMed} className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 touch-manipulation">
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  List any medications, supplements, or vitamins you are currently taking.
                </p>
                <div className="space-y-3">
                  {medications.map((med, i) => (
                    <div key={i} className="bg-slate-50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-slate-500">Medication {i + 1}</p>
                        {medications.length > 1 && (
                          <button onClick={() => removeMed(i)} className="text-slate-400 hover:text-red-500 touch-manipulation">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          value={med.name}
                          onChange={(e) => updateMed(i, "name", e.target.value)}
                          placeholder="Medication name *"
                          className="input text-xs col-span-1 sm:col-span-1"
                        />
                        <input
                          value={med.dosage}
                          onChange={(e) => updateMed(i, "dosage", e.target.value)}
                          placeholder="Dosage (e.g. 500mg)"
                          className="input text-xs"
                        />
                        <select
                          value={med.frequency}
                          onChange={(e) => updateMed(i, "frequency", e.target.value)}
                          className="input text-xs"
                        >
                          <option value="">Frequency</option>
                          {FREQUENCY_OPTIONS.map((f) => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                  {medications.every((m) => !m.name.trim()) && (
                    <p className="text-xs text-center text-slate-400 italic py-2">
                      Not taking any medications — leave blank
                    </p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* ── Step 3: Additional + Review ── */
            <div className="space-y-5">
              {/* Vitals */}
              <div>
                <p className="text-sm font-medium text-slate-700 mb-3">
                  Vitals <span className="text-slate-400 font-normal">(optional — if you know them)</span>
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Blood pressure</label>
                    <input
                      value={bloodPressure}
                      onChange={(e) => setBloodPressure(e.target.value)}
                      placeholder="e.g. 120/80"
                      className="input w-full text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Weight (kg)</label>
                    <input
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      placeholder="e.g. 70"
                      className="input w-full text-sm"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Anything else your doctor should know? <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  rows={3}
                  placeholder="Recent surgeries, hospitalizations, family history, concerns..."
                  className="input w-full resize-none"
                />
              </div>

              {/* Summary */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-800">Summary</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                  <div>
                    <p className="text-slate-400">Symptoms</p>
                    <p className="text-slate-700 font-medium">
                      {symptoms.length > 0 ? `${symptoms.length} selected` : "None"}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Duration</p>
                    <p className="text-slate-700 font-medium">{symptomDuration || "Not specified"}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Allergies</p>
                    <p className="text-slate-700 font-medium">
                      {allergies.length > 0 ? allergies.join(", ") : "None listed"}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-400">Medications</p>
                    <p className="text-slate-700 font-medium">
                      {medications.filter((m) => m.name.trim()).length > 0
                        ? `${medications.filter((m) => m.name.trim()).length} listed`
                        : "None"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!submitted && (
          <div className="flex items-center justify-between p-5 border-t border-slate-100 gap-3">
            <button
              onClick={() => step === 0 ? onClose() : setStep((s) => s - 1)}
              className="btn-secondary flex items-center gap-1.5 touch-manipulation"
            >
              <ChevronLeft className="w-4 h-4" />
              {step === 0 ? "Close" : "Back"}
            </button>
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep((s) => s + 1)}
                className="btn-primary flex items-center gap-1.5 touch-manipulation"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 touch-manipulation"
              >
                {submitMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                {isEdit ? "Update form" : "Submit form"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
