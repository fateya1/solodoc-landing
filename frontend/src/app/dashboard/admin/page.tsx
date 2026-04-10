"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users, Building2, Stethoscope, Calendar, ShieldCheck,
  LogOut, CheckCircle, XCircle, Clock, ChevronRight,
  Activity, CreditCard, TrendingUp, Menu, X,
  FileText, Filter, Search, RefreshCw, Globe, User as UserIcon, DollarSign, ArrowUp, ArrowDown, Banknote
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { apiClient } from "@/lib/api";
import { format } from "date-fns";

type Tab = "overview" | "tenants" | "doctors" | "patients" | "appointments" | "subscriptions" | "audit-logs" | "revenue";

export default function AdminDashboard() {
  const { user, token, logout, _hasHydrated } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("overview");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // â”€â”€ Audit log filters â”€â”€
  const [payoutModal, setPayoutModal] = useState<{ doctorProfileId: string; doctorName: string } | null>(null);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutPhone, setPayoutPhone] = useState("");
  const [payoutNotes, setPayoutNotes] = useState("");
  const [auditSearch, setAuditSearch] = useState("");
  const [auditRole, setAuditRole] = useState("");
  const [auditCategory, setAuditCategory] = useState("");
  const [auditDateFrom, setAuditDateFrom] = useState("");
  const [auditPage, setAuditPage] = useState(1);
  const AUDIT_PAGE_SIZE = 20;

  useEffect(() => {
    if (_hasHydrated && !token) router.push("/auth/login");
    if (_hasHydrated && token && user?.role !== "ADMIN") router.push("/auth/login");
  }, [token, _hasHydrated, user, router]);

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => apiClient.get("/admin/stats").then((r) => r.data),
    enabled: !!token && _hasHydrated,
  });

  const { data: tenants } = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: () => apiClient.get("/admin/tenants").then((r) => r.data),
    enabled: !!token && _hasHydrated && tab === "tenants",
  });

  const { data: doctors } = useQuery({
    queryKey: ["admin-doctors"],
    queryFn: () => apiClient.get("/admin/doctors").then((r) => r.data),
    enabled: !!token && _hasHydrated && tab === "doctors",
  });

  const { data: pendingDoctors } = useQuery({
    queryKey: ["admin-pending-doctors"],
    queryFn: () => apiClient.get("/admin/doctors/pending").then((r) => r.data),
    enabled: !!token && _hasHydrated,
  });

  const { data: patients } = useQuery({
    queryKey: ["admin-patients"],
    queryFn: () => apiClient.get("/admin/patients").then((r) => r.data),
    enabled: !!token && _hasHydrated && tab === "patients",
  });

  const { data: recentAppointments } = useQuery({
    queryKey: ["admin-appointments"],
    queryFn: () => apiClient.get("/admin/appointments/recent").then((r) => r.data),
    enabled: !!token && _hasHydrated && tab === "appointments",
  });

  const { data: revenueSummary } = useQuery({
    queryKey: ["admin-revenue-summary"],
    queryFn: () => apiClient.get("/revenue/summary").then((r) => r.data),
    enabled: !!token && _hasHydrated && tab === "revenue",
  });

  const { data: doctorEarnings } = useQuery({
    queryKey: ["admin-doctor-earnings"],
    queryFn: () => apiClient.get("/revenue/doctor-earnings").then((r) => r.data),
    enabled: !!token && _hasHydrated && tab === "revenue",
  });

  const { data: payouts, refetch: refetchPayouts } = useQuery({
    queryKey: ["admin-payouts"],
    queryFn: () => apiClient.get("/revenue/payouts").then((r) => r.data),
    enabled: !!token && _hasHydrated && tab === "revenue",
  });

  const createPayoutMutation = useMutation({
    mutationFn: (data: { doctorProfileId: string; amount: number; periodStart: string; periodEnd: string; phoneNumber: string; notes?: string }) =>
      apiClient.post(`/revenue/payouts/${data.doctorProfileId}`, data),
    onSuccess: () => {
      refetchPayouts();
      setPayoutModal(null);
      setPayoutAmount("");
      setPayoutPhone("");
      setPayoutNotes("");
      queryClient.invalidateQueries({ queryKey: ["admin-doctor-earnings"] });
    },
    onError: (err: any) => alert(err.response?.data?.message || "Failed to create payout."),
  });

  const updatePayoutMutation = useMutation({
    mutationFn: ({ id, status, mpesaReceiptNo }: { id: string; status: string; mpesaReceiptNo?: string }) =>
      apiClient.patch(`/revenue/payouts/${id}/status`, { status, mpesaReceiptNo }),
    onSuccess: () => refetchPayouts(),
    onError: (err: any) => alert(err.response?.data?.message || "Failed to update payout."),
  });

  const resendStkMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/revenue/payouts/${id}/resend-stk`),
    onSuccess: (res: any) => alert(res.data?.message ?? "STK Push sent!"),
    onError: (err: any) => alert(err.response?.data?.message || "Failed to resend STK Push."),
  });

  const { data: subscriptions } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: () => apiClient.get("/admin/subscriptions").then((r) => r.data),
    enabled: !!token && _hasHydrated && tab === "subscriptions",
  });

  const { data: auditLogs, isLoading: auditLoading, refetch: refetchAudit } = useQuery({
    queryKey: ["admin-audit-logs", auditRole, auditCategory, auditDateFrom, auditPage],
    queryFn: () => {
      const params = new URLSearchParams();
      if (auditRole) params.set("role", auditRole);
      if (auditCategory) params.set("category", auditCategory);
      if (auditDateFrom) params.set("from", auditDateFrom);
      params.set("page", String(auditPage));
      params.set("limit", String(AUDIT_PAGE_SIZE));
      return apiClient.get(`/admin/audit-logs?${params.toString()}`).then((r) => r.data);
    },
    enabled: !!token && _hasHydrated && tab === "audit-logs",
  });

  const verifyMutation = useMutation({
    mutationFn: (doctorProfileId: string) => apiClient.patch(`/admin/doctors/${doctorProfileId}/verify`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-doctors"] });
      queryClient.invalidateQueries({ queryKey: ["admin-doctors"] });
      queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
    },
  });

  const toggleTenantMutation = useMutation({
    mutationFn: (tenantId: string) => apiClient.patch(`/admin/tenants/${tenantId}/toggle`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-tenants"] }),
  });

  const toggleUserMutation = useMutation({
    mutationFn: (userId: string) => apiClient.patch(`/admin/users/${userId}/toggle`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-doctors"] });
      queryClient.invalidateQueries({ queryKey: ["admin-patients"] });
    },
  });

  if (!_hasHydrated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!token || user?.role !== "ADMIN") return null;

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: "overview", label: "Overview", icon: Activity },
    { key: "tenants", label: "Tenants", icon: Building2 },
    { key: "doctors", label: "Doctors", icon: Stethoscope },
    { key: "patients", label: "Patients", icon: Users },
    { key: "appointments", label: "Appointments", icon: Calendar },
    { key: "subscriptions", label: "Subscriptions", icon: CreditCard },
    { key: "audit-logs", label: "Audit Logs", icon: FileText },
    { key: "revenue", label: "Revenue", icon: Banknote },
  ];

  const statusColor: Record<string, string> = {
    ACTIVE: "bg-green-50 text-green-700",
    TRIAL: "bg-blue-50 text-blue-700",
    EXPIRED: "bg-red-50 text-red-600",
    CANCELLED: "bg-slate-100 text-slate-500",
    SUSPENDED: "bg-amber-50 text-amber-700",
  };

  const planColor: Record<string, string> = {
    BASIC: "bg-slate-100 text-slate-600",
    PRO: "bg-brand-50 text-brand-700",
    ENTERPRISE: "bg-purple-50 text-purple-700",
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* â”€â”€ Header â”€â”€ */}
      <header className="bg-white border-b border-slate-100 px-4 sm:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-lg">SoloDoc</span>
            <span className="text-xs bg-red-50 text-red-700 font-medium px-2 py-0.5 rounded-full hidden sm:inline">Admin</span>
          </div>
          {/* Desktop nav */}
          <div className="hidden sm:flex items-center gap-4">
            {(pendingDoctors?.length ?? 0) > 0 && (
              <button onClick={() => setTab("doctors")}
                className="flex items-center gap-1.5 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-full font-medium touch-manipulation">
                <Clock className="w-3 h-3" />
                {pendingDoctors.length} pending
              </button>
            )}
            <span className="text-sm text-slate-600 truncate max-w-[150px]">{user?.fullName}</span>
            <button onClick={() => { logout(); router.push("/auth/login"); }}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-500 transition-colors">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
          {/* Mobile: pending badge + hamburger */}
          <div className="flex sm:hidden items-center gap-2">
            {(pendingDoctors?.length ?? 0) > 0 && (
              <button onClick={() => { setTab("doctors"); setMobileMenuOpen(false); }}
                className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1.5 rounded-full font-medium touch-manipulation">
                <Clock className="w-3 h-3" />
                {pendingDoctors.length}
              </button>
            )}
            <button className="p-2 rounded-lg hover:bg-slate-50"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="w-5 h-5 text-slate-600" /> : <Menu className="w-5 h-5 text-slate-600" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="sm:hidden mt-3 pt-3 border-t border-slate-100 flex flex-col gap-3 pb-2">
            <p className="text-sm text-slate-600 px-1">{user?.fullName}</p>
            <button onClick={() => { logout(); router.push("/auth/login"); }}
              className="flex items-center gap-1.5 text-sm text-red-500 px-1">
              <LogOut className="w-4 h-4" /> Sign out
            </button>
          </div>
        )}
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* â”€â”€ Tabs: horizontally scrollable on mobile â”€â”€ */}
        <div className="mb-6 sm:mb-8 overflow-x-auto -mx-4 sm:mx-0 px-4 sm:px-0">
          <div className="flex gap-1 bg-white border border-slate-100 rounded-xl p-1 w-max">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap touch-manipulation ${
                  tab === key ? "bg-brand-600 text-white shadow-sm" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                }`}>
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* â”€â”€ Overview â”€â”€ */}
        {tab === "overview" && (
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mb-5 sm:mb-6">Platform Overview</h2>
            {/* 2 cols mobile â†’ 3 cols tablet â†’ 6 cols desktop */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 mb-6 sm:mb-8">
              {[
                { label: "Tenants", value: stats?.totalTenants ?? 0, icon: Building2, color: "bg-blue-50 text-blue-600" },
                { label: "Doctors", value: stats?.totalDoctors ?? 0, icon: Stethoscope, color: "bg-teal-50 text-teal-600" },
                { label: "Patients", value: stats?.totalPatients ?? 0, icon: Users, color: "bg-green-50 text-green-600" },
                { label: "Appointments", value: stats?.totalAppointments ?? 0, icon: Calendar, color: "bg-purple-50 text-purple-600" },
                { label: "Pending", value: stats?.pendingVerifications ?? 0, icon: Clock, color: "bg-amber-50 text-amber-600" },
                { label: "Active Subs", value: stats?.activeSubscriptions ?? 0, icon: TrendingUp, color: "bg-brand-50 text-brand-600" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="card p-3 sm:p-5">
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center mb-2 sm:mb-3 ${color}`}>
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </div>
                  <p className="text-xl sm:text-2xl font-bold text-slate-900">{value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {(pendingDoctors?.length ?? 0) > 0 && (
              <div className="card">
                <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" /> Pending Doctor Verifications
                </h3>
                <div className="space-y-3">
                  {pendingDoctors.map((d: any) => (
                    <div key={d.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-slate-50 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{d.user.fullName}</p>
                        <p className="text-xs text-slate-500">{d.user.email}</p>
                        <p className="text-xs text-slate-400">Registered {format(new Date(d.user.createdAt), "MMM d, yyyy")}</p>
                      </div>
                      <button onClick={() => verifyMutation.mutate(d.id)} disabled={verifyMutation.isPending}
                        className="flex items-center gap-1.5 text-xs bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 w-fit touch-manipulation">
                        <CheckCircle className="w-3 h-3" /> Verify
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* â”€â”€ Tenants â”€â”€ */}
        {tab === "tenants" && (
          <div className="card">
            <h2 className="font-semibold text-slate-900 mb-5">All Tenants ({tenants?.length ?? 0})</h2>
            <div className="space-y-3">
              {tenants?.map((t: any) => (
                <div key={t.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 bg-slate-50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{t.name}</p>
                    <p className="text-xs text-slate-500">Slug: {t.slug}</p>
                    <p className="text-xs text-slate-400">
                      {t._count.users} users  ·  Created {format(new Date(t.createdAt), "MMM d, yyyy")}
                    </p>
                    {t.subscription && (
                      <div className="flex gap-2 mt-1 flex-wrap">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planColor[t.subscription.plan] ?? "bg-slate-100 text-slate-500"}`}>
                          {t.subscription.plan}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[t.subscription.status] ?? "bg-slate-100 text-slate-500"}`}>
                          {t.subscription.status}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${t.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                      {t.isActive ? "Active" : "Suspended"}
                    </span>
                    <button onClick={() => toggleTenantMutation.mutate(t.id)} disabled={toggleTenantMutation.isPending}
                      className={`text-xs px-3 py-2 rounded-lg font-medium touch-manipulation ${t.isActive ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-700 hover:bg-green-100"}`}>
                      {t.isActive ? "Suspend" : "Activate"}
                    </button>
                    <button onClick={() => router.push(`/dashboard/admin/tenants/${t.id}`)} className="text-slate-400 hover:text-slate-600 p-1">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {!tenants?.length && <p className="text-slate-400 text-sm">No tenants yet.</p>}
            </div>
          </div>
        )}

        {/* â”€â”€ Doctors â”€â”€ */}
        {tab === "doctors" && (
          <div className="space-y-6">
            {(pendingDoctors?.length ?? 0) > 0 && (
              <div className="card border-l-4 border-amber-400">
                <h3 className="font-semibold text-slate-900 mb-4">Pending Verification ({pendingDoctors.length})</h3>
                <div className="space-y-3">
                  {pendingDoctors.map((d: any) => (
                    <div key={d.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-amber-50 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{d.user.fullName}</p>
                        <p className="text-xs text-slate-500">{d.user.email}</p>
                        {d.licenseNumber && <p className="text-xs text-slate-400">License: {d.licenseNumber}</p>}
                      </div>
                      <button onClick={() => verifyMutation.mutate(d.id)} disabled={verifyMutation.isPending}
                        className="flex items-center gap-1.5 text-xs bg-green-600 text-white px-4 py-2.5 rounded-lg hover:bg-green-700 w-fit touch-manipulation">
                        <CheckCircle className="w-3 h-3" /> Verify
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="card">
              <h3 className="font-semibold text-slate-900 mb-4">All Doctors ({doctors?.length ?? 0})</h3>
              <div className="space-y-3">
                {doctors?.map((d: any) => (
                  <div key={d.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-slate-50 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{d.user.fullName}</p>
                      <p className="text-xs text-slate-500">{d.user.email}</p>
                      <p className="text-xs text-slate-400">{d.specialty ?? "General Practice"}  ·  Joined {format(new Date(d.user.createdAt), "MMM d, yyyy")}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.isVerified ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-600"}`}>
                        {d.isVerified ? "Verified" : "Unverified"}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.user.isActive ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-600"}`}>
                        {d.user.isActive ? "Active" : "Suspended"}
                      </span>
                      <button onClick={() => toggleUserMutation.mutate(d.user.id)} disabled={toggleUserMutation.isPending}
                        className={`text-xs px-3 py-2 rounded-lg font-medium flex items-center touch-manipulation ${d.user.isActive ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-700 hover:bg-green-100"}`}>
                        {d.user.isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                ))}
                {!doctors?.length && <p className="text-slate-400 text-sm">No doctors yet.</p>}
              </div>
            </div>
          </div>
        )}

        {/* â”€â”€ Patients â”€â”€ */}
        {tab === "patients" && (
          <div className="card">
            <h2 className="font-semibold text-slate-900 mb-5">All Patients ({patients?.length ?? 0})</h2>
            <div className="space-y-3">
              {patients?.map((p: any) => (
                <div key={p.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-slate-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{p.user.fullName}</p>
                    <p className="text-xs text-slate-500">{p.user.email}</p>
                    <p className="text-xs text-slate-400">{p._count.appointments} appointments  ·  Joined {format(new Date(p.user.createdAt), "MMM d, yyyy")}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.user.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                      {p.user.isActive ? "Active" : "Suspended"}
                    </span>
                    <button onClick={() => toggleUserMutation.mutate(p.user.id)} disabled={toggleUserMutation.isPending}
                      className={`text-xs px-3 py-2 rounded-lg font-medium touch-manipulation ${p.user.isActive ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-700 hover:bg-green-100"}`}>
                      {p.user.isActive ? "Suspend" : "Activate"}
                    </button>
                  </div>
                </div>
              ))}
              {!patients?.length && <p className="text-slate-400 text-sm">No patients yet.</p>}
            </div>
          </div>
        )}

        {/* â”€â”€ Appointments â”€â”€ */}
        {tab === "appointments" && (
          <div className="card">
            <h2 className="font-semibold text-slate-900 mb-5">Recent Appointments</h2>
            <div className="space-y-3">
              {recentAppointments?.map((a: any) => (
                <div key={a.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-slate-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {a.patient?.user?.fullName} â†’ Dr. {a.availabilitySlot?.doctor?.user?.fullName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {a.availabilitySlot?.startTime ? format(new Date(a.availabilitySlot.startTime), "MMM d, yyyy  ·  h:mm a") : "N/A"}
                    </p>
                    <p className="text-xs text-slate-400">{a.reason ?? "General consultation"}</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full w-fit ${
                    a.status === "CONFIRMED" ? "bg-green-50 text-green-700" :
                    a.status === "CANCELLED" ? "bg-red-50 text-red-600" :
                    a.status === "COMPLETED" ? "bg-blue-50 text-blue-700" :
                    "bg-amber-50 text-amber-700"
                  }`}>{a.status}</span>
                </div>
              ))}
              {!recentAppointments?.length && <p className="text-slate-400 text-sm">No appointments yet.</p>}
            </div>
          </div>
        )}

        {/* â”€â”€ Subscriptions â”€â”€ */}
        {/* Subscriptions */}
        {tab === "subscriptions" && (
          <div className="space-y-5">
            {subscriptions?.length > 0 && (() => {
              const totalCollected = subscriptions.reduce((sum: number, s: any) =>
                sum + (s.payments ?? []).filter((p: any) => p.status === "COMPLETED").reduce((ps: number, p: any) => ps + Number(p.amount), 0), 0);
              const totalPending = subscriptions.reduce((sum: number, s: any) =>
                sum + (s.payments ?? []).filter((p: any) => p.status === "PENDING").reduce((ps: number, p: any) => ps + Number(p.amount), 0), 0);
              const activeCount = subscriptions.filter((s: any) => s.status === "ACTIVE").length;
              const trialCount = subscriptions.filter((s: any) => s.status === "TRIAL").length;
              return (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                  {[
                    { label: "Total Collected", value: `KES ${totalCollected.toLocaleString()}`, color: "bg-green-50 text-green-600", icon: TrendingUp },
                    { label: "Pending Payments", value: `KES ${totalPending.toLocaleString()}`, color: "bg-amber-50 text-amber-600", icon: Clock },
                    { label: "Active Subscriptions", value: activeCount, color: "bg-blue-50 text-blue-600", icon: CheckCircle },
                    { label: "On Trial", value: trialCount, color: "bg-purple-50 text-purple-600", icon: Activity },
                  ].map(({ label, value, color, icon: Icon }) => (
                    <div key={label} className="card">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <p className="text-lg sm:text-xl font-bold text-slate-900">{value}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              );
            })()}
            <div className="card">
              <h2 className="font-semibold text-slate-900 mb-5">All Subscriptions ({subscriptions?.length ?? 0})</h2>
              <div className="space-y-3">
                {subscriptions?.map((s: any) => {
                  const completedPayments = (s.payments ?? []).filter((p: any) => p.status === "COMPLETED");
                  const totalPaid = completedPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);
                  const lastPayment = s.payments?.[0];
                  return (
                    <div key={s.id} className="bg-slate-50 rounded-xl overflow-hidden">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{s.tenant?.name}</p>
                          <p className="text-xs text-slate-500">
                            Period: {format(new Date(s.currentPeriodStart), "MMM d")} {"-"} {format(new Date(s.currentPeriodEnd), "MMM d, yyyy")}
                          </p>
                          <div className="flex gap-3 mt-1 flex-wrap">
                            <span className="text-xs text-green-700 font-medium">KES {totalPaid.toLocaleString()} collected</span>
                            {lastPayment && (
                              <span className="text-xs text-slate-400">
                                Last: KES {Number(lastPayment.amount).toLocaleString()} {"·"} {lastPayment.paidAt ? format(new Date(lastPayment.paidAt), "MMM d, yyyy") : lastPayment.status}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${planColor[s.plan] ?? "bg-slate-100 text-slate-500"}`}>{s.plan}</span>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor[s.status] ?? "bg-slate-100 text-slate-500"}`}>{s.status}</span>
                        </div>
                      </div>
                      {s.payments?.length > 0 && (
                        <div className="border-t border-slate-100 px-4 pb-3 pt-2 space-y-1.5">
                          {s.payments.map((p: any) => (
                            <div key={p.id} className="flex items-center justify-between text-xs">
                              <span className="text-slate-600">KES {Number(p.amount).toLocaleString()} {"·"} {p.plan} {"·"} {p.mpesaReceiptNo ?? "No receipt"}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-slate-400">{p.paidAt ? format(new Date(p.paidAt), "MMM d, yyyy") : p.createdAt ? format(new Date(p.createdAt), "MMM d, yyyy") : "-"}</span>
                                <span className={`px-2 py-0.5 rounded-full font-medium ${p.status === "COMPLETED" ? "bg-green-50 text-green-700" : p.status === "FAILED" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>{p.status}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
                {!subscriptions?.length && <p className="text-slate-400 text-sm">No subscriptions yet.</p>}
              </div>
            </div>
          </div>
        )}
        {tab === "audit-logs" && (
          <AuditLogsPanel
            logs={auditLogs}
            loading={auditLoading}
            search={auditSearch}
            setSearch={setAuditSearch}
            role={auditRole}
            setRole={setAuditRole}
            category={auditCategory}
            setCategory={setAuditCategory}
            dateFrom={auditDateFrom}
            setDateFrom={setAuditDateFrom}
            page={auditPage}
            setPage={setAuditPage}
            pageSize={AUDIT_PAGE_SIZE}
            onRefresh={() => { setAuditPage(1); refetchAudit(); }}
          />
        )}

        {/* Revenue Tab */}
        {tab === "revenue" && (
          <div className="space-y-6">
            {revenueSummary && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { label: "Total Revenue", value: `KES ${Number(revenueSummary.totalPlatformRevenue ?? 0).toLocaleString()}`, color: "bg-green-50 text-green-600", icon: TrendingUp },
                  { label: "This Month", value: `KES ${Number(revenueSummary.thisMonthCommissions ?? 0).toLocaleString()}`, color: "bg-brand-50 text-brand-600", icon: Activity },
                  { label: "Platform Commission", value: `KES ${Number(revenueSummary.totalCommissionRevenue ?? 0).toLocaleString()}`, color: "bg-purple-50 text-purple-600", icon: Banknote },
                  { label: "Total Payouts", value: `KES ${Number(revenueSummary.completedPayouts?.amount ?? 0).toLocaleString()}`, color: "bg-blue-50 text-blue-600", icon: CreditCard },
                ].map(({ label, value, color, icon: Icon }) => (
                  <div key={label} className="card">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <p className="text-lg sm:text-xl font-bold text-slate-900 break-words">{value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="card">
              <h2 className="font-semibold text-slate-900 mb-5 flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-brand-600" /> Doctor Earnings
              </h2>
              {!doctorEarnings?.length ? (
                <p className="text-slate-400 text-sm">No earnings data yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-xs text-slate-500 border-b border-slate-100">
                        <th className="text-left pb-3 font-medium">Doctor</th>
                        <th className="text-right pb-3 font-medium">Completed</th>
                        <th className="text-right pb-3 font-medium">Gross (KES)</th>
                        <th className="text-right pb-3 font-medium">Commission (KES)</th>
                        <th className="text-right pb-3 font-medium">Net (KES)</th>
                        <th className="text-right pb-3 font-medium">Paid Out (KES)</th>
                        <th className="text-right pb-3 font-medium">Pending (KES)</th>
                        <th className="pb-3" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {doctorEarnings.map((d: any) => (
                        <tr key={d.doctorProfileId} className="hover:bg-slate-50">
                          <td className="py-3 font-medium text-slate-800">{d.fullName}</td>
                          <td className="py-3 text-right text-slate-600">{d.totalAppointments}</td>
                          <td className="py-3 text-right text-slate-600">{Number(d.totalEarnings).toLocaleString()}</td>
                          <td className="py-3 text-right text-purple-600">{Number(d.totalCommissionsPaid).toLocaleString()}</td>
                          <td className="py-3 text-right text-green-600 font-medium">{Number(d.totalEarnings - d.totalCommissionsPaid).toLocaleString()}</td>
                          <td className="py-3 text-right text-blue-600">{Number(d.totalPaidOut ?? 0).toLocaleString()}</td>
                          <td className="py-3 text-right text-amber-600 font-medium">{Number(d.pendingPayoutAmount ?? 0).toLocaleString()}</td>
                          <td className="py-3 text-right">
                            <div className="flex gap-1 justify-end">
                              <button onClick={() => setPayoutModal({ doctorProfileId: d.doctorProfileId, doctorName: d.fullName })}
                                className="text-xs bg-brand-50 text-brand-700 hover:bg-brand-100 px-3 py-1.5 rounded-lg font-medium touch-manipulation">
                                Pay out
                              </button>
                              <button onClick={() => toggleUserMutation.mutate(d.userId)}
                                disabled={toggleUserMutation.isPending}
                                className={`text-xs px-3 py-1.5 rounded-lg font-medium touch-manipulation ${d.isActive ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-700 hover:bg-green-100"}`}>
                                {d.isActive ? "Suspend" : "Activate"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="card">
              <h2 className="font-semibold text-slate-900 mb-5 flex items-center gap-2">
                <Banknote className="w-5 h-5 text-brand-600" /> Payout History
              </h2>
              {!payouts?.length ? (
                <p className="text-slate-400 text-sm">No payouts recorded yet.</p>
              ) : (
                <div className="space-y-2">
                  {payouts.map((p: any) => (
                    <div key={p.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-slate-50 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{p.doctorName ?? "Doctor"}</p>
                        <p className="text-xs text-slate-500">KES {Number(p.amount).toLocaleString()} · {p.mpesaReceiptNo ?? "Pending receipt"} · {p.createdAt ? format(new Date(p.createdAt), "MMM d, yyyy") : "—"}</p>
                        {p.notes && <p className="text-xs text-slate-400 mt-0.5">{p.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${p.status === "COMPLETED" ? "bg-green-50 text-green-700" : p.status === "FAILED" ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>{p.status}</span>
                        {p.status === "PENDING" && (
                          <div className="flex gap-1 flex-wrap">
                            <button onClick={() => resendStkMutation.mutate(p.id)}
                              disabled={resendStkMutation.isPending}
                              className="text-xs bg-brand-50 text-brand-700 hover:bg-brand-100 px-2.5 py-1 rounded-lg touch-manipulation font-medium">
                              📲 Resend STK
                            </button>
                            <button onClick={() => { const r = prompt("M-Pesa receipt:"); if (r) updatePayoutMutation.mutate({ id: p.id, status: "COMPLETED", mpesaReceiptNo: r }); }}
                              className="text-xs bg-green-50 text-green-700 hover:bg-green-100 px-2.5 py-1 rounded-lg touch-manipulation">Mark paid</button>
                            <button onClick={() => updatePayoutMutation.mutate({ id: p.id, status: "FAILED" })}
                              className="text-xs bg-red-50 text-red-600 hover:bg-red-100 px-2.5 py-1 rounded-lg touch-manipulation">Failed</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {payoutModal && (
          <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <h3 className="font-semibold text-slate-900 mb-1">Create Payout</h3>
              <p className="text-sm text-slate-500 mb-4">Doctor: <strong>{payoutModal.doctorName}</strong></p>
              <div className="space-y-3">
                <div><label className="text-xs font-medium text-slate-600 block mb-1">Amount (KES)</label>
                  <input type="number" value={payoutAmount} onChange={(e) => setPayoutAmount(e.target.value)} className="input w-full" placeholder="e.g. 5000" /></div>
                <div><label className="text-xs font-medium text-slate-600 block mb-1">M-Pesa Phone</label>
                  <input type="tel" value={payoutPhone} onChange={(e) => setPayoutPhone(e.target.value)} className="input w-full" placeholder="2547XXXXXXXX" /></div>
                <div><label className="text-xs font-medium text-slate-600 block mb-1">Period Start</label>
                  <input type="date" id="periodStart" className="input w-full" /></div>
                <div><label className="text-xs font-medium text-slate-600 block mb-1">Period End</label>
                  <input type="date" id="periodEnd" className="input w-full" /></div>
                <div><label className="text-xs font-medium text-slate-600 block mb-1">Notes (optional)</label>
                  <input type="text" value={payoutNotes} onChange={(e) => setPayoutNotes(e.target.value)} className="input w-full" placeholder="Any notes..." /></div>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={() => {
                    const ps = (document.getElementById("periodStart") as HTMLInputElement)?.value;
                    const pe = (document.getElementById("periodEnd") as HTMLInputElement)?.value;
                    if (!payoutAmount || !payoutPhone || !ps || !pe) return alert("Fill all required fields.");
                    createPayoutMutation.mutate({ doctorProfileId: payoutModal.doctorProfileId, amount: Number(payoutAmount), periodStart: new Date(ps).toISOString(), periodEnd: new Date(pe).toISOString(), phoneNumber: payoutPhone, notes: payoutNotes || undefined });
                  }} disabled={createPayoutMutation.isPending}
                  className="btn-primary flex-1 flex items-center justify-center gap-1.5 touch-manipulation">
                  {createPayoutMutation.isPending && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  Send Payout
                </button>
                <button onClick={() => setPayoutModal(null)} className="btn-secondary touch-manipulation">Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Audit Logs Panel â€” standalone component to keep the main export clean
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ACTION_CATEGORIES = [
  { value: "", label: "All categories" },
  { value: "auth", label: "Auth" },
  { value: "user", label: "User management" },
  { value: "appointment", label: "Appointments" },
  { value: "subscription", label: "Subscriptions" },
  { value: "doctor", label: "Doctor" },
  { value: "admin", label: "Admin actions" },
];

const ROLE_OPTIONS = [
  { value: "", label: "All roles" },
  { value: "ADMIN", label: "Admin" },
  { value: "DOCTOR", label: "Doctor" },
  { value: "PATIENT", label: "Patient" },
  { value: "SYSTEM", label: "System" },
];

// Colour-coding by action verb prefix
function actionBadge(action: string) {
  const a = action?.toUpperCase() ?? "";
  if (a.includes("LOGIN") || a.includes("REGISTER"))
    return { bg: "bg-blue-50 text-blue-700", dot: "bg-blue-400" };
  if (a.includes("DELETE") || a.includes("CANCEL") || a.includes("SUSPEND"))
    return { bg: "bg-red-50 text-red-600", dot: "bg-red-400" };
  if (a.includes("VERIFY") || a.includes("APPROVE") || a.includes("ACTIVATE") || a.includes("COMPLETE"))
    return { bg: "bg-green-50 text-green-700", dot: "bg-green-400" };
  if (a.includes("UPDATE") || a.includes("PATCH") || a.includes("EDIT"))
    return { bg: "bg-amber-50 text-amber-700", dot: "bg-amber-400" };
  if (a.includes("PAYMENT") || a.includes("SUBSCRIPTION"))
    return { bg: "bg-purple-50 text-purple-700", dot: "bg-purple-400" };
  return { bg: "bg-slate-100 text-slate-600", dot: "bg-slate-400" };
}

function roleBadge(role: string) {
  if (role === "ADMIN") return "bg-red-50 text-red-700";
  if (role === "DOCTOR") return "bg-teal-50 text-teal-700";
  if (role === "PATIENT") return "bg-blue-50 text-blue-700";
  return "bg-slate-100 text-slate-500";
}

function AuditLogsPanel({
  logs, loading, search, setSearch, role, setRole,
  category, setCategory, dateFrom, setDateFrom,
  page, setPage, pageSize, onRefresh,
}: {
  logs: any; loading: boolean;
  search: string; setSearch: (v: string) => void;
  role: string; setRole: (v: string) => void;
  category: string; setCategory: (v: string) => void;
  dateFrom: string; setDateFrom: (v: string) => void;
  page: number; setPage: (v: number) => void;
  pageSize: number; onRefresh: () => void;
}) {
  // Client-side search filter (on top of server-side category/role/date filters)
  const entries: any[] = logs?.data ?? logs ?? [];
  const total: number = logs?.total ?? entries.length;

  const filtered = search.trim()
    ? entries.filter((log: any) => {
        const q = search.toLowerCase();
        return (
          log.action?.toLowerCase().includes(q) ||
          log.actorName?.toLowerCase().includes(q) ||
          log.actorEmail?.toLowerCase().includes(q) ||
          log.targetType?.toLowerCase().includes(q) ||
          log.description?.toLowerCase().includes(q) ||
          log.ipAddress?.includes(q)
        );
      })
    : entries;

  const hasFilters = role || category || dateFrom;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-5">
      {/* â”€â”€ Header row â”€â”€ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-500" /> Audit Logs
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Every significant action taken on the platform
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 bg-white border border-slate-200 px-3 py-2 rounded-lg w-fit touch-manipulation"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {/* â”€â”€ Filters â”€â”€ */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <p className="text-xs font-medium text-slate-600">Filters</p>
          {hasFilters && (
            <button
              onClick={() => { setRole(""); setCategory(""); setDateFrom(""); setPage(1); }}
              className="ml-auto text-xs text-brand-600 hover:underline touch-manipulation"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative lg:col-span-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search actor, action, IPâ€¦"
              className="input pl-8 text-xs w-full"
            />
          </div>
          {/* Category */}
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1); }}
            className="input text-xs"
          >
            {ACTION_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {/* Role */}
          <select
            value={role}
            onChange={(e) => { setRole(e.target.value); setPage(1); }}
            className="input text-xs"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          {/* Date from */}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="input text-xs"
          />
        </div>
      </div>

      {/* â”€â”€ Log list â”€â”€ */}
      <div className="card">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <FileText className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-slate-500 text-sm font-medium">No audit logs found</p>
            <p className="text-slate-400 text-xs mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs text-slate-400">
                Showing {filtered.length} of {total} events
              </p>
            </div>

            {/* Timeline */}
            <div className="relative">
              {/* Vertical connector line */}
              <div className="absolute left-[18px] top-2 bottom-2 w-px bg-slate-100 hidden sm:block" />

              <div className="space-y-1">
                {filtered.map((log: any, idx: number) => {
                  const badge = actionBadge(log.action);
                  const isLast = idx === filtered.length - 1;
                  return (
                    <div
                      key={log.id ?? idx}
                      className={`flex gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl hover:bg-slate-50 transition-colors group ${!isLast ? "border-b border-slate-50" : ""}`}
                    >
                      {/* Dot */}
                      <div className="relative shrink-0 hidden sm:flex flex-col items-center">
                        <div className={`w-2.5 h-2.5 rounded-full mt-1.5 ${badge.dot} ring-2 ring-white`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Action badge */}
                            <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-md ${badge.bg}`}>
                              {log.action ?? "UNKNOWN"}
                            </span>
                            {/* Role badge */}
                            {log.actorRole && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleBadge(log.actorRole)}`}>
                                {log.actorRole}
                              </span>
                            )}
                          </div>
                          {/* Timestamp */}
                          <p className="text-xs text-slate-400 whitespace-nowrap shrink-0">
                            {log.createdAt
                              ? format(new Date(log.createdAt), "MMM d, yyyy  ·  h:mm a")
                              : "â€”"}
                          </p>
                        </div>

                        {/* Description */}
                        {log.description && (
                          <p className="text-sm text-slate-700 mt-1">{log.description}</p>
                        )}

                        {/* Actor + Target row */}
                        <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                          {/* Actor */}
                          {log.actorName && (
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <UserIcon className="w-3 h-3 text-slate-400" />
                              <span className="font-medium text-slate-700">{log.actorName}</span>
                              {log.actorEmail && (
                                <span className="text-slate-400 hidden sm:inline">({log.actorEmail})</span>
                              )}
                            </div>
                          )}
                          {/* Target */}
                          {log.targetType && (
                            <div className="flex items-center gap-1 text-xs text-slate-400">
                              <span>â†’</span>
                              <span className="capitalize">{log.targetType}</span>
                              {log.targetId && (
                                <code className="font-mono text-xs bg-slate-100 px-1 rounded hidden sm:inline">
                                  {log.targetId.slice(0, 8)}â€¦
                                </code>
                              )}
                            </div>
                          )}
                          {/* IP */}
                          {log.ipAddress && (
                            <div className="flex items-center gap-1 text-xs text-slate-400">
                              <Globe className="w-3 h-3" />
                              <span>{log.ipAddress}</span>
                            </div>
                          )}
                        </div>

                        {/* Metadata (collapsed by default, expand on hover/tap) */}
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <details className="mt-2">
                            <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 select-none w-fit">
                              Metadata
                            </summary>
                            <pre className="text-xs text-slate-500 bg-slate-50 rounded-lg p-2 mt-1 overflow-x-auto whitespace-pre-wrap break-all">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* â”€â”€ Pagination â”€â”€ */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 mt-2 border-t border-slate-100">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="text-xs px-3 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 touch-manipulation"
                >
                  â† Previous
                </button>
                <p className="text-xs text-slate-400">
                  Page {page} of {totalPages}
                </p>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  className="text-xs px-3 py-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40 touch-manipulation"
                >
                  Next â†’
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
