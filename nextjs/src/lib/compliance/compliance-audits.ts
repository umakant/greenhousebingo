import { COMPLIANCE_AUDIT_TYPES } from "@/lib/compliance/compliance-day2";

export type AuditDisplayStatus = "upcoming" | "in_progress" | "completed" | "overdue" | "cancelled";
export type AuditTypeCategory = "internal" | "external";

const AUDITOR_PEOPLE = [
  "Jennifer Lee",
  "Michael Torres",
  "Sarah Chen",
  "David Park",
  "Emily Watson",
  "Robert Kim",
];

const AUDITOR_COMPANIES = [
  "Deloitte",
  "KPMG",
  "External Audit Partners",
  "Schellman & Company",
  "A-LIGN",
  "Internal Audit Team",
];

export function auditTypeLabel(auditType: string): string {
  return COMPLIANCE_AUDIT_TYPES.find((t) => t.value === auditType)?.label ?? auditType.replace(/_/g, " ");
}

export function auditTypeCategory(auditType: string): AuditTypeCategory {
  return auditType === "internal" ? "internal" : "external";
}

export function auditDisplayStatus(
  status: string,
  startDate: string | null | undefined,
  endDate: string | null | undefined,
): AuditDisplayStatus {
  if (status === "cancelled") return "cancelled";
  if (status === "completed") return "completed";
  const now = Date.now();
  if (endDate) {
    const end = new Date(endDate).getTime();
    if (!Number.isNaN(end) && end < now && status !== "completed") return "overdue";
  }
  if (status === "planned") return "upcoming";
  if (startDate) {
    const start = new Date(startDate).getTime();
    if (!Number.isNaN(start) && start > now) return "upcoming";
  }
  if (status === "in_progress" || status === "fieldwork" || status === "reporting") return "in_progress";
  return "upcoming";
}

export function auditScope(id: number, auditType: string, frameworkName: string | null): string {
  if (auditType === "internal") {
    return id % 2 === 0 ? "IT Infrastructure" : "Security Operations";
  }
  if (frameworkName) return "Organization Wide";
  const scopes = ["Organization Wide", "Cloud Infrastructure", "Production Environment", "HR & People Ops"];
  return scopes[id % scopes.length];
}

export function auditorDisplay(
  auditorName: string | null | undefined,
  id: number,
  auditType: string,
): { personName: string; companyName: string } {
  if (auditType === "internal") {
    return {
      personName: auditorName?.trim() || AUDITOR_PEOPLE[id % AUDITOR_PEOPLE.length],
      companyName: "Internal Audit Team",
    };
  }
  const company = auditorName?.trim() || AUDITOR_COMPANIES[id % AUDITOR_COMPANIES.length];
  const isCompanyOnly = company.includes("Partners") || company.includes("Company") || company.includes("KPMG") || company.includes("Deloitte") || company.includes("A-LIGN") || company.includes("Schellman");
  if (isCompanyOnly && !auditorName?.includes(" ")) {
    return { personName: AUDITOR_PEOPLE[id % AUDITOR_PEOPLE.length], companyName: company };
  }
  const parts = company.split(" — ");
  if (parts.length === 2) return { personName: parts[0], companyName: parts[1] };
  return { personName: company, companyName: AUDITOR_COMPANIES[(id + 1) % AUDITOR_COMPANIES.length] };
}

export function auditSubtitle(name: string, frameworkName: string | null, auditType: string): string {
  if (frameworkName) return frameworkName;
  return auditTypeLabel(auditType);
}

export function auditProgressPct(status: string, displayStatus: AuditDisplayStatus, id: number): number {
  if (displayStatus === "completed") return 100;
  if (displayStatus === "upcoming") return 5 + (id % 15);
  if (displayStatus === "overdue") return 35 + (id % 30);
  if (status === "fieldwork") return 55 + (id % 20);
  if (status === "reporting") return 75 + (id % 15);
  return 40 + (id % 35);
}

export function daysUntilEnd(endDate: string | null | undefined): string | null {
  if (!endDate) return null;
  const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000);
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

export function daysUntilDate(date: string | null | undefined): string | null {
  if (!date) return null;
  const days = Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
  if (days < 0) return `${Math.abs(days)} days ago`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `In ${days} days`;
}

export function auditTaskBreakdown(id: number, displayStatus: AuditDisplayStatus) {
  const total = 12 + (id % 8);
  if (displayStatus === "completed") {
    return { completed: total, inProgress: 0, notStarted: 0, overdue: 0, total };
  }
  if (displayStatus === "upcoming") {
    const notStarted = total - 1;
    return { completed: 0, inProgress: 1, notStarted, overdue: 0, total };
  }
  const completed = Math.round(total * (auditProgressPct("in_progress", displayStatus, id) / 100));
  const overdue = displayStatus === "overdue" ? 1 + (id % 3) : 0;
  const inProgress = 2 + (id % 3);
  const notStarted = Math.max(0, total - completed - inProgress - overdue);
  return { completed, inProgress, notStarted, overdue, total };
}

export type AuditMilestone = { title: string; date: string; relative: string; tone: "default" | "warning" | "info" };

export function auditMilestones(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  status: string,
  id: number,
): AuditMilestone[] {
  if (!startDate || !endDate) return [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];
  const span = end.getTime() - start.getTime();
  const phases = [
    { title: "Planning Phase", offset: 0.1 },
    { title: "Fieldwork Phase", offset: 0.35 },
    { title: "Evidence Review", offset: 0.55 },
    { title: "Reporting Phase", offset: 0.75 },
    { title: "Final Report", offset: 0.95 },
  ];
  return phases.map((phase, i) => {
    const date = new Date(start.getTime() + span * phase.offset);
    const iso = date.toISOString();
    const relative = daysUntilDate(iso) ?? "";
    const tone: AuditMilestone["tone"] =
      relative.includes("overdue") || relative.includes("ago") ? "warning" : i === 1 ? "info" : "default";
    return { title: phase.title, date: iso, relative, tone };
  });
}

export function tabMatchesAudit(
  row: { auditType: string; displayStatus: AuditDisplayStatus },
  tab: string,
): boolean {
  if (tab === "all") return true;
  if (tab === "internal") return auditTypeCategory(row.auditType) === "internal";
  if (tab === "external") return auditTypeCategory(row.auditType) === "external";
  if (tab === "upcoming") return row.displayStatus === "upcoming";
  if (tab === "in_progress") return row.displayStatus === "in_progress";
  if (tab === "completed") return row.displayStatus === "completed";
  if (tab === "overdue") return row.displayStatus === "overdue";
  return true;
}

export function progressBarColor(displayStatus: AuditDisplayStatus): string {
  if (displayStatus === "completed") return "#22c55e";
  if (displayStatus === "overdue") return "#ef4444";
  if (displayStatus === "upcoming") return "#8b5cf6";
  return "#3b82f6";
}
