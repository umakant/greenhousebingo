"use client";

import { appConfirm } from "@/lib/app-confirm";

import * as React from "react";
import {
  Plus, Search, Trash2, ClipboardCheck,
  List, LayoutGrid, BarChart3, ChevronLeft, ChevronRight, Filter,
} from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/ui/search-input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TableActionButton } from "@/components/ui/table-action-button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { t } from "@/lib/admin-t";


type AttRow = {
  id: string;
  employeeId: string;
  date: string;
  clockIn?: string | null;
  clockOut?: string | null;
  workHours: number;
  breakHours: number;
  overtime: number;
  shiftName?: string | null;
  status: string;
  note?: string | null;
  employee?: { id: string; firstName: string; lastName?: string | null; employeeId?: string | null } | null;
};
type OptionRow = { id: string; name: string };

type GanttDayEntry = { status: string; clockIn: string | null; clockOut: string | null };
type GanttEmployee = {
  id: string;
  name: string;
  employeeId: string | null;
  profilePhoto: string | null;
  department: { id: string; name: string } | null;
  designation: { id: string; name: string } | null;
  attendance: Record<number, GanttDayEntry>;
  totalPresent: number;
  totalDays: number;
};
type GanttData = {
  month: number;
  year: number;
  daysInMonth: number;
  employees: GanttEmployee[];
};

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_ABBR = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  present: { bg: "bg-green-100", text: "text-green-700" },
  absent:  { bg: "bg-red-100",   text: "text-red-700" },
  late:    { bg: "bg-yellow-100", text: "text-yellow-700" },
  half_day:{ bg: "bg-blue-100",  text: "text-blue-700" },
  on_leave:{ bg: "bg-purple-100",text: "text-purple-700" },
};

function StatusBadge({ s }: { s: string }) {
  const c = STATUS_COLORS[s] ?? { bg: "bg-gray-100", text: "text-gray-600" };
  const label = s.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.bg} ${c.text}`}>
      {label}
    </span>
  );
}

function fmtHours(h: number) {
  return `${h.toFixed(2)}h`;
}

function fmtDate(d: string | null | undefined) {
  if (!d) return "-";
  const dt = new Date(d);
  /** Match calendar date from DB (`@db.Date` → UTC midnight); local getters shift the day in US/EU timezones. */
  return `${dt.getUTCMonth() + 1}/${dt.getUTCDate()}/${dt.getUTCFullYear()}`;
}

function isWeekend(year: number, month: number, day: number): boolean {
  const dow = new Date(year, month - 1, day).getDay();
  return dow === 0 || dow === 6;
}

function getDayOfWeek(year: number, month: number, day: number): string {
  return DAY_ABBR[new Date(year, month - 1, day).getDay()];
}

const STATUS_CFG: Record<string, { symbol: string; pillBg: string; pillText: string; title: string }> = {
  present:  { symbol: "✓", pillBg: "bg-green-500",  pillText: "text-white", title: "Present" },
  absent:   { symbol: "✗", pillBg: "bg-red-400",    pillText: "text-white", title: "Absent" },
  late:     { symbol: "★", pillBg: "bg-yellow-400", pillText: "text-white", title: "Late" },
  half_day: { symbol: "½", pillBg: "bg-blue-400",   pillText: "text-white", title: "Half Day" },
  on_leave: { symbol: "→", pillBg: "bg-purple-400", pillText: "text-white", title: "On Leave" },
};

function GanttCell({ entry, isWknd }: { entry: GanttDayEntry | undefined; isWknd: boolean }) {
  if (!entry) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`flex items-center justify-center h-10 w-full cursor-default ${isWknd ? "text-gray-300" : "text-gray-300"}`}
          >
            <span className="text-xs">–</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{t("No Record")}</p>
        </TooltipContent>
      </Tooltip>
    );
  }
  const cfg = STATUS_CFG[entry.status] ?? {
    symbol: "?",
    pillBg: "bg-gray-300",
    pillText: "text-gray-700",
    title: entry.status.replace(/_/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase()),
  };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center justify-center h-10 w-full cursor-default">
          <span
            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${cfg.pillBg} ${cfg.pillText} shadow-sm`}
          >
            {cfg.symbol}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] z-[100]">
        <p className="font-medium">{t(cfg.title)}</p>
        {entry.clockIn ? (
          <p className="text-xs text-muted-foreground mt-1 tabular-nums">
            {entry.clockIn} – {entry.clockOut ?? "—"}
          </p>
        ) : null}
      </TooltipContent>
    </Tooltip>
  );
}

function GanttLegend() {
  const items = [
    { symbol: "✓", pillBg: "bg-green-500",  label: "Present" },
    { symbol: "→", pillBg: "bg-purple-400", label: "On Leave" },
    { symbol: "★", pillBg: "bg-yellow-400", label: "Late" },
    { symbol: "½", pillBg: "bg-blue-400",   label: "Half Day" },
    { symbol: "✗", pillBg: "bg-red-400",    label: "Absent" },
    { symbol: "–", pillBg: "bg-gray-200",   label: "No Record" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground px-4 py-2.5 border-b bg-muted/30">
      <span className="font-medium text-foreground">{t("Legend")}:</span>
      {items.map(i => (
        <span key={i.label} className="flex items-center gap-1.5">
          <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white ${i.pillBg}`}>
            {i.symbol}
          </span>
          <span>{t(i.label)}</span>
        </span>
      ))}
    </div>
  );
}

// ── Attendance Gantt Timeline ────────────────────────────────────────────────

const COL_W = 40;
const LEFT_W = 200;
const TOTAL_W = 100;

function AttendanceGantt({
  ganttData,
  ganttLoading,
  ganttMonth,
  ganttYear,
  setGanttMonth,
  setGanttYear,
  loadGantt,
  employeeNameFilter = "",
}: {
  ganttData: GanttData | null;
  ganttLoading: boolean;
  ganttMonth: number;
  ganttYear: number;
  setGanttMonth: (m: number) => void;
  setGanttYear: (y: number) => void;
  loadGantt: (opts?: { month?: number; year?: number }) => void;
  /** Client-side filter on employee names (toolbar search). */
  employeeNameFilter?: string;
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const todayReal = new Date();
  const isCurrentMonth = todayReal.getMonth() + 1 === ganttMonth && todayReal.getFullYear() === ganttYear;

  function scrollToToday() {
    if (!scrollRef.current || !ganttData) return;
    const offset = (todayReal.getDate() - 4) * COL_W;
    scrollRef.current.scrollLeft = Math.max(0, offset);
  }

  React.useEffect(() => {
    if (isCurrentMonth && !ganttLoading && ganttData) {
      setTimeout(scrollToToday, 60);
    }
  }, [ganttLoading, isCurrentMonth]); // eslint-disable-line

  function prevMonth() {
    let m = ganttMonth - 1, y = ganttYear;
    if (m < 1) { m = 12; y -= 1; }
    setGanttMonth(m); setGanttYear(y);
    loadGantt({ month: m, year: y });
  }

  function nextMonth() {
    let m = ganttMonth + 1, y = ganttYear;
    if (m > 12) { m = 1; y += 1; }
    setGanttMonth(m); setGanttYear(y);
    loadGantt({ month: m, year: y });
  }

  function goToday() {
    const m = todayReal.getMonth() + 1, y = todayReal.getFullYear();
    setGanttMonth(m); setGanttYear(y);
    loadGantt({ month: m, year: y });
    setTimeout(scrollToToday, 100);
  }

  const days = ganttData ? Array.from({ length: ganttData.daysInMonth }, (_, i) => i + 1) : [];

  const nameQ = employeeNameFilter.trim().toLowerCase();
  const filteredEmployees =
    ganttData && nameQ
      ? ganttData.employees.filter((e) => e.name.toLowerCase().includes(nameQ))
      : ganttData?.employees ?? [];

  return (
    <TooltipProvider delayDuration={200}>
    <div className="flex flex-col">
      <GanttLegend />

      {/* Gantt body */}
      {ganttLoading ? (
        <div className="text-center py-12 text-muted-foreground">{t("Loading...")}</div>
      ) : !ganttData || ganttData.employees.length === 0 ? (
        <div className="text-center py-12 flex flex-col items-center gap-2 text-muted-foreground">
          <BarChart3 className="h-10 w-10 text-gray-300" />
          <div>{t("No employees found for the selected filters")}</div>
        </div>
      ) : filteredEmployees.length === 0 ? (
        <div className="text-center py-12 flex flex-col items-center gap-2 text-muted-foreground">
          <Search className="h-10 w-10 text-gray-300" />
          <div>{t("No employees match your search.")}</div>
        </div>
      ) : (
        /* Single unified scroll container — header + rows scroll together */
        <div className="overflow-x-auto isolate" ref={scrollRef}>
          <table
            className="border-separate border-spacing-0"
            style={{ minWidth: LEFT_W + days.length * COL_W + TOTAL_W }}
          >
            <thead>
              <tr className="border-b bg-white" style={{ height: 60 }}>
                {/* Sticky employee column header — Projects Gantt style */}
                <th
                  className="sticky left-0 z-30 bg-white border-r p-0 overflow-hidden relative shadow-[4px_0_8px_-4px_rgba(0,0,0,0.12)]"
                  style={{ width: LEFT_W, minWidth: LEFT_W, height: 60 }}
                >
                  <div className="absolute bottom-1.5 left-2 z-10">
                    <p className="text-lg font-bold leading-tight">
                      {MONTH_NAMES[ganttMonth - 1]} {ganttYear}
                    </p>
                  </div>
                  {/* Prev month arrow */}
                  <button
                    onClick={prevMonth}
                    className="absolute right-2 bottom-1.5 text-muted-foreground hover:text-foreground"
                    title="Previous month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                </th>

                {/* Day columns */}
                {days.map(day => {
                  const wknd = isWeekend(ganttData.year, ganttData.month, day);
                  const dow = getDayOfWeek(ganttData.year, ganttData.month, day);
                  const isToday = isCurrentMonth && todayReal.getDate() === day;
                  return (
                    <th
                      key={day}
                      className={`relative z-0 border-r last:border-r-0 p-0 select-none overflow-hidden ${
                        wknd ? "bg-muted/30 text-orange-400" : "bg-white"
                      } ${isToday ? "bg-primary/10" : ""}`}
                      style={{ width: COL_W, minWidth: COL_W, height: 60 }}
                    >
                      <div className="flex flex-col items-center justify-center h-full">
                        <span className={`text-[9px] font-medium uppercase ${
                          isToday ? "text-primary" : wknd ? "text-orange-400" : "text-muted-foreground"
                        }`}>
                          {dow}
                        </span>
                        <span className={`mt-0.5 flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                          isToday ? "bg-primary text-primary-foreground" : wknd ? "text-orange-400" : "text-foreground"
                        }`}>
                          {day}
                        </span>
                      </div>
                    </th>
                  );
                })}

                {/* Total + nav controls column — Projects Gantt right cell style */}
                <th
                  className="sticky right-0 z-30 bg-white border-l shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.12)] p-0"
                  style={{ width: TOTAL_W, minWidth: TOTAL_W, height: 60 }}
                >
                  <div className="flex flex-col items-center justify-end gap-1 pb-1.5 px-1">
                    <div className="flex items-center gap-0.5">
                      <button
                        className="flex items-center gap-1 text-[11px] border border-border rounded px-1.5 py-0.5 hover:bg-muted text-muted-foreground hover:text-foreground whitespace-nowrap"
                        onClick={goToday}
                      >
                        <div className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                        {t("Today")}
                      </button>
                      <button onClick={nextMonth} className="p-0.5 text-muted-foreground hover:text-foreground" title="Next month">
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="text-[10px] font-medium text-muted-foreground">{t("Total")}</div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredEmployees.map((emp, idx) => {
                const rowBg = idx % 2 !== 0 ? "bg-gray-50" : "bg-white";
                return (
                <tr
                  key={emp.id}
                  className={`${rowBg} hover:bg-blue-50/40 transition-colors`}
                >
                  {/* Sticky employee cell — opaque row bg + shadow masks horizontal scroll bleed */}
                  <td
                    className={`sticky left-0 z-20 border-r px-4 py-0 ${rowBg} shadow-[4px_0_8px_-4px_rgba(0,0,0,0.12)]`}
                    style={{ width: LEFT_W, minWidth: LEFT_W }}
                  >
                    <div className="py-1">
                      <p className="font-semibold text-sm truncate leading-tight">{emp.name}</p>
                      {emp.designation && (
                        <p className="text-[10px] text-muted-foreground truncate leading-tight">{emp.designation.name}</p>
                      )}
                    </div>
                  </td>

                  {/* Day cells */}
                  {days.map(day => {
                    const entry = emp.attendance[day];
                    const wknd = isWeekend(ganttData.year, ganttData.month, day);
                    const isToday = isCurrentMonth && todayReal.getDate() === day;
                    return (
                      <td
                        key={day}
                        className={`relative z-0 border-r last:border-r-0 p-0 overflow-hidden ${
                          isToday ? "bg-blue-50" : wknd ? "bg-gray-50" : ""
                        }`}
                        style={{ width: COL_W, minWidth: COL_W }}
                      >
                        <GanttCell entry={entry} isWknd={wknd} />
                      </td>
                    );
                  })}

                  {/* Total cell */}
                  <td
                    className={`sticky right-0 z-20 border-l text-center px-2 text-xs font-medium ${rowBg} shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.12)]`}
                    style={{ width: TOTAL_W, minWidth: TOTAL_W }}
                  >
                    <span className="text-green-700">{emp.totalPresent}</span>
                    <span className="text-muted-foreground">/{emp.totalDays}</span>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer */}
      {ganttData && !ganttLoading && (
        <div className="px-4 py-3 border-t bg-muted/30 text-sm text-muted-foreground">
          {MONTH_NAMES[ganttData.month - 1]} {ganttData.year} —{" "}
          {nameQ ? (
            <>
              {filteredEmployees.length} / {ganttData.employees.length} {t("employees")}
            </>
          ) : (
            <>
              {ganttData.employees.length} {t("employees")}
            </>
          )}
        </div>
      )}
    </div>
    </TooltipProvider>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function HrmAttendancesAdmin({ permissions }: { permissions: string[] }) {
  const can = (p: string) => permissions.includes("*") || permissions.includes(p) || permissions.includes("manage-hrm");

  const [items, setItems] = React.useState<AttRow[]>([]);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(1);
  const [lastPage, setLastPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [searchInput, setSearchInput] = React.useState("");
  const [activeSearch, setActiveSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("all");
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [perPage, setPerPage] = React.useState(10);
  const [view, setView] = React.useState<"list" | "grid" | "gantt">("list");

  const [employees, setEmployees] = React.useState<OptionRow[]>([]);
  const [departments, setDepartments] = React.useState<OptionRow[]>([]);

  // Gantt state
  const now = new Date();
  const [ganttMonth, setGanttMonth] = React.useState(now.getMonth() + 1);
  const [ganttYear, setGanttYear] = React.useState(now.getFullYear());
  const [ganttEmpId, setGanttEmpId] = React.useState("__none__");
  const [ganttDeptId, setGanttDeptId] = React.useState("__none__");
  const [ganttData, setGanttData] = React.useState<GanttData | null>(null);
  const [ganttLoading, setGanttLoading] = React.useState(false);
  /** Toolbar search — filters visible rows by name (client-side). */
  const [ganttToolbarSearch, setGanttToolbarSearch] = React.useState("");

  const [open, setOpen] = React.useState(false);
  const [mode, setMode] = React.useState<"add" | "edit">("add");
  const [editId, setEditId] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    employee_id: "", date: "", clock_in: "", clock_out: "", status: "present", note: "",
  });
  const [processing, setProcessing] = React.useState(false);
  const today = new Date().toISOString().slice(0, 10);

  async function loadOptions() {
    const [e, d] = await Promise.all([
      fetch("/api/hrm/employees?per_page=200&status=active", { credentials: "include" }).then(r => r.json()).catch(() => ({ data: [] })),
      fetch("/api/hrm/departments?per_page=200", { credentials: "include" }).then(r => r.json()).catch(() => ({ data: [] })),
    ]);
    setEmployees((e.data ?? []).map((emp: any) => ({ id: emp.id, name: `${emp.firstName} ${emp.lastName ?? ""}`.trim() })));
    setDepartments((d.data ?? []).map((dept: any) => ({ id: dept.id.toString(), name: dept.name })));
  }

  async function load(opts?: { nextPage?: number; search?: string; status?: string; from?: string; to?: string; pp?: number }) {
    const p = opts?.nextPage ?? page;
    const s = opts?.search ?? activeSearch;
    const st = opts?.status ?? statusFilter;
    const df = opts?.from ?? dateFrom;
    const dt = opts?.to ?? dateTo;
    const pp = opts?.pp ?? perPage;
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), per_page: String(pp) });
      if (st && st !== "all") params.set("status", st);
      if (df) params.set("date_from", df);
      if (dt) params.set("date_to", dt);
      if (s) params.set("search", s);
      const res = await fetch(`/api/hrm/attendances?${params}`, { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed");
      setItems(json.data ?? []);
      setTotal(json.total ?? 0);
      setLastPage(json.last_page ?? 1);
      setPage(p);
    } catch (e: any) { setError(e.message); } finally { setLoading(false); }
  }

  async function loadGantt(opts?: { month?: number; year?: number; empId?: string; deptId?: string }) {
    const m = opts?.month ?? ganttMonth;
    const y = opts?.year ?? ganttYear;
    const eid = opts?.empId ?? ganttEmpId;
    const did = opts?.deptId ?? ganttDeptId;
    setGanttLoading(true);
    try {
      const params = new URLSearchParams({ month: String(m), year: String(y) });
      if (eid && eid !== "__none__") params.set("employee_id", eid);
      if (did && did !== "__none__") params.set("department_id", did);
      const res = await fetch(`/api/hrm/attendances/gantt?${params}`, { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load Gantt data");
      setGanttData(json);
    } catch (e: any) { toast.error(e.message); } finally { setGanttLoading(false); }
  }

  React.useEffect(() => { void loadOptions(); void load(); }, []); // eslint-disable-line

  React.useEffect(() => {
    if (view === "gantt") void loadGantt();
  }, [view]); // eslint-disable-line

  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(total, page * perPage);

  function handleSearch() {
    setActiveSearch(searchInput);
    void load({ nextPage: 1, search: searchInput });
  }

  function handleFilter() {
    void load({ nextPage: 1 });
  }

  function openCreate() {
    setMode("add"); setEditId(null);
    setForm({ employee_id: "", date: today, clock_in: "", clock_out: "", status: "present", note: "" });
    setOpen(true);
  }

  function openEdit(row: AttRow) {
    setMode("edit"); setEditId(row.id);
    setForm({
      employee_id: row.employeeId,
      date: new Date(row.date).toISOString().slice(0, 10),
      clock_in: row.clockIn ?? "",
      clock_out: row.clockOut ?? "",
      status: row.status,
      note: row.note ?? "",
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault(); setProcessing(true); setError(null);
    try {
      const url = mode === "add" ? "/api/hrm/attendances" : `/api/hrm/attendances/${editId}`;
      const body: any = {
        status: form.status,
        clock_in: form.clock_in || null,
        clock_out: form.clock_out || null,
        note: form.note || null,
      };
      if (mode === "add") { body.employee_id = form.employee_id; body.date = form.date; }
      const res = await fetch(url, {
        method: mode === "add" ? "POST" : "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Save failed");
      toast.success(mode === "add" ? t("Attendance record created") : t("Attendance record updated"));
      setOpen(false);
      await load();
      if (view === "gantt") await loadGantt();
    } catch (err: any) { setError(err.message); } finally { setProcessing(false); }
  }

  async function del(id: string) {
    if (!(await appConfirm(t("Delete this attendance record?")))) return;
    const res = await fetch(`/api/hrm/attendances/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) {
      const j = await res.json().catch(() => null);
      toast.error(j?.error || "Delete failed");
      return;
    }
    toast.success(t("Record deleted"));
    await load();
    if (view === "gantt") await loadGantt();
  }

  const yearOptions = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 2 + i);

  const ganttFilterCount =
    (ganttEmpId !== "__none__" ? 1 : 0) + (ganttDeptId !== "__none__" ? 1 : 0);
  const listFilterBadgeCount = [statusFilter !== "all", dateFrom, dateTo].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      ) : null}

      <Card className="shadow-sm">
        {/* Toolbar — aligned with Projects → Manage Project (list / Gantt) */}
        <CardContent className="border-b bg-muted/30 p-4 sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
            <div className="min-w-0 w-full max-w-full lg:max-w-md lg:flex-1">
              {view === "gantt" ? (
                <SearchInput
                  value={ganttToolbarSearch}
                  onChange={setGanttToolbarSearch}
                  onSearch={() => {}}
                  placeholder={t("Search employees...")}
                  buttonLabel={t("Search")}
                />
              ) : (
                <SearchInput
                  value={searchInput}
                  onChange={setSearchInput}
                  onSearch={handleSearch}
                  placeholder={t("Search by employee name or date...")}
                  buttonLabel={t("Search")}
                />
              )}
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">
              <div className="flex overflow-hidden rounded-md border">
                <button
                  type="button"
                  className={`p-2 ${view === "list" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                  onClick={() => setView("list")}
                  title={t("List view")}
                  aria-label={t("List view")}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className={`p-2 ${view === "grid" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                  onClick={() => setView("grid")}
                  title={t("Grid view")}
                  aria-label={t("Grid view")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className={`p-2 ${view === "gantt" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted"}`}
                  onClick={() => setView("gantt")}
                  title={t("Gantt chart view")}
                  aria-label={t("Gantt chart view")}
                >
                  <BarChart3 className="h-4 w-4" />
                </button>
              </div>

              {view !== "gantt" ? (
                <>
                  <Select
                    value={String(perPage)}
                    onValueChange={(v) => {
                      const pp = Number(v);
                      setPerPage(pp);
                      void load({ nextPage: 1, pp });
                    }}
                  >
                    <SelectTrigger className="w-[110px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 {t("per page")}</SelectItem>
                      <SelectItem value="25">25 {t("per page")}</SelectItem>
                      <SelectItem value="50">50 {t("per page")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="outline" size="default" className="relative">
                        <Filter className="mr-2 h-4 w-4" />
                        {t("Filters")}
                        {listFilterBadgeCount > 0 ? (
                          <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                            {listFilterBadgeCount}
                          </span>
                        ) : null}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 space-y-3 p-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">{t("Status")}</label>
                        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v)}>
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">{t("All Status")}</SelectItem>
                            <SelectItem value="present">{t("Present")}</SelectItem>
                            <SelectItem value="absent">{t("Absent")}</SelectItem>
                            <SelectItem value="late">{t("Late")}</SelectItem>
                            <SelectItem value="half_day">{t("Half Day")}</SelectItem>
                            <SelectItem value="on_leave">{t("On Leave")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">{t("Date from")}</label>
                        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">{t("Date to")}</label>
                        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9" />
                      </div>
                      <Button type="button" className="w-full" size="sm" onClick={handleFilter}>
                        {t("Apply")}
                      </Button>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="outline" size="default" className="relative">
                      <Filter className="mr-2 h-4 w-4" />
                      {t("Filters")}
                      {ganttFilterCount > 0 ? (
                        <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground">
                          {ganttFilterCount}
                        </span>
                      ) : null}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 space-y-3 p-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">{t("Employee")}</label>
                      <Select
                        value={ganttEmpId}
                        onValueChange={(v) => {
                          setGanttEmpId(v);
                          void loadGantt({ empId: v });
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("All Employees")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">{t("All Employees")}</SelectItem>
                          {employees.map((e) => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">{t("Department")}</label>
                      <Select
                        value={ganttDeptId}
                        onValueChange={(v) => {
                          setGanttDeptId(v);
                          void loadGantt({ deptId: v });
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder={t("All Departments")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">{t("All Departments")}</SelectItem>
                          {departments.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">{t("Month")}</label>
                      <Select
                        value={String(ganttMonth)}
                        onValueChange={(v) => {
                          const m = Number(v);
                          setGanttMonth(m);
                          void loadGantt({ month: m });
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTH_NAMES.map((name, i) => (
                            <SelectItem key={i + 1} value={String(i + 1)}>
                              {name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">{t("Year")}</label>
                      <Select
                        value={String(ganttYear)}
                        onValueChange={(v) => {
                          const y = Number(v);
                          setGanttYear(y);
                          void loadGantt({ year: y });
                        }}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {yearOptions.map((y) => (
                            <SelectItem key={y} value={String(y)}>
                              {y}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {can("create-attendances") && (
                <Button size="sm" onClick={openCreate}>
                  <Plus className="mr-1 h-4 w-4" />
                  {t("Add Record")}
                </Button>
              )}
            </div>
          </div>
        </CardContent>

        {view === "gantt" ? (
          <div className="hidden border-b bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[200px_minmax(0,1fr)_100px] sm:gap-0">
            <span className="border-r border-border/60 pr-2">{t("Name")}</span>
            <span className="px-2 text-center">{t("Schedule")}</span>
            <span className="border-l border-border/60 pl-2 text-right">{t("Total")}</span>
          </div>
        ) : null}

        {/* Content */}
        {view === "list" ? (
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr className="border-b">
                    <th className="text-left font-medium px-4 py-3">{t("Employee Name")}</th>
                    <th className="text-left font-medium px-4 py-3">
                      <span className="flex items-center gap-1">{t("Date")} <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path d="M5 12l5-5 5 5H5z"/><path d="M5 8l5 5 5-5H5z"/></svg></span>
                    </th>
                    <th className="text-left font-medium px-4 py-3">{t("Shift")}</th>
                    <th className="text-left font-medium px-4 py-3">{t("Clock In")}</th>
                    <th className="text-left font-medium px-4 py-3">{t("Clock Out")}</th>
                    <th className="text-left font-medium px-4 py-3">{t("Total Hour")}</th>
                    <th className="text-left font-medium px-4 py-3">{t("Break Hour")}</th>
                    <th className="text-left font-medium px-4 py-3">{t("Overtime")}</th>
                    <th className="text-left font-medium px-4 py-3">{t("Status")}</th>
                    <th className="text-right font-medium px-4 py-3">{t("Actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {loading ? (
                    <tr><td colSpan={10} className="text-center py-10 text-muted-foreground">{t("Loading...")}</td></tr>
                  ) : items.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <ClipboardCheck className="h-10 w-10 text-gray-300" />
                          <div>{t("No attendance records found")}</div>
                        </div>
                      </td>
                    </tr>
                  ) : items.map(row => (
                    <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        {row.employee ? `${row.employee.firstName} ${row.employee.lastName ?? ""}`.trim() : "-"}
                      </td>
                      <td className="px-4 py-3">{fmtDate(row.date)}</td>
                      <td className="px-4 py-3">{row.shiftName || "-"}</td>
                      <td className="px-4 py-3">{row.clockIn || "-"}</td>
                      <td className="px-4 py-3">{row.clockOut || "-"}</td>
                      <td className="px-4 py-3">{fmtHours(row.workHours)}</td>
                      <td className="px-4 py-3">{fmtHours(row.breakHours)}</td>
                      <td className="px-4 py-3">{fmtHours(row.overtime)}</td>
                      <td className="px-4 py-3"><StatusBadge s={row.status} /></td>
                      <td className="px-4 py-3 text-right">
                        {(can("edit-attendances") || can("delete-attendances")) && (
                          <TableActionButton
                            label={t("Edit")}
                            onPrimaryClick={can("edit-attendances") ? () => openEdit(row) : undefined}
                            items={[
                              { label: t("Edit"), onSelect: () => openEdit(row), disabled: !can("edit-attendances") },
                              { label: t("Delete"), onSelect: () => del(row.id), disabled: !can("delete-attendances"), destructive: true, icon: <Trash2 className="h-4 w-4" /> },
                            ]}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        ) : view === "grid" ? (
          /* Grid view */
          <CardContent className="p-4">
            {loading ? (
              <div className="text-center py-10 text-muted-foreground">{t("Loading...")}</div>
            ) : items.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center gap-2 text-muted-foreground">
                <ClipboardCheck className="h-10 w-10 text-gray-300" />
                <div>{t("No attendance records found")}</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map(row => (
                  <div key={row.id} className="border rounded-lg p-4 hover:shadow-sm bg-white space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-sm">
                          {row.employee ? `${row.employee.firstName} ${row.employee.lastName ?? ""}`.trim() : "-"}
                        </p>
                        <p className="text-xs text-muted-foreground">{fmtDate(row.date)}</p>
                      </div>
                      <StatusBadge s={row.status} />
                    </div>
                    {row.shiftName && (
                      <p className="text-xs text-muted-foreground">{t("Shift")}: {row.shiftName}</p>
                    )}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-muted-foreground">{t("In")}: </span>{row.clockIn || "-"}</div>
                      <div><span className="text-muted-foreground">{t("Out")}: </span>{row.clockOut || "-"}</div>
                      <div><span className="text-muted-foreground">{t("Hours")}: </span>{fmtHours(row.workHours)}</div>
                      <div><span className="text-muted-foreground">{t("OT")}: </span>{fmtHours(row.overtime)}</div>
                    </div>
                    <div className="flex justify-end border-t pt-2">
                      {(can("edit-attendances") || can("delete-attendances")) && (
                        <TableActionButton
                          label={t("Edit")}
                          onPrimaryClick={can("edit-attendances") ? () => openEdit(row) : undefined}
                          items={[
                            { label: t("Edit"), onSelect: () => openEdit(row), disabled: !can("edit-attendances") },
                            { label: t("Delete"), onSelect: () => del(row.id), disabled: !can("delete-attendances"), destructive: true, icon: <Trash2 className="h-4 w-4" /> },
                          ]}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        ) : (
          /* Gantt view */
          <AttendanceGantt
            ganttData={ganttData}
            ganttLoading={ganttLoading}
            ganttMonth={ganttMonth}
            ganttYear={ganttYear}
            setGanttMonth={setGanttMonth}
            setGanttYear={setGanttYear}
            loadGantt={loadGantt}
            employeeNameFilter={ganttToolbarSearch}
          />
        )}

        {/* Footer: count + pagination — only for list/grid views */}
        {view !== "gantt" && (
          <CardContent className="border-t border-border/60 p-4">
            <Pagination page={page} lastPage={lastPage} total={total} from={from} to={to} onPageChange={(p) => void load({ nextPage: p })} />
          </CardContent>
        )}
      </Card>

      {/* Add / Edit Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="w-full sm:max-w-[480px] overflow-y-auto flex flex-col gap-0 p-0">
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>{mode === "add" ? t("Add Attendance") : t("Edit Attendance")}</SheetTitle>
          </SheetHeader>
          <form onSubmit={save} className="flex flex-col">
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
              {mode === "add" && (
                <>
                  <div className="space-y-2">
                    <Label required>{t("Employee")}</Label>
                    <Select value={form.employee_id} onValueChange={v => setForm(p => ({ ...p, employee_id: v }))}>
                      <SelectTrigger><SelectValue placeholder={t("Select employee...")} /></SelectTrigger>
                      <SelectContent>
                        {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label required>{t("Date")}</Label>
                    <Input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} required />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label>{t("Status")}</Label>
                <Select value={form.status} onValueChange={v => setForm(p => ({ ...p, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="present">{t("Present")}</SelectItem>
                    <SelectItem value="absent">{t("Absent")}</SelectItem>
                    <SelectItem value="late">{t("Late")}</SelectItem>
                    <SelectItem value="half_day">{t("Half Day")}</SelectItem>
                    <SelectItem value="on_leave">{t("On Leave")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t("Clock In")}</Label>
                  <Input type="time" value={form.clock_in} onChange={e => setForm(p => ({ ...p, clock_in: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>{t("Clock Out")}</Label>
                  <Input type="time" value={form.clock_out} onChange={e => setForm(p => ({ ...p, clock_out: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t("Note")}</Label>
                <Input value={form.note} onChange={e => setForm(p => ({ ...p, note: e.target.value }))} />
              </div>
            </div>
            <div className="border-t px-6 py-4 flex justify-end gap-2 bg-background">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("Cancel")}</Button>
              <Button type="submit" disabled={processing}>
                {processing ? t("Saving...") : mode === "add" ? t("Save") : t("Update")}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
