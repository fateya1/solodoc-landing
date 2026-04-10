"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Calendar, Users, Clock, LogOut, Stethoscope, Plus, Loader2,
  CheckCircle, XCircle, AlertCircle, CreditCard, TrendingUp,
  BarChart2, ArrowUp, ArrowDown, Menu, X, ClipboardList
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { apiClient } from "@/lib/api";
import { format } from "date-fns";
import { AvailabilityTemplateManager } from "@/components/availability-template-manager";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useT } from "@/lib/i18n";
import { PrescriptionModal } from "@/components/prescription-modal";
import { ConsultationNotesModal } from "@/components/consultation-notes-modal";
import { FollowUpModal } from "@/components/follow-up-modal";
import { VideoButton } from "@/components/video-button";
import { ChatPanel, StartChatButton } from "@/components/chat";
import { MessageSquare } from "lucide-react";

type Tab = "appointments" | "slots" | "analytics" | "subscription" | "messages";

export default function DoctorDashboard() {
  const { user, token, logout, _hasHydrated } = useAuthStore();
  const t = useT();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("appointments");
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [slotDate, setSlotDate] = useState("");
  const [slotTime, setSlotTime] = useState("09:00");
  const [slotDuration, setSlotDuration] = useState(60);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedIntakeId, setExpandedIntakeId] = useState<string | null>(null);
  const [slotView, setSlotView] = useState<"slots" | "templates">("slots");
  const [prescriptionAppt, setPrescriptionAppt] = useState<{ id: string; patientName: string; existing?: any } | null>(null);
  const [notesAppt, setNotesAppt] = useState<{ id: string; patientName: string } | null>(null);
  const [followUpAppt, setFollowUpAppt] = useState<{ id: string; patientName: string } | null>(null);

  useEffect(() => {
    if (_hasHydrated && !token) router.push("/auth/login");
  }, [token, _hasHydrated, router]);

  const today = new Date();
  const fromDate = today.toISOString();
  const toDate = new Date(today.getFullYear(), today.getMonth() + 3, today.getDate()).toISOString();

  const { data: profile } = useQuery({
    queryKey: ["doctor-profile", user?.id],
    queryFn: () => apiClient.get("/doctor/profile").then((r) => r.data),
    enabled: !!token && _hasHydrated,
  });

  const doctorProfileId = profile?.id;

  const { data: appointments } = useQuery({
    queryKey: ["doctor-appointments"],
    queryFn: () => apiClient.get("/appointments/doctor").then((r) => r.data),
    enabled: !!token && _hasHydrated,
  });

  const { data: slots, refetch: refetchSlots } = useQuery({
    queryKey: ["my-slots", doctorProfileId],
    queryFn: () =>
      apiClient.get(`/availability/slots?doctorId=${doctorProfileId}&from=${fromDate}&to=${toDate}`).then((r) => r.data),
    enabled: !!token && _hasHydrated && !!doctorProfileId,
  });

  const { data: subscription } = useQuery({
    queryKey: ["my-subscription"],
    queryFn: () => apiClient.get("/subscription/my").then((r) => r.data),
    enabled: !!token && _hasHydrated,
  });

  const { data: analytics } = useQuery({
    queryKey: ["doctor-analytics"],
    queryFn: () => apiClient.get("/doctor/analytics").then((r) => r.data),
    enabled: !!token && _hasHydrated && tab === "analytics",
  });

  const addSlotMutation = useMutation({
    mutationFn: async () => {
      if (!doctorProfileId) throw new Error("Doctor profile not loaded");
      const start = new Date(`${slotDate}T${slotTime}`);
      const end = new Date(start.getTime() + slotDuration * 60_000);
      return apiClient.post(`/availability/slots?doctorId=${doctorProfileId}`, {
        from: start.toISOString(),
        to: end.toISOString(),
        slotMinutes: slotDuration,
        breakMinutes: 0,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-slots", doctorProfileId] });
      setShowAddSlot(false);
      setSlotDate("");
      setSlotTime("09:00");
      setSlotDuration(60);
    },
    onError: (err: any) => alert(err.response?.data?.message || "Failed to add slot."),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiClient.patch(`/appointments/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["doctor-appointments"] });
      refetchSlots();
    },
    onError: (err: any) => alert(err.response?.data?.message || "Failed to update status."),
  });

  if (!_hasHydrated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!token) return null;

  const totalSlots = slots?.length ?? 0;
  const bookedSlots = slots?.filter((s: any) => s.appointment).length ?? 0;
  const confirmedAppts = appointments?.filter((a: any) => a.status === "CONFIRMED").length ?? 0;
  const completedAppts = appointments?.filter((a: any) => a.status === "COMPLETED").length ?? 0;

  const subDaysLeft = subscription
    ? Math.ceil((new Date(subscription.currentPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const tabs: { key: Tab; label: string }[] = [
    { key: "appointments", label: t("nav", "appointments") },
    { key: "slots", label: t("nav", "availability") },
    { key: "analytics", label: t("nav", "analytics") },
    { key: "subscription", label: t("nav", "subscription") },
    { key: "messages", label: "Messages" },
  ];

  const maxBar = analytics?.monthlyTrend
    ? Math.max(...analytics.monthlyTrend.map((m: any) => m.appointments), 1)
    : 1;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 px-4 sm:px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg">SoloDoc</span>
            <span className="text-xs bg-teal-50 text-teal-700 font-medium px-2 py-0.5 rounded-full ml-1 hidden sm:inline">Doctor</span>
          </div>
          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-4">
            <LanguageSwitcher />
            <span className="text-sm text-slate-600">{t("doctor", "dr")} {user?.fullName?.split(" ").slice(-1)[0]}</span>
            <button onClick={() => { logout(); router.push("/auth/login"); }}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-500 transition-colors">
              <LogOut className="w-4 h-4" /> {t("common", "signOut")}
            </button>
          </div>
          {/* Mobile hamburger */}
          <button className="sm:hidden p-2 rounded-lg hover:bg-slate-50"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="w-5 h-5 text-slate-600" /> : <Menu className="w-5 h-5 text-slate-600" />}
          </button>
        </div>
        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden mt-3 pt-3 border-t border-slate-100 flex flex-col gap-3 pb-2">
            <LanguageSwitcher variant="full" className="px-1" />
            <p className="text-sm text-slate-600 px-1">{t("doctor", "dr")} {user?.fullName}</p>
            <button onClick={() => { logout(); router.push("/auth/login"); }}
              className="flex items-center gap-1.5 text-sm text-red-500 px-1">
              <LogOut className="w-4 h-4" /> {t("common", "signOut")}
            </button>
          </div>
        )}
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Profile card */}
        {profile && (
          <div className="card mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="w-14 h-14 bg-brand-100 rounded-2xl flex items-center justify-center text-2xl shrink-0">👨‍⚕️</div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-slate-900">{user?.fullName}</h2>
                <p className="text-sm text-slate-500">{profile.specialty ?? t("doctor", "generalPractice")} · {profile.yearsOfExperience ?? 0} yrs experience</p>
                <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{profile.bio ?? t("doctor", "noBio")}</p>
              </div>
              <div className="flex sm:flex-col items-start sm:items-end gap-2 flex-wrap">
                <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                  profile.isVerified ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-600"
                }`}>
                  {profile.isVerified ? t("doctor", "verified") : t("doctor", "pendingVerification")}
                </span>
                {subDaysLeft !== null && (
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                    subDaysLeft > 7 ? "bg-blue-50 text-blue-700" :
                    subDaysLeft > 0 ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-600"
                  }`}>
                    {subDaysLeft > 0 ? `${subscription?.plan} · ${subDaysLeft}d left` : t("doctor", "subscriptionExpired")}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats grid: 2 cols mobile → 4 cols desktop */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          {[
            { icon: Calendar, label: t("doctor", "totalAppointments"), value: appointments?.length ?? 0, color: "bg-purple-50 text-purple-600" },
            { icon: CheckCircle, label: t("doctor", "confirmed"), value: confirmedAppts, color: "bg-green-50 text-green-600" },
            { icon: TrendingUp, label: t("doctor", "completed"), value: completedAppts, color: "bg-blue-50 text-blue-600" },
            { icon: Clock, label: t("doctor", "availableSlots"), value: totalSlots - bookedSlots, color: "bg-teal-50 text-teal-600" },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="card">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Tabs: horizontally scrollable on mobile */}
        <div className="mb-6 overflow-x-auto">
          <div className="flex gap-1 bg-white border border-slate-100 rounded-xl p-1 w-max min-w-full sm:w-fit sm:min-w-0">
            {tabs.map(({ key, label }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  tab === key ? "bg-brand-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Appointments Tab */}
        {tab === "appointments" && (
          <div className="card">
            <h2 className="font-semibold text-slate-900 mb-5">Patient Appointments</h2>
            {!appointments?.length ? (
              <p className="text-slate-400 text-sm">No appointments yet.</p>
            ) : (
              <div className="space-y-3">
                {appointments.map((appt: any) => (
                  <div key={appt.id} className="bg-slate-50 rounded-xl overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-800">
                        {appt.patient?.user?.fullName ?? t("doctor", "unknownPatient")}
                      </p>
                      <p className="text-xs text-slate-500">
                        {appt.availabilitySlot?.startTime
                          ? format(new Date(appt.availabilitySlot.startTime), "EEEE, MMM d yyyy · h:mm a")
                          : "N/A"}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">{appt.reason ?? t("doctor", "generalConsultation")}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        appt.status === "CONFIRMED" ? "bg-green-50 text-green-700" :
                        appt.status === "COMPLETED" ? "bg-blue-50 text-blue-700" :
                        appt.status === "CANCELLED" ? "bg-red-50 text-red-600" :
                        appt.status === "NO_SHOW" ? "bg-slate-100 text-slate-500" :
                        "bg-amber-50 text-amber-700"
                      }`}>{t("appointment", `status${appt.status}` as any) || appt.status}</span>
                      {/* Intake form toggle */}
                      {appt.intakeForm && (
                        <button
                          onClick={() => setExpandedIntakeId(expandedIntakeId === appt.id ? null : appt.id)}
                          className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-700 hover:bg-blue-100 px-2.5 py-1 rounded-lg touch-manipulation"
                        >
                          <ClipboardList className="w-3 h-3" />
                          {expandedIntakeId === appt.id ? t("doctor", "hideForm") : t("doctor", "intakeForm")}
                        </button>
                      )}
                      {!appt.intakeForm && appt.status === "CONFIRMED" && (
                        <span className="text-xs text-slate-400 italic">No intake form yet</span>
                      )}
                      {/* Prescription button */}
                      {(appt.status === "COMPLETED" || appt.status === "CONFIRMED") && (
                        <button
                          onClick={() => setPrescriptionAppt({
                            id: appt.id,
                            patientName: appt.patient?.user?.fullName ?? "Patient",
                            existing: appt.prescription,
                          })}
                          className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg touch-manipulation ${
                            appt.prescription
                              ? "bg-green-50 text-green-700 hover:bg-green-100"
                              : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                          }`}
                          title={appt.prescription ? "Edit prescription" : "Write prescription"}
                        >
                          💊 {appt.prescription ? "Rx" : "Rx+"}
                        </button>
                      )}
                      {/* Consultation notes button */}
                      {(appt.status === "COMPLETED" || appt.status === "CONFIRMED") && (
                        <button
                          onClick={() => setNotesAppt({
                            id: appt.id,
                            patientName: appt.patient?.user?.fullName ?? "Patient",
                          })}
                          className="flex items-center gap-1 text-xs bg-slate-50 text-slate-600 hover:bg-slate-100 px-2.5 py-1 rounded-lg touch-manipulation"
                          title="Consultation notes (SOAP)"
                        >
                          📋 Notes
                        </button>
                      )}
                      {/* Follow-up button */}
                      {appt.status === "COMPLETED" && (
                        <button
                          onClick={() => setFollowUpAppt({
                            id: appt.id,
                            patientName: appt.patient?.user?.fullName ?? "Patient",
                          })}
                          className="flex items-center gap-1 text-xs bg-teal-50 text-teal-700 hover:bg-teal-100 px-2.5 py-1 rounded-lg touch-manipulation"
                          title="Schedule follow-up"
                        >
                          📅 Follow-up
                        </button>
                      )}
                      {/* Video + status buttons for CONFIRMED */}
                      {appt.status === "CONFIRMED" && (
                        <div className="flex gap-1">
                          <VideoButton appointmentId={appt.id} role="doctor" />
                          <StartChatButton otherProfileId={appt.patient?.id} role="DOCTOR" label="Message" />
                          <button onClick={() => updateStatusMutation.mutate({ id: appt.id, status: "COMPLETED" })}
                            disabled={updateStatusMutation.isPending} title={t("doctor", "markCompleted")}
                            className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 touch-manipulation">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => updateStatusMutation.mutate({ id: appt.id, status: "NO_SHOW" })}
                            disabled={updateStatusMutation.isPending} title={t("doctor", "markNoShow")}
                            className="w-8 h-8 flex items-center justify-center bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 touch-manipulation">
                            <AlertCircle className="w-4 h-4" />
                          </button>
                          <button onClick={() => updateStatusMutation.mutate({ id: appt.id, status: "CANCELLED" })}
                            disabled={updateStatusMutation.isPending} title="Cancel"
                            className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 rounded-lg hover:bg-red-100 touch-manipulation">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Expanded intake form */}
                  {expandedIntakeId === appt.id && appt.intakeForm && (
                    <div className="px-4 pb-4 border-t border-blue-100">
                      <IntakeFormView form={appt.intakeForm} />
                    </div>
                  )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Slots Tab */}
        {tab === "slots" && (
          <div className="card">
            {/* Sub-tab switcher */}
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1 mb-5 w-fit">
              {(["slots", "templates"] as const).map((v) => (
                <button key={v} onClick={() => setSlotView(v)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all touch-manipulation capitalize ${
                    slotView === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                  }`}>
                  {v === "slots" ? t("doctor", "mySlots") : t("doctor", "templates")}
                </button>
              ))}
            </div>

            {/* My Slots view */}
            {slotView === "slots" && (
              <>
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-semibold text-slate-900">Availability Slots</h2>
                  <button onClick={() => setShowAddSlot(!showAddSlot)} disabled={!doctorProfileId}
                    className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-50 touch-manipulation">
                    <Plus className="w-4 h-4" /> Add slot
                  </button>
                </div>
                {showAddSlot && (
                  <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 mb-5">
                    <h3 className="text-sm font-medium text-brand-800 mb-3">New availability slot (1 hour)</h3>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input type="date" value={slotDate} onChange={(e) => setSlotDate(e.target.value)}
                        className="input flex-1" min={new Date().toISOString().split("T")[0]} />
                      <input type="time" value={slotTime} onChange={(e) => setSlotTime(e.target.value)}
                        className="input sm:w-36" />
                      <select value={slotDuration} onChange={(e) => setSlotDuration(Number(e.target.value))}
                        className="input sm:w-32">
                        {[15, 20, 30, 45, 60, 90, 120].map((d) => (
                          <option key={d} value={d}>{d} min</option>
                        ))}
                      </select>
                      <button onClick={() => addSlotMutation.mutate()}
                        disabled={!slotDate || addSlotMutation.isPending}
                        className="btn-primary flex items-center justify-center gap-1.5 touch-manipulation">
                        {addSlotMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                        Save
                      </button>
                    </div>
                  </div>
                )}
                {!slots?.length ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400 text-sm mb-3">No slots added yet.</p>
                    <button onClick={() => setSlotView("templates")}
                      className="text-sm text-brand-600 hover:underline touch-manipulation">
                      Use a weekly template instead →
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {slots.map((slot: any) => (
                      <div key={slot.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                        <div>
                          <p className="text-sm font-medium text-slate-800">
                            {format(new Date(slot.startTime), "EEEE, MMM d yyyy")}
                          </p>
                          <p className="text-xs text-slate-500">
                            {format(new Date(slot.startTime), "h:mm a")} – {format(new Date(slot.endTime), "h:mm a")}
                          </p>
                        </div>
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                          !slot.appointment ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                        }`}>
                          {!slot.appointment ? t("doctor", "available") : t("doctor", "booked")}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Templates view */}
            {slotView === "templates" && <AvailabilityTemplateManager />}
          </div>
        )}

        {/* Analytics Tab */}
        {tab === "analytics" && (
          <div className="space-y-6">
            {!analytics ? (
              <div className="card flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
              </div>
            ) : (
              <>
                {/* KPI cards: 2 cols mobile → 4 cols desktop */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  {[
                    {
                      label: "This month",
                      value: analytics.appointmentsThisMonth,
                      sub: `vs ${analytics.appointmentsLastMonth} last month`,
                      trend: analytics.growthRate,
                      color: "bg-brand-50 text-brand-600",
                      icon: Calendar,
                    },
                    {
                      label: "Revenue this month",
                      value: `KES ${analytics.revenueThisMonth.toLocaleString()}`,
                      sub: `KES ${analytics.revenueLastMonth.toLocaleString()} last month`,
                      trend: analytics.growthRate,
                      color: "bg-green-50 text-green-600",
                      icon: TrendingUp,
                    },
                    {
                      label: "Completion rate",
                      value: `${analytics.completionRate}%`,
                      sub: `${analytics.completedAppointments} completed`,
                      trend: null,
                      color: "bg-blue-50 text-blue-600",
                      icon: CheckCircle,
                    },
                    {
                      label: "Slot utilization",
                      value: `${analytics.slotUtilization}%`,
                      sub: "of slots booked",
                      trend: null,
                      color: "bg-purple-50 text-purple-600",
                      icon: BarChart2,
                    },
                  ].map(({ label, value, sub, trend, color, icon: Icon }) => (
                    <div key={label} className="card">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <p className="text-lg sm:text-xl font-bold text-slate-900 break-words">{value}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                      <div className="flex items-center gap-1 mt-2">
                        {trend !== null && trend !== undefined && (
                          <span className={`flex items-center gap-0.5 text-xs font-medium ${
                            trend >= 0 ? "text-green-600" : "text-red-500"
                          }`}>
                            {trend >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                            {Math.abs(trend)}%
                          </span>
                        )}
                        <span className="text-xs text-slate-400">{sub}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Monthly trend bar chart */}
                <div className="card">
                  <h3 className="font-semibold text-slate-900 mb-6">Appointments – last 6 months</h3>
                  <div className="flex items-end gap-2 sm:gap-3 h-40">
                    {analytics.monthlyTrend.map((m: any) => (
                      <div key={m.month} className="flex-1 flex flex-col items-center gap-2">
                        <p className="text-xs font-medium text-slate-600">{m.appointments}</p>
                        <div className="w-full bg-slate-100 rounded-t-lg relative" style={{ height: "100px" }}>
                          <div
                            className="w-full bg-brand-500 rounded-t-lg absolute bottom-0 transition-all"
                            style={{ height: `${Math.max((m.appointments / maxBar) * 100, m.appointments > 0 ? 8 : 0)}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-500">{m.month}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Revenue trend */}
                <div className="card">
                  <h3 className="font-semibold text-slate-900 mb-4">Revenue – last 6 months</h3>
                  <div className="space-y-3">
                    {analytics.monthlyTrend.map((m: any) => {
                      const maxRevenue = Math.max(...analytics.monthlyTrend.map((x: any) => x.revenue), 1);
                      const pct = Math.round((m.revenue / maxRevenue) * 100);
                      return (
                        <div key={m.month} className="flex items-center gap-3 sm:gap-4">
                          <p className="text-sm text-slate-600 w-8 shrink-0">{m.month}</p>
                          <div className="flex-1 bg-slate-100 rounded-full h-2">
                            <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-xs sm:text-sm font-medium text-slate-800 w-24 sm:w-28 text-right shrink-0">
                            KES {m.revenue.toLocaleString()}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Appointment breakdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="card">
                    <h3 className="font-semibold text-slate-900 mb-4">Appointment breakdown</h3>
                    <div className="space-y-3">
                      {[
                        { label: t("doctor", "completed"), value: analytics.completedAppointments, color: "bg-blue-500" },
                        { label: "Cancelled", value: analytics.cancelledAppointments, color: "bg-red-400" },
                        { label: "No-show", value: analytics.noShowAppointments, color: "bg-amber-400" },
                      ].map(({ label, value, color }) => {
                        const pct = analytics.totalAppointments > 0
                          ? Math.round((value / analytics.totalAppointments) * 100) : 0;
                        return (
                          <div key={label}>
                            <div className="flex justify-between text-xs text-slate-600 mb-1">
                              <span>{label}</span>
                              <span>{value} ({pct}%)</span>
                            </div>
                            <div className="bg-slate-100 rounded-full h-2">
                              <div className={`${color} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="card">
                    <h3 className="font-semibold text-slate-900 mb-4">Total revenue</h3>
                    <div className="flex flex-col items-center justify-center h-28">
                      <p className="text-2xl sm:text-3xl font-bold text-green-600">
                        KES {analytics.revenueTotal.toLocaleString()}
                      </p>
                      <p className="text-sm text-slate-500 mt-1">from {analytics.completedAppointments} completed sessions</p>
                      {analytics.consultationFee > 0 && (
                        <p className="text-xs text-slate-400 mt-1">@ KES {Number(analytics.consultationFee).toLocaleString()} per session</p>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Messages Tab */}
        {tab === "messages" && (
          <div className="card">
            <h2 className="font-semibold text-slate-900 mb-5 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-brand-600" /> Patient Messages
            </h2>
            <ChatPanel role="DOCTOR" />
          </div>
        )}

        {/* Subscription Tab */}
        {tab === "subscription" && (
          <div className="card">
            <h2 className="font-semibold text-slate-900 mb-5 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-brand-600" /> Subscription
            </h2>
            {!subscription ? (
              <div className="text-center py-8">
                <p className="text-slate-500 mb-4">No active subscription found.</p>
                <button onClick={() => router.push("/onboarding")} className="btn-primary">
                  Set up subscription
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 1 col mobile → 3 cols desktop */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  {[
                    { label: t("doctor", "plan"), value: subscription.plan },
                    { label: t("doctor", "status"), value: subscription.status },
                    { label: t("doctor", "daysRemaining"), value: subDaysLeft !== null ? `${subDaysLeft} days` : "N/A" },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-slate-50 rounded-xl p-4">
                      <p className="text-xs text-slate-500 mb-1">{label}</p>
                      <p className="font-semibold text-slate-900">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-1">Billing period</p>
                  <p className="text-sm font-medium text-slate-800">
                    {format(new Date(subscription.currentPeriodStart), "MMM d, yyyy")} –{" "}
                    {format(new Date(subscription.currentPeriodEnd), "MMM d, yyyy")}
                  </p>
                </div>
                {subDaysLeft !== null && subDaysLeft <= 7 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                    <p className="text-sm text-amber-800 font-medium">⚠️ Your subscription expires soon</p>
                    <p className="text-xs text-amber-700 mt-1">Renew now to avoid service interruption.</p>
                    <button onClick={() => router.push("/onboarding")}
                      className="mt-3 text-xs bg-amber-600 text-white px-4 py-2.5 rounded-lg hover:bg-amber-700 touch-manipulation">
                      Renew subscription
                    </button>
                  </div>
                )}
                {subscription.payments?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 mb-3">Recent payments</h3>
                    <div className="space-y-2">
                      {subscription.payments.map((p: any) => (
                        <div key={p.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-slate-50 rounded-xl">
                          <div>
                            <p className="text-sm font-medium text-slate-800">
                              KES {Number(p.amount).toLocaleString()} · {p.plan}
                            </p>
                            <p className="text-xs text-slate-500">
                              {p.mpesaReceiptNo ?? "Pending"} · {p.paidAt ? format(new Date(p.paidAt), "MMM d, yyyy") : "–"}
                            </p>
                          </div>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium w-fit ${
                            p.status === "COMPLETED" ? "bg-green-50 text-green-700" :
                            p.status === "FAILED" ? "bg-red-50 text-red-600" :
                            "bg-amber-50 text-amber-700"
                          }`}>{p.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Messages Tab */}
      {tab === "messages" && (
        <div className="card">
          <h2 className="font-semibold text-slate-900 mb-5 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-brand-600" /> Patient Messages
          </h2>
          <ChatPanel role="DOCTOR" />
        </div>
      )}

      {/* Modals */}
      {prescriptionAppt && (
        <PrescriptionModal
          appointmentId={prescriptionAppt.id}
          patientName={prescriptionAppt.patientName}
          existingPrescription={prescriptionAppt.existing}
          onClose={() => {
            setPrescriptionAppt(null);
            queryClient.invalidateQueries({ queryKey: ["doctor-appointments"] });
          }}
        />
      )}
      {notesAppt && (
        <ConsultationNotesModal
          appointmentId={notesAppt.id}
          patientName={notesAppt.patientName}
          onClose={() => {
            setNotesAppt(null);
            queryClient.invalidateQueries({ queryKey: ["doctor-appointments"] });
          }}
        />
      )}
      {followUpAppt && (
        <FollowUpModal
          appointmentId={followUpAppt.id}
          patientName={followUpAppt.patientName}
          onClose={() => setFollowUpAppt(null)}
        />
      )}
    </div>
  );
}
//
function IntakeFormView({ form }: { form: any }) {
  const medications = Array.isArray(form.medications) ? form.medications : [];
  const activeMeds = medications.filter((m: any) => m.name?.trim());

  return (
    <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-4">
      <p className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">
        📋 Patient Intake Form
        <span className="text-blue-400 font-normal ml-1">
          Submitted {new Date(form.createdAt).toLocaleDateString("en-KE", { dateStyle: "medium" })}
        </span>
      </p>

      {/* Symptoms */}
      {form.symptoms?.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-600 mb-1.5">Symptoms</p>
          <div className="flex flex-wrap gap-1.5">
            {form.symptoms.map((s: string) => (
              <span key={s} className="text-xs bg-white border border-red-200 text-red-700 px-2 py-0.5 rounded-full">
                {s}
              </span>
            ))}
          </div>
          {form.symptomDuration && (
            <p className="text-xs text-slate-500 mt-1.5">Duration: <strong>{form.symptomDuration}</strong></p>
          )}
          {form.symptomNotes && (
            <p className="text-xs text-slate-600 mt-1 bg-white rounded-lg px-3 py-2 border border-slate-100">
              {form.symptomNotes}
            </p>
          )}
        </div>
      )}

      {/* Allergies */}
      <div>
        <p className="text-xs font-medium text-slate-600 mb-1.5">Allergies</p>
        {form.allergies?.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {form.allergies.map((a: string) => (
              <span key={a} className="text-xs bg-white border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full">
                ⚠ {a}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">None reported</p>
        )}
        {form.allergyNotes && (
          <p className="text-xs text-slate-600 mt-1">{form.allergyNotes}</p>
        )}
      </div>

      {/* Medications */}
      <div>
        <p className="text-xs font-medium text-slate-600 mb-1.5">Current medications</p>
        {activeMeds.length > 0 ? (
          <div className="space-y-1">
            {activeMeds.map((m: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs bg-white rounded-lg px-3 py-2 border border-slate-100">
                <span className="font-medium text-slate-800">{m.name}</span>
                {m.dosage && <span className="text-slate-400">·</span>}
                {m.dosage && <span className="text-slate-500">{m.dosage}</span>}
                {m.frequency && <span className="text-slate-400">·</span>}
                {m.frequency && <span className="text-slate-500">{m.frequency}</span>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 italic">None reported</p>
        )}
      </div>

      {/* Vitals */}
      {(form.bloodPressure || form.weight) && (
        <div>
          <p className="text-xs font-medium text-slate-600 mb-1.5">Vitals (self-reported)</p>
          <div className="flex gap-4 text-xs">
            {form.bloodPressure && (
              <span className="bg-white border border-slate-100 rounded-lg px-3 py-1.5">
                BP: <strong>{form.bloodPressure}</strong>
              </span>
            )}
            {form.weight && (
              <span className="bg-white border border-slate-100 rounded-lg px-3 py-1.5">
                Weight: <strong>{form.weight} kg</strong>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Additional notes */}
      {form.additionalNotes && (
        <div>
          <p className="text-xs font-medium text-slate-600 mb-1">Additional notes</p>
          <p className="text-xs text-slate-600 bg-white rounded-lg px-3 py-2 border border-slate-100">
            {form.additionalNotes}
          </p>
        </div>
      )}
    </div>
  );
}



