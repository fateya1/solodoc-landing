"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { apiClient } from "@/lib/api";
import { Stethoscope, User, FileText, CreditCard, CheckCircle, Loader2 } from "lucide-react";

type Step = "PROFILE" | "DOCUMENTS" | "PAYMENT" | "COMPLETE";

const STEPS: { key: Step; label: string; icon: any }[] = [
  { key: "PROFILE", label: "Profile", icon: User },
  { key: "DOCUMENTS", label: "Documents", icon: FileText },
  { key: "PAYMENT", label: "Subscription", icon: CreditCard },
  { key: "COMPLETE", label: "Go Live", icon: CheckCircle },
];

const PLANS = [
  {
    key: "BASIC",
    label: "Basic",
    price: "KES 2,000/mo",
    features: ["Up to 50 slots/month", "Up to 100 patients", "Email notifications", "Basic support"],
    color: "border-slate-200",
    badge: "",
  },
  {
    key: "PRO",
    label: "Pro",
    price: "KES 5,000/mo",
    features: ["Up to 200 slots/month", "Up to 500 patients", "Email notifications", "Priority support", "Analytics"],
    color: "border-brand-500",
    badge: "Most Popular",
  },
  {
    key: "ENTERPRISE",
    label: "Enterprise",
    price: "KES 12,000/mo",
    features: ["Unlimited slots", "Unlimited patients", "All notifications", "Dedicated support", "Custom branding"],
    color: "border-purple-400",
    badge: "Best Value",
  },
];

export default function OnboardingPage() {
  const { user, token, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<Step>("PROFILE");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Profile step
  const [specialty, setSpecialty] = useState("");
  const [bio, setBio] = useState("");
  const [years, setYears] = useState("");
  const [fee, setFee] = useState("");

  // Documents step
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseDoc, setLicenseDoc] = useState("");

  // Payment step
  const [selectedPlan, setSelectedPlan] = useState("PRO");
  const [phone, setPhone] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const [simulating, setSimulating] = useState(false);

  useEffect(() => {
    if (!_hasHydrated) return;
    if (!token || user?.role !== "DOCTOR") { router.push("/auth/login"); return; }
    apiClient.get("/onboarding/status").then((r) => {
      if (r.data.isComplete) { router.push("/dashboard/doctor"); return; }
      setCurrentStep(r.data.currentStep as Step);
      const p = r.data.profile;
      if (p.specialty) setSpecialty(p.specialty);
      if (p.bio) setBio(p.bio);
      if (p.yearsOfExperience) setYears(String(p.yearsOfExperience));
      if (p.consultationFee) setFee(String(p.consultationFee));
      if (p.licenseNumber) setLicenseNumber(p.licenseNumber);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [_hasHydrated, token, user, router]);

  const stepIndex = STEPS.findIndex((s) => s.key === currentStep);

  const saveProfile = async () => {
    setError(""); setSaving(true);
    try {
      await apiClient.post("/onboarding/profile", {
        specialty: specialty || undefined,
        bio: bio || undefined,
        yearsOfExperience: years ? parseInt(years) : undefined,
        consultationFee: fee ? parseFloat(fee) : undefined,
      });
      setCurrentStep("DOCUMENTS");
    } catch (e: any) {
      setError(e.response?.data?.message || "Failed to save profile");
    } finally { setSaving(false); }
  };

  const saveDocuments = async () => {
    if (!licenseNumber) { setError("License number is required"); return; }
    setError(""); setSaving(true);
    try {
      await apiClient.post("/onboarding/documents", {
        licenseNumber,
        licenseDocument: licenseDoc || undefined,
      });
      setCurrentStep("PAYMENT");
    } catch (e: any) {
      setError(e.response?.data?.message || "Failed to save documents");
    } finally { setSaving(false); }
  };

  const initiatePayment = async () => {
    if (!phone) { setError("Phone number is required"); return; }
    setError(""); setSaving(true);
    try {
      const res = await apiClient.post("/subscription/initiate", {
        plan: selectedPlan,
        phoneNumber: phone,
      });
      setPaymentId(res.data.paymentId);
      setPaymentInitiated(true);
    } catch (e: any) {
      setError(e.response?.data?.message || "Failed to initiate payment");
    } finally { setSaving(false); }
  };

  const simulatePayment = async () => {
    if (!paymentId) return;
    setSimulating(true);
    try {
      await apiClient.post("/subscription/mpesa/simulate", { paymentId });
      await apiClient.post("/onboarding/complete-payment");
      setCurrentStep("COMPLETE");
    } catch (e: any) {
      setError(e.response?.data?.message || "Payment simulation failed");
    } finally { setSimulating(false); }
  };

  if (loading || !_hasHydrated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-teal-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <Stethoscope className="w-4 h-4 text-white" />
          </div>
          <span className="font-display font-bold text-lg">SoloDoc</span>
          <span className="text-sm text-slate-500 ml-2">Doctor Onboarding</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Step indicator */}
        <div className="flex items-center justify-between mb-10">
          {STEPS.map((step, i) => {
            const Icon = step.icon;
            const isActive = step.key === currentStep;
            const isDone = i < stepIndex;
            return (
              <div key={step.key} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    isDone ? "bg-green-500 border-green-500 text-white" :
                    isActive ? "bg-brand-600 border-brand-600 text-white" :
                    "bg-white border-slate-200 text-slate-400"
                  }`}>
                    {isDone ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`text-xs mt-1 font-medium ${isActive ? "text-brand-600" : isDone ? "text-green-600" : "text-slate-400"}`}>
                    {step.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 w-16 mx-2 mb-4 ${i < stepIndex ? "bg-green-400" : "bg-slate-200"}`} />
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-6">
            ⚠️ {error}
          </div>
        )}

        {/* PROFILE STEP */}
        {currentStep === "PROFILE" && (
          <div className="card">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Set up your profile</h2>
            <p className="text-slate-500 text-sm mb-6">Tell patients about yourself and your practice.</p>
            <div className="space-y-4">
              <div>
                <label className="label">Specialty</label>
                <input value={specialty} onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="e.g. General Practice, Cardiology" className="input" />
              </div>
              <div>
                <label className="label">Bio</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)}
                  placeholder="Brief description of your experience and approach..."
                  className="input min-h-[100px] resize-none" rows={4} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Years of Experience</label>
                  <input type="number" value={years} onChange={(e) => setYears(e.target.value)}
                    placeholder="e.g. 5" className="input" min="0" />
                </div>
                <div>
                  <label className="label">Consultation Fee (KES)</label>
                  <input type="number" value={fee} onChange={(e) => setFee(e.target.value)}
                    placeholder="e.g. 1500" className="input" min="0" />
                </div>
              </div>
            </div>
            <button onClick={saveProfile} disabled={saving}
              className="btn-primary w-full mt-6 flex items-center justify-center gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? "Saving..." : "Continue to Documents"}
            </button>
          </div>
        )}

        {/* DOCUMENTS STEP */}
        {currentStep === "DOCUMENTS" && (
          <div className="card">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Verify your credentials</h2>
            <p className="text-slate-500 text-sm mb-6">Your license will be reviewed by our admin team before you go live.</p>
            <div className="space-y-4">
              <div>
                <label className="label">Medical License Number <span className="text-red-500">*</span></label>
                <input value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)}
                  placeholder="e.g. KMP/12345/2020" className="input" />
              </div>
              <div>
                <label className="label">License Document URL <span className="text-slate-400 text-xs">(optional)</span></label>
                <input value={licenseDoc} onChange={(e) => setLicenseDoc(e.target.value)}
                  placeholder="Link to scanned license document" className="input" />
                <p className="text-xs text-slate-400 mt-1">You can upload to Google Drive and paste the shareable link.</p>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                <p className="text-sm text-amber-800">
                  📋 After submission, our admin team will verify your credentials within 24 hours. You will receive an email once approved.
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setCurrentStep("PROFILE")}
                className="btn-secondary flex-1">Back</button>
              <button onClick={saveDocuments} disabled={saving}
                className="btn-primary flex-1 flex items-center justify-center gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? "Saving..." : "Continue to Payment"}
              </button>
            </div>
          </div>
        )}

        {/* PAYMENT STEP */}
        {currentStep === "PAYMENT" && (
          <div className="card">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Choose your plan</h2>
            <p className="text-slate-500 text-sm mb-6">Select a subscription plan to activate your account.</p>

            <div className="grid grid-cols-3 gap-4 mb-6">
              {PLANS.map((plan) => (
                <button key={plan.key} onClick={() => setSelectedPlan(plan.key)}
                  className={`relative border-2 rounded-xl p-4 text-left transition-all ${
                    selectedPlan === plan.key ? plan.color + " bg-brand-50" : "border-slate-200 hover:border-slate-300"
                  }`}>
                  {plan.badge && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs bg-brand-600 text-white px-2 py-0.5 rounded-full whitespace-nowrap">
                      {plan.badge}
                    </span>
                  )}
                  <p className="font-bold text-slate-900">{plan.label}</p>
                  <p className="text-brand-600 font-semibold text-sm mt-1">{plan.price}</p>
                  <ul className="mt-3 space-y-1">
                    {plan.features.map((f) => (
                      <li key={f} className="text-xs text-slate-500 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-500 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>

            {!paymentInitiated ? (
              <div className="space-y-4">
                <div>
                  <label className="label">M-Pesa Phone Number</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 0712345678" className="input" />
                  <p className="text-xs text-slate-400 mt-1">You will receive an STK push to complete payment.</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setCurrentStep("DOCUMENTS")} className="btn-secondary flex-1">Back</button>
                  <button onClick={initiatePayment} disabled={saving}
                    className="btn-primary flex-1 flex items-center justify-center gap-2">
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    {saving ? "Initiating..." : "Pay with M-Pesa"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p className="text-sm text-green-800 font-medium">📱 STK Push sent!</p>
                  <p className="text-xs text-green-700 mt-1">Check your phone and enter your M-Pesa PIN to complete payment.</p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-2">Running in sandbox mode? Simulate the payment:</p>
                  <button onClick={simulatePayment} disabled={simulating}
                    className="btn-secondary w-full flex items-center justify-center gap-2 text-sm">
                    {simulating && <Loader2 className="w-4 h-4 animate-spin" />}
                    {simulating ? "Processing..." : "Simulate M-Pesa Payment (Sandbox)"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* COMPLETE STEP */}
        {currentStep === "COMPLETE" && (
          <div className="card text-center py-12">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">You are all set!</h2>
            <p className="text-slate-500 mb-2">Your account is active and your subscription is confirmed.</p>
            <p className="text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-8 inline-block">
              ⏳ Admin verification is pending. You will receive an email once your license is approved.
            </p>
            <button onClick={() => router.push("/dashboard/doctor")}
              className="btn-primary px-8 py-3 text-base">
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


