"use client";
import { useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield, Plus, Trash2, FileText, CheckCircle, Clock,
  AlertCircle, X, Loader2, Copy, Eye, EyeOff, CreditCard
} from "lucide-react";
import { apiClient } from "@/lib/api";
import { format } from "date-fns";

// ── Types ────────────────────────────────────────────────────────────────────
interface InsuranceCard {
  id: string;
  provider: string;
  memberNumber: string;
  groupNumber?: string;
  holderName: string;
  validFrom?: string;
  validUntil?: string;
  cardImageBase64?: string;
  isActive: boolean;
  createdAt: string;
  claims: { id: string; claimCode: string; status: string; createdAt: string }[];
}

interface InsuranceClaim {
  id: string;
  claimCode: string;
  status: string;
  diagnosisCode?: string;
  claimAmount?: number;
  approvedAmount?: number;
  notes?: string;
  submittedAt?: string;
  createdAt: string;
  insuranceCard: { provider: string; memberNumber: string };
  appointment: {
    availabilitySlot: {
      startTime: string;
      doctor: { user: { fullName: string } };
    };
  };
}

// ── Kenya insurance providers ────────────────────────────────────────────────
const KE_PROVIDERS = [
  "SHA (Social Health Authority)", "Jubilee Health Insurance", "AAR Insurance", "Britam Health",
  "CIC Insurance", "Madison Insurance", "Resolution Insurance",
  "UAP Old Mutual", "Kenindia Assurance", "APA Insurance", "Other",
];

const CLAIM_STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT:        { label: "Draft",        color: "bg-slate-100 text-slate-600",  icon: FileText },
  SUBMITTED:    { label: "Submitted",    color: "bg-blue-50 text-blue-700",     icon: Clock },
  UNDER_REVIEW: { label: "Under Review", color: "bg-amber-50 text-amber-700",   icon: AlertCircle },
  APPROVED:     { label: "Approved",     color: "bg-green-50 text-green-700",   icon: CheckCircle },
  REJECTED:     { label: "Rejected",     color: "bg-red-50 text-red-600",       icon: X },
  PAID:         { label: "Paid",         color: "bg-purple-50 text-purple-700", icon: CheckCircle },
};

// ── Main component ────────────────────────────────────────────────────────────
export function InsurancePanel() {
  const [view, setView] = useState<"cards" | "claims">("cards");
  const [showAddCard, setShowAddCard] = useState(false);
  const [showClaimForm, setShowClaimForm] = useState(false);
  const [viewingCard, setViewingCard] = useState<InsuranceCard | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: cards = [], isLoading: cardsLoading } = useQuery<InsuranceCard[]>({
    queryKey: ["insurance-cards"],
    queryFn: () => apiClient.get("/insurance/cards").then(r => r.data),
  });

  const { data: claims = [], isLoading: claimsLoading } = useQuery<InsuranceClaim[]>({
    queryKey: ["insurance-claims"],
    queryFn: () => apiClient.get("/insurance/claims").then(r => r.data),
    enabled: view === "claims",
  });

  const deleteCardMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/insurance/cards/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["insurance-cards"] }),
    onError: (e: any) => alert(e.response?.data?.message || "Failed to remove card"),
  });

  function copyCode(code: string) {
    navigator.clipboard.writeText(code).catch(() => {});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-brand-600" /> Insurance
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">Manage your insurance cards and claims</p>
        </div>
        <div className="flex gap-2">
          {view === "cards" && (
            <button onClick={() => setShowAddCard(true)}
              className="btn-primary text-sm flex items-center gap-1.5 touch-manipulation">
              <Plus className="w-4 h-4" /> Add card
            </button>
          )}
          {view === "claims" && cards.length > 0 && (
            <button onClick={() => setShowClaimForm(true)}
              className="btn-primary text-sm flex items-center gap-1.5 touch-manipulation">
              <Plus className="w-4 h-4" /> New claim
            </button>
          )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1 w-fit">
        {(["cards", "claims"] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all touch-manipulation capitalize ${
              view === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}>
            {v === "cards" ? `Cards (${cards.length})` : `Claims (${claims.length})`}
          </button>
        ))}
      </div>

      {/* Cards view */}
      {view === "cards" && (
        <>
          {cardsLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-brand-600" /></div>
          ) : cards.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
              <CreditCard className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium text-sm">No insurance cards yet</p>
              <p className="text-slate-400 text-xs mt-1 mb-4">Add your SHA or private insurance card to submit claims</p>
              <button onClick={() => setShowAddCard(true)} className="btn-primary text-sm touch-manipulation">
                Add first card
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {cards.map(card => (
                <div key={card.id} className="bg-gradient-to-br from-brand-600 to-brand-800 rounded-2xl p-5 text-white relative overflow-hidden">
                  {/* Card shine effect */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

                  <div className="relative">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-white/70 text-xs font-medium uppercase tracking-wide">{card.provider}</p>
                        <p className="font-bold text-lg mt-0.5">{card.holderName}</p>
                      </div>
                      <Shield className="w-8 h-8 text-white/30" />
                    </div>

                    <div className="space-y-1 mb-4">
                      <div>
                        <p className="text-white/60 text-xs">Member No.</p>
                        <p className="font-mono font-semibold tracking-wider">{card.memberNumber}</p>
                      </div>
                      {card.groupNumber && (
                        <div>
                          <p className="text-white/60 text-xs">Group No.</p>
                          <p className="font-mono text-sm">{card.groupNumber}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-xs">
                        {card.validUntil ? (
                          <span className="text-white/70">
                            Valid until {format(new Date(card.validUntil), "MMM yyyy")}
                          </span>
                        ) : (
                          <span className="text-white/50">No expiry set</span>
                        )}
                      </div>
                      <div className="flex gap-1.5">
                        {card.cardImageBase64 && (
                          <button onClick={() => setViewingCard(card)}
                            className="p-1.5 bg-white/20 rounded-lg hover:bg-white/30 touch-manipulation" title="View card image">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => { if (confirm(`Remove ${card.provider} card?`)) deleteCardMutation.mutate(card.id); }}
                          className="p-1.5 bg-white/20 rounded-lg hover:bg-red-400/50 touch-manipulation" title="Remove card">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {card.claims.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/20">
                        <p className="text-white/60 text-xs">{card.claims.length} claim{card.claims.length !== 1 ? "s" : ""} submitted</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Claims view */}
      {view === "claims" && (
        <>
          {claimsLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-brand-600" /></div>
          ) : claims.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 font-medium text-sm">No claims yet</p>
              <p className="text-slate-400 text-xs mt-1">Submit a claim after a completed appointment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {claims.map(claim => {
                const cfg = CLAIM_STATUS_CONFIG[claim.status] ?? CLAIM_STATUS_CONFIG.DRAFT;
                const StatusIcon = cfg.icon;
                return (
                  <div key={claim.id} className="bg-white border border-slate-100 rounded-xl p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Claim code */}
                        <div className="flex items-center gap-2 mb-2">
                          <code className="text-sm font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg">
                            {claim.claimCode}
                          </code>
                          <button onClick={() => copyCode(claim.claimCode)}
                            className="text-slate-400 hover:text-brand-600 touch-manipulation" title="Copy claim code">
                            {copiedCode === claim.claimCode
                              ? <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                              : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        <p className="text-sm font-medium text-slate-800">
                          Dr. {claim.appointment.availabilitySlot.doctor.user.fullName}
                        </p>
                        <p className="text-xs text-slate-500">
                          {format(new Date(claim.appointment.availabilitySlot.startTime), "MMM d, yyyy")}
                          {" · "}{claim.insuranceCard.provider} ({claim.insuranceCard.memberNumber})
                        </p>
                        {claim.claimAmount && (
                          <p className="text-xs text-slate-500 mt-0.5">
                            Claimed: KES {Number(claim.claimAmount).toLocaleString()}
                            {claim.approvedAmount && (
                              <span className="text-green-600 ml-2">
                                Approved: KES {Number(claim.approvedAmount).toLocaleString()}
                              </span>
                            )}
                          </p>
                        )}
                        {claim.diagnosisCode && (
                          <p className="text-xs text-slate-400 mt-0.5">ICD-10: {claim.diagnosisCode}</p>
                        )}
                      </div>

                      <span className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full shrink-0 ${cfg.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                    </div>

                    {claim.notes && (
                      <p className="text-xs text-slate-500 mt-2 bg-slate-50 rounded-lg px-3 py-2">{claim.notes}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Add card modal */}
      {showAddCard && (
        <AddCardModal
          onClose={() => setShowAddCard(false)}
          onAdded={() => {
            queryClient.invalidateQueries({ queryKey: ["insurance-cards"] });
            setShowAddCard(false);
          }}
        />
      )}

      {/* Submit claim modal */}
      {showClaimForm && (
        <SubmitClaimModal
          cards={cards}
          onClose={() => setShowClaimForm(false)}
          onSubmitted={() => {
            queryClient.invalidateQueries({ queryKey: ["insurance-claims"] });
            queryClient.invalidateQueries({ queryKey: ["insurance-cards"] });
            setShowClaimForm(false);
            setView("claims");
          }}
        />
      )}

      {/* Card image viewer */}
      {viewingCard?.cardImageBase64 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4"
          onClick={() => setViewingCard(null)}>
          <div className="relative max-w-lg w-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewingCard(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white touch-manipulation">
              <X className="w-6 h-6" />
            </button>
            <img src={viewingCard.cardImageBase64} alt="Insurance card"
              className="w-full rounded-2xl shadow-2xl" />
            <p className="text-white/60 text-center text-sm mt-3">
              {viewingCard.provider} — {viewingCard.memberNumber}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Add Card Modal ────────────────────────────────────────────────────────────
function AddCardModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [provider, setProvider] = useState("");
  const [customProvider, setCustomProvider] = useState("");
  const [memberNumber, setMemberNumber] = useState("");
  const [groupNumber, setGroupNumber] = useState("");
  const [holderName, setHolderName] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [cardImageBase64, setCardImageBase64] = useState<string | undefined>();
  const [showImage, setShowImage] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addMutation = useMutation({
    mutationFn: () => apiClient.post("/insurance/cards", {
      provider: provider === "Other" ? customProvider : provider,
      memberNumber,
      groupNumber: groupNumber || undefined,
      holderName,
      validFrom: validFrom || undefined,
      validUntil: validUntil || undefined,
      cardImageBase64,
    }),
    onSuccess: onAdded,
    onError: (e: any) => alert(e.response?.data?.message || "Failed to add card"),
  });

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Image must be under 2MB"); return; }
    const reader = new FileReader();
    reader.onload = () => setCardImageBase64(reader.result as string);
    reader.readAsDataURL(file);
  }

  const finalProvider = provider === "Other" ? customProvider : provider;
  const canSubmit = finalProvider.trim() && memberNumber.trim() && holderName.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-brand-600" /> Add Insurance Card
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 touch-manipulation">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Provider */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Insurance provider *</label>
            <select value={provider} onChange={e => setProvider(e.target.value)} className="input w-full">
              <option value="">Select provider...</option>
              {KE_PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          {provider === "Other" && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Provider name *</label>
              <input value={customProvider} onChange={e => setCustomProvider(e.target.value)}
                placeholder="Enter provider name" className="input w-full" autoFocus />
            </div>
          )}

          {/* Card holder */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Card holder name *</label>
            <input value={holderName} onChange={e => setHolderName(e.target.value)}
              placeholder="Name as shown on card" className="input w-full" />
          </div>

          {/* Member number */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Member number *</label>
            <input value={memberNumber} onChange={e => setMemberNumber(e.target.value)}
              placeholder="e.g. 1234567890" className="input w-full font-mono" />
          </div>

          {/* Group number */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Group / Scheme number <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input value={groupNumber} onChange={e => setGroupNumber(e.target.value)}
              placeholder="e.g. GRP-001" className="input w-full font-mono" />
          </div>

          {/* Validity */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Valid from</label>
              <input type="date" value={validFrom} onChange={e => setValidFrom(e.target.value)} className="input w-full text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Valid until</label>
              <input type="date" value={validUntil} onChange={e => setValidUntil(e.target.value)} className="input w-full text-sm" />
            </div>
          </div>

          {/* Card image */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Card photo <span className="text-slate-400 font-normal">(optional — max 2MB)</span>
            </label>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            {cardImageBase64 ? (
              <div className="relative">
                <img src={cardImageBase64} alt="Card preview"
                  className={`w-full rounded-xl border border-slate-200 ${showImage ? "" : "filter blur-sm"}`} />
                <div className="absolute inset-0 flex items-center justify-center gap-2">
                  <button onClick={() => setShowImage(!showImage)}
                    className="bg-white/90 rounded-lg p-2 shadow touch-manipulation">
                    {showImage ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button onClick={() => setCardImageBase64(undefined)}
                    className="bg-white/90 rounded-lg p-2 shadow touch-manipulation">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-slate-200 rounded-xl py-6 text-sm text-slate-400 hover:border-brand-300 hover:text-brand-600 transition-colors touch-manipulation">
                📷 Tap to upload card photo
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-3 p-5 border-t border-slate-100">
          <button onClick={() => addMutation.mutate()} disabled={!canSubmit || addMutation.isPending}
            className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 touch-manipulation">
            {addMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save card
          </button>
          <button onClick={onClose} className="btn-secondary touch-manipulation">Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ── Submit Claim Modal ────────────────────────────────────────────────────────
function SubmitClaimModal({
  cards,
  onClose,
  onSubmitted,
}: {
  cards: InsuranceCard[];
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [selectedCard, setSelectedCard] = useState(cards[0]?.id ?? "");
  const [appointments, setAppointments] = useState<any[]>([]);
  const [selectedAppt, setSelectedAppt] = useState("");
  const [diagnosisCode, setDiagnosisCode] = useState("");
  const [claimAmount, setClaimAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState<any>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Load completed appointments
  useQuery({
    queryKey: ["appointments-for-claim"],
    queryFn: () => apiClient.get("/appointments/my").then(r =>
      r.data.filter((a: any) => ["CONFIRMED", "COMPLETED"].includes(a.status))
    ),
    onSuccess: (data: any[]) => {
      setAppointments(data);
      if (data.length > 0) setSelectedAppt(data[0].id);
    },
  } as any);

  const submitMutation = useMutation({
    mutationFn: () => apiClient.post("/insurance/claims", {
      appointmentId: selectedAppt,
      insuranceCardId: selectedCard,
      diagnosisCode: diagnosisCode || undefined,
      claimAmount: claimAmount ? Number(claimAmount) : undefined,
      notes: notes || undefined,
    }),
    onSuccess: (res) => setSubmitted(res.data),
    onError: (e: any) => alert(e.response?.data?.message || "Failed to submit claim"),
  });

  function copyCode() {
    if (!submitted) return;
    navigator.clipboard.writeText(submitted.claimCode).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-600" /> Submit Insurance Claim
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 touch-manipulation">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {submitted ? (
            /* Success state */
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-green-600" />
              </div>
              <h4 className="font-semibold text-slate-900 mb-1">Claim submitted!</h4>
              <p className="text-sm text-slate-500 mb-4">
                Your claim has been submitted to {submitted.insuranceCard?.provider}. Use this code to track your claim.
              </p>

              <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 mb-4">
                <p className="text-xs text-slate-500 mb-1">Claim Reference Code</p>
                <div className="flex items-center justify-center gap-3">
                  <code className="text-2xl font-mono font-bold text-brand-700 tracking-widest">
                    {submitted.claimCode}
                  </code>
                  <button onClick={copyCode}
                    className="p-2 bg-white rounded-lg shadow-sm hover:bg-slate-50 touch-manipulation">
                    {copiedCode
                      ? <CheckCircle className="w-4 h-4 text-green-500" />
                      : <Copy className="w-4 h-4 text-slate-500" />}
                  </button>
                </div>
              </div>

              <p className="text-xs text-slate-400">
                Share this code with your insurance provider when filing the claim.
              </p>

              <button onClick={onSubmitted} className="btn-primary w-full mt-5 touch-manipulation">
                Done
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Insurance card */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Insurance card *</label>
                <select value={selectedCard} onChange={e => setSelectedCard(e.target.value)} className="input w-full">
                  {cards.map(c => (
                    <option key={c.id} value={c.id}>{c.provider} — {c.memberNumber}</option>
                  ))}
                </select>
              </div>

              {/* Appointment */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Appointment *</label>
                {appointments.length === 0 ? (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                    No eligible appointments found. Claims can be submitted for confirmed or completed appointments.
                  </div>
                ) : (
                  <select value={selectedAppt} onChange={e => setSelectedAppt(e.target.value)} className="input w-full">
                    {appointments.map((a: any) => (
                      <option key={a.id} value={a.id}>
                        Dr. {a.availabilitySlot?.doctor?.user?.fullName ?? "Unknown"} —{" "}
                        {a.availabilitySlot?.startTime
                          ? format(new Date(a.availabilitySlot.startTime), "MMM d, yyyy")
                          : "N/A"}
                        {" "}({a.status})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Claim amount */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Claim amount (KES) <span className="text-slate-400 font-normal">(leave blank to use consultation fee)</span>
                </label>
                <input type="number" value={claimAmount} onChange={e => setClaimAmount(e.target.value)}
                  placeholder="e.g. 3000" className="input w-full" min="0" />
              </div>

              {/* Diagnosis code */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  ICD-10 diagnosis code <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <input value={diagnosisCode} onChange={e => setDiagnosisCode(e.target.value)}
                  placeholder="e.g. J06.9" className="input w-full font-mono" />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Notes <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  placeholder="Any additional information for the insurer..."
                  className="input w-full resize-none" />
              </div>
            </div>
          )}
        </div>

        {!submitted && (
          <div className="flex gap-3 p-5 border-t border-slate-100">
            <button
              onClick={() => submitMutation.mutate()}
              disabled={!selectedCard || !selectedAppt || appointments.length === 0 || submitMutation.isPending}
              className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 touch-manipulation">
              {submitMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit claim
            </button>
            <button onClick={onClose} className="btn-secondary touch-manipulation">Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}
