"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Trash2, Play, ChevronDown, ChevronUp,
  Loader2, CheckCircle, Edit2, ToggleLeft, ToggleRight, Calendar
} from "lucide-react";
import { apiClient } from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────────────────
interface TemplateSlot {
  dayOfWeek: number;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  slotMinutes: number;
  breakMinutes: number;
}

interface Template {
  id: string;
  name: string;
  isActive: boolean;
  timezone: string;
  slots: (TemplateSlot & { id: string })[];
  createdAt: string;
}

// ── Constants ────────────────────────────────────────────────────────────────
const DAYS = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 0 },
];

const SLOT_DURATIONS = [15, 20, 30, 45, 60, 90, 120];
const BREAK_DURATIONS = [0, 5, 10, 15, 30];

const DEFAULT_DAY_SLOT: Omit<TemplateSlot, "dayOfWeek"> = {
  startHour: 9, startMinute: 0,
  endHour: 17, endMinute: 0,
  slotMinutes: 60, breakMinutes: 0,
};

function pad(n: number) { return String(n).padStart(2, "0"); }
function toTimeStr(h: number, m: number) { return `${pad(h)}:${pad(m)}`; }
function fromTimeStr(s: string) {
  const [h, m] = s.split(":").map(Number);
  return { hour: h, minute: m };
}
function dayLabel(dow: number) { return DAYS.find((d) => d.value === dow)?.label ?? "?"; }

function slotsPerWindow(startH: number, startM: number, endH: number, endM: number, slotMins: number, breakMins: number) {
  const windowMins = (endH * 60 + endM) - (startH * 60 + startM);
  if (windowMins <= 0) return 0;
  return Math.floor(windowMins / (slotMins + breakMins)) || (windowMins >= slotMins ? 1 : 0);
}

// ── Main component ────────────────────────────────────────────────────────────
export function AvailabilityTemplateManager() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"list" | "create" | "edit">("list");
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [applyingTemplate, setApplyingTemplate] = useState<Template | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ["availability-templates"],
    queryFn: () => apiClient.get("/availability/templates").then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/availability/templates/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["availability-templates"] }),
    onError: (e: any) => alert(e.response?.data?.message || "Failed to delete template"),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => apiClient.patch(`/availability/templates/${id}/toggle`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["availability-templates"] }),
  });

  // ── Views ──────────────────────────────────────────────────────────────────
  if (view === "create" || view === "edit") {
    return (
      <TemplateForm
        existing={view === "edit" ? editingTemplate : null}
        onSaved={() => {
          queryClient.invalidateQueries({ queryKey: ["availability-templates"] });
          setView("list");
          setEditingTemplate(null);
        }}
        onCancel={() => { setView("list"); setEditingTemplate(null); }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-slate-900">Weekly Templates</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Define recurring schedules, then apply them to generate slots in one click
          </p>
        </div>
        <button
          onClick={() => setView("create")}
          className="btn-primary text-sm flex items-center gap-1.5 touch-manipulation"
        >
          <Plus className="w-4 h-4" /> New template
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 font-medium text-sm">No templates yet</p>
          <p className="text-slate-400 text-xs mt-1 mb-4">
            Create a weekly schedule once, apply it as many times as you need
          </p>
          <button onClick={() => setView("create")} className="btn-primary text-sm touch-manipulation">
            Create first template
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.id} className={`bg-white border rounded-xl overflow-hidden transition-all ${
              t.isActive ? "border-slate-200" : "border-slate-100 opacity-60"
            }`}>
              {/* Card header */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                    className="flex items-center gap-2 min-w-0 text-left"
                  >
                    {expandedId === t.id
                      ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                      : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                    <span className="font-medium text-slate-900 text-sm truncate">{t.name}</span>
                  </button>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                    t.isActive ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {t.isActive ? "Active" : "Inactive"}
                  </span>
                  <span className="text-xs text-slate-400 shrink-0 hidden sm:inline">
                    {t.slots.length} time window{t.slots.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => setApplyingTemplate(t)}
                    className="flex items-center gap-1 text-xs bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 touch-manipulation"
                    title="Apply template"
                  >
                    <Play className="w-3 h-3" /> Apply
                  </button>
                  <button
                    onClick={() => { setEditingTemplate(t); setView("edit"); }}
                    className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg touch-manipulation"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => toggleMutation.mutate(t.id)}
                    disabled={toggleMutation.isPending}
                    className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg touch-manipulation"
                    title={t.isActive ? "Deactivate" : "Activate"}
                  >
                    {t.isActive
                      ? <ToggleRight className="w-4 h-4 text-green-500" />
                      : <ToggleLeft className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => { if (confirm(`Delete "${t.name}"?`)) deleteMutation.mutate(t.id); }}
                    disabled={deleteMutation.isPending}
                    className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg touch-manipulation"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Expanded schedule preview */}
              {expandedId === t.id && (
                <div className="border-t border-slate-100 px-4 py-3 bg-slate-50">
                  {t.slots.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No time windows configured</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {t.slots.map((s, i) => {
                        const count = slotsPerWindow(s.startHour, s.startMinute, s.endHour, s.endMinute, s.slotMinutes, s.breakMinutes);
                        return (
                          <div key={i} className="flex items-center gap-3 text-xs bg-white border border-slate-100 rounded-lg px-3 py-2">
                            <span className="font-semibold text-brand-600 w-8 shrink-0">{dayLabel(s.dayOfWeek)}</span>
                            <span className="text-slate-600">
                              {toTimeStr(s.startHour, s.startMinute)} – {toTimeStr(s.endHour, s.endMinute)}
                            </span>
                            <span className="text-slate-400">·</span>
                            <span className="text-slate-500">{s.slotMinutes}min slots</span>
                            <span className="ml-auto text-slate-400">{count} slot{count !== 1 ? "s" : ""}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Apply modal */}
      {applyingTemplate && (
        <ApplyModal
          template={applyingTemplate}
          onClose={() => setApplyingTemplate(null)}
          onApplied={() => {
            queryClient.invalidateQueries({ queryKey: ["my-slots"] });
            setApplyingTemplate(null);
          }}
        />
      )}
    </div>
  );
}

// ── Template Form ─────────────────────────────────────────────────────────────
function TemplateForm({
  existing,
  onSaved,
  onCancel,
}: {
  existing: Template | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(existing?.name ?? "");
  // dayWindows: dayOfWeek → array of time windows for that day
  const initWindows = (): Record<number, Omit<TemplateSlot, "dayOfWeek">[]> => {
    const map: Record<number, Omit<TemplateSlot, "dayOfWeek">[]> = {};
    if (existing) {
      for (const s of existing.slots) {
        if (!map[s.dayOfWeek]) map[s.dayOfWeek] = [];
        map[s.dayOfWeek].push({
          startHour: s.startHour, startMinute: s.startMinute,
          endHour: s.endHour, endMinute: s.endMinute,
          slotMinutes: s.slotMinutes, breakMinutes: s.breakMinutes,
        });
      }
    }
    return map;
  };
  const [dayWindows, setDayWindows] = useState<Record<number, Omit<TemplateSlot, "dayOfWeek">[]>>(initWindows);

  const saveMutation = useMutation({
    mutationFn: () => {
      const slots: TemplateSlot[] = [];
      for (const [dow, windows] of Object.entries(dayWindows)) {
        for (const w of windows) {
          slots.push({ dayOfWeek: Number(dow), ...w });
        }
      }
      const payload = { name: name.trim(), slots };
      if (existing) return apiClient.patch(`/availability/templates/${existing.id}`, payload);
      return apiClient.post("/availability/templates", payload);
    },
    onSuccess: onSaved,
    onError: (e: any) => alert(e.response?.data?.message || "Failed to save template"),
  });

  function toggleDay(dow: number) {
    setDayWindows((prev) => {
      const next = { ...prev };
      if (next[dow]) { delete next[dow]; }
      else { next[dow] = [{ ...DEFAULT_DAY_SLOT }]; }
      return next;
    });
  }

  function addWindow(dow: number) {
    setDayWindows((prev) => ({
      ...prev,
      [dow]: [...(prev[dow] ?? []), { ...DEFAULT_DAY_SLOT }],
    }));
  }

  function removeWindow(dow: number, idx: number) {
    setDayWindows((prev) => {
      const windows = (prev[dow] ?? []).filter((_, i) => i !== idx);
      const next = { ...prev };
      if (windows.length === 0) delete next[dow];
      else next[dow] = windows;
      return next;
    });
  }

  function updateWindow(dow: number, idx: number, field: string, value: any) {
    setDayWindows((prev) => {
      const windows = [...(prev[dow] ?? [])];
      windows[idx] = { ...windows[idx], [field]: value };
      return { ...prev, [dow]: windows };
    });
  }

  function handleTimeChange(dow: number, idx: number, field: "start" | "end", val: string) {
    const { hour, minute } = fromTimeStr(val);
    if (field === "start") {
      updateWindow(dow, idx, "startHour", hour);
      updateWindow(dow, idx, "startMinute", minute);
    } else {
      updateWindow(dow, idx, "endHour", hour);
      updateWindow(dow, idx, "endMinute", minute);
    }
  }

  const activeDays = Object.keys(dayWindows).map(Number);
  const totalSlots = activeDays.reduce((sum, dow) => {
    return sum + (dayWindows[dow] ?? []).reduce((s, w) => {
      return s + slotsPerWindow(w.startHour, w.startMinute, w.endHour, w.endMinute, w.slotMinutes, w.breakMinutes);
    }, 0);
  }, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">
          {existing ? "Edit template" : "New weekly template"}
        </h3>
        <button onClick={onCancel} className="text-sm text-slate-500 hover:text-slate-700 touch-manipulation">
          Cancel
        </button>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Template name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Standard weekday schedule"
          className="input w-full"
          autoFocus
        />
      </div>

      {/* Day grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-sm font-medium text-slate-700">Working days & hours</label>
          {totalSlots > 0 && (
            <span className="text-xs text-brand-600 font-medium">
              ~{totalSlots} slot{totalSlots !== 1 ? "s" : ""} per week
            </span>
          )}
        </div>

        <div className="space-y-3">
          {DAYS.map(({ label, value: dow }) => {
            const isActive = dow in dayWindows;
            const windows = dayWindows[dow] ?? [];
            return (
              <div key={dow} className={`rounded-xl border transition-all ${
                isActive ? "border-brand-200 bg-brand-50" : "border-slate-100 bg-slate-50"
              }`}>
                {/* Day toggle row */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleDay(dow)}
                    className={`w-11 h-6 rounded-full transition-colors shrink-0 relative touch-manipulation ${
                      isActive ? "bg-brand-600" : "bg-slate-300"
                    }`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                      isActive ? "translate-x-5" : "translate-x-0.5"
                    }`} />
                  </button>
                  <span className={`text-sm font-semibold w-8 ${isActive ? "text-brand-700" : "text-slate-400"}`}>
                    {label}
                  </span>
                  {isActive && windows.length > 0 && (
                    <span className="text-xs text-slate-500">
                      {windows.reduce((s, w) => s + slotsPerWindow(w.startHour, w.startMinute, w.endHour, w.endMinute, w.slotMinutes, w.breakMinutes), 0)} slots
                    </span>
                  )}
                  {isActive && (
                    <button
                      type="button"
                      onClick={() => addWindow(dow)}
                      className="ml-auto text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1 touch-manipulation"
                    >
                      <Plus className="w-3 h-3" /> Add window
                    </button>
                  )}
                </div>

                {/* Time windows for this day */}
                {isActive && windows.map((w, idx) => (
                  <div key={idx} className="px-4 pb-3">
                    <div className="bg-white border border-brand-100 rounded-xl p-3">
                      <div className="flex flex-wrap items-center gap-3">
                        {/* Time range */}
                        <div className="flex items-center gap-2">
                          <input
                            type="time"
                            value={toTimeStr(w.startHour, w.startMinute)}
                            onChange={(e) => handleTimeChange(dow, idx, "start", e.target.value)}
                            className="input text-xs w-28"
                          />
                          <span className="text-slate-400 text-xs">to</span>
                          <input
                            type="time"
                            value={toTimeStr(w.endHour, w.endMinute)}
                            onChange={(e) => handleTimeChange(dow, idx, "end", e.target.value)}
                            className="input text-xs w-28"
                          />
                        </div>

                        {/* Slot duration */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-500">Slot</span>
                          <select
                            value={w.slotMinutes}
                            onChange={(e) => updateWindow(dow, idx, "slotMinutes", Number(e.target.value))}
                            className="input text-xs w-20"
                          >
                            {SLOT_DURATIONS.map((d) => (
                              <option key={d} value={d}>{d}min</option>
                            ))}
                          </select>
                        </div>

                        {/* Break */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-500">Break</span>
                          <select
                            value={w.breakMinutes}
                            onChange={(e) => updateWindow(dow, idx, "breakMinutes", Number(e.target.value))}
                            className="input text-xs w-20"
                          >
                            {BREAK_DURATIONS.map((d) => (
                              <option key={d} value={d}>{d === 0 ? "None" : `${d}min`}</option>
                            ))}
                          </select>
                        </div>

                        {/* Slot count preview */}
                        <span className="text-xs text-brand-600 font-medium">
                          = {slotsPerWindow(w.startHour, w.startMinute, w.endHour, w.endMinute, w.slotMinutes, w.breakMinutes)} slots
                        </span>

                        {/* Remove window */}
                        {windows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeWindow(dow, idx)}
                            className="ml-auto text-slate-400 hover:text-red-500 touch-manipulation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Save */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={() => saveMutation.mutate()}
          disabled={!name.trim() || activeDays.length === 0 || saveMutation.isPending}
          className="btn-primary flex items-center gap-2 disabled:opacity-50 touch-manipulation"
        >
          {saveMutation.isPending
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <CheckCircle className="w-4 h-4" />}
          {existing ? "Update template" : "Save template"}
        </button>
        <button onClick={onCancel} className="btn-secondary touch-manipulation">Cancel</button>
        {activeDays.length === 0 && name.trim() && (
          <p className="text-xs text-amber-600">Select at least one working day</p>
        )}
      </div>
    </div>
  );
}

// ── Apply Modal ───────────────────────────────────────────────────────────────
function ApplyModal({
  template,
  onClose,
  onApplied,
}: {
  template: Template;
  onClose: () => void;
  onApplied: () => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [fromDate, setFromDate] = useState(today);
  const [weeks, setWeeks] = useState(4);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);

  const applyMutation = useMutation({
    mutationFn: () =>
      apiClient.post(`/availability/templates/${template.id}/apply`, { fromDate, weeks }),
    onSuccess: (res) => {
      setResult(res.data);
      setTimeout(() => { onApplied(); }, 2500);
    },
    onError: (e: any) => alert(e.response?.data?.message || "Failed to apply template"),
  });

  // Estimate slots
  const slotsPerWeek = template.slots.reduce((sum, s) => {
    return sum + slotsPerWindow(s.startHour, s.startMinute, s.endHour, s.endMinute, s.slotMinutes, s.breakMinutes);
  }, 0);
  const estimate = slotsPerWeek * weeks;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        {result ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Slots created!</h3>
            <p className="text-sm text-slate-500">
              <strong>{result.created}</strong> new slot{result.created !== 1 ? "s" : ""} added
              {result.skipped > 0 && `, ${result.skipped} skipped (already existed)`}
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-semibold text-slate-900">Apply template</h3>
                <p className="text-xs text-slate-400 mt-0.5">{template.name}</p>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-600 touch-manipulation">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Start date</label>
                <input
                  type="date"
                  value={fromDate}
                  min={today}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Number of weeks
                </label>
                <div className="flex gap-2 flex-wrap">
                  {[1, 2, 4, 6, 8, 12].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setWeeks(w)}
                      className={`text-sm px-3 py-1.5 rounded-lg border transition-all touch-manipulation ${
                        weeks === w
                          ? "bg-brand-600 text-white border-brand-600"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      {w}w
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="bg-brand-50 border border-brand-100 rounded-xl p-4">
                <p className="text-xs font-medium text-brand-800 mb-2">Preview</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-slate-500">From</p>
                    <p className="font-medium text-slate-800">
                      {new Date(fromDate).toLocaleDateString("en-KE", { dateStyle: "medium" })}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Until</p>
                    <p className="font-medium text-slate-800">
                      {new Date(new Date(fromDate).getTime() + weeks * 7 * 86400000).toLocaleDateString("en-KE", { dateStyle: "medium" })}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Slots per week</p>
                    <p className="font-medium text-slate-800">~{slotsPerWeek}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Total estimated</p>
                    <p className="font-semibold text-brand-700">~{estimate} slots</p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {template.slots.map((s, i) => (
                    <span key={i} className="text-xs bg-white border border-brand-200 text-brand-700 px-2 py-0.5 rounded-full">
                      {dayLabel(s.dayOfWeek)} {toTimeStr(s.startHour, s.startMinute)}–{toTimeStr(s.endHour, s.endMinute)}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => applyMutation.mutate()}
                disabled={applyMutation.isPending}
                className="btn-primary flex-1 flex items-center justify-center gap-2 touch-manipulation"
              >
                {applyMutation.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Play className="w-4 h-4" />}
                {applyMutation.isPending ? "Generating..." : `Generate ${estimate} slots`}
              </button>
              <button onClick={onClose} className="btn-secondary touch-manipulation">Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
