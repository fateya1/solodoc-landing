"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Shield, CheckCircle, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { apiClient } from "@/lib/api";
import { format } from "date-fns";

const ACTION_COLORS: Record<string, string> = {
  LOGIN: "bg-green-50 text-green-700",
  LOGOUT: "bg-slate-100 text-slate-600",
  REGISTER: "bg-blue-50 text-blue-700",
  APPOINTMENT_BOOKED: "bg-teal-50 text-teal-700",
  APPOINTMENT_CANCELLED: "bg-red-50 text-red-600",
  APPOINTMENT_STATUS_UPDATED: "bg-amber-50 text-amber-700",
  PRESCRIPTION_CREATED: "bg-purple-50 text-purple-700",
  PRESCRIPTION_UPDATED: "bg-purple-50 text-purple-600",
  CONSULTATION_NOTE_SAVED: "bg-blue-50 text-blue-600",
  REVIEW_SUBMITTED: "bg-amber-50 text-amber-600",
  PROFILE_UPDATED: "bg-slate-50 text-slate-600",
  SLOT_CREATED: "bg-teal-50 text-teal-600",
  VIDEO_SESSION_STARTED: "bg-indigo-50 text-indigo-700",
  PASSWORD_RESET_REQUEST: "bg-orange-50 text-orange-600",
  PASSWORD_RESET_COMPLETE: "bg-green-50 text-green-600",
  ADMIN_ACTION: "bg-red-50 text-red-700",
};

export function AuditLogViewer() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: stats } = useQuery({
    queryKey: ["audit-stats"],
    queryFn: () => apiClient.get("/audit/stats").then(r => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs", page, actionFilter, startDate, endDate],
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (actionFilter) params.append("action", actionFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      return apiClient.get(`/audit?${params}`).then(r => r.data);
    },
  });

  const actions = [
    "LOGIN", "REGISTER", "APPOINTMENT_BOOKED", "APPOINTMENT_CANCELLED",
    "PRESCRIPTION_CREATED", "CONSULTATION_NOTE_SAVED", "VIDEO_SESSION_STARTED",
    "PASSWORD_RESET_REQUEST", "PROFILE_UPDATED", "ADMIN_ACTION",
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total events", value: stats.total },
            { label: "Last 24 hours", value: stats.last24h },
            { label: "Last 7 days", value: stats.last7d },
            { label: "Failed events", value: stats.failedCount },
          ].map(({ label, value }) => (
            <div key={label} className="card p-4">
              <p className="text-2xl font-bold text-slate-900">{value.toLocaleString()}</p>
              <p className="text-xs text-slate-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Top actions */}
      {stats?.byAction?.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-slate-900 mb-4">Top Actions</h3>
          <div className="flex flex-wrap gap-2">
            {stats.byAction.map((a: any) => (
              <div key={a.action} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${ACTION_COLORS[a.action] ?? "bg-slate-50 text-slate-600"}`}>
                <span>{a.action.replace(/_/g, " ")}</span>
                <span className="bg-white/60 px-1.5 py-0.5 rounded-md">{a.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            className="input sm:w-56">
            <option value="">All actions</option>
            {actions.map(a => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
          </select>
          <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="input sm:w-40" placeholder="Start date" />
          <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="input sm:w-40" placeholder="End date" />
          {(actionFilter || startDate || endDate) && (
            <button onClick={() => { setActionFilter(""); setStartDate(""); setEndDate(""); setPage(1); }}
              className="btn-secondary text-sm">Clear</button>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
          </div>
        ) : !data?.logs?.length ? (
          <div className="text-center py-12">
            <Shield className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-400">No audit logs found</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {data.logs.map((log: any) => (
                <div key={log.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-2 shrink-0">
                    {log.success
                      ? <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                      : <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    }
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-lg whitespace-nowrap ${ACTION_COLORS[log.action] ?? "bg-slate-100 text-slate-600"}`}>
                      {log.action.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800">
                      {log.user?.fullName ?? "Anonymous"}
                      {log.user?.role && <span className="text-slate-400 ml-1">({log.user.role})</span>}
                    </p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                      {log.entity && <span className="text-xs text-slate-400">{log.entity}</span>}
                      {log.ipAddress && <span className="text-xs text-slate-400">{log.ipAddress}</span>}
                      {log.error && <span className="text-xs text-red-500">{log.error}</span>}
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 shrink-0">
                    {format(new Date(log.createdAt), "MMM d, yyyy HH:mm:ss")}
                  </p>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
                <p className="text-sm text-slate-500">
                  Showing {((page - 1) * 20) + 1}-{Math.min(page * 20, data.total)} of {data.total}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                    className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40">
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="px-3 py-2 text-sm text-slate-600">
                    {page} / {data.totalPages}
                  </span>
                  <button onClick={() => setPage(p => Math.min(data.totalPages, p + 1))} disabled={page === data.totalPages}
                    className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40">
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}