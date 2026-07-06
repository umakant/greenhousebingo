export type ReportCategoryCard = {
  key: string;
  title: string;
  description: string;
  icon: string;
  bullets: string[];
  reportType: string;
};

export type QuickExportItem = {
  key: string;
  label: string;
  reportType: string;
  format: "pdf" | "xlsx" | "csv";
};

export type ReportTemplate = {
  id: string;
  name: string;
  framework?: string;
};

export type RecentReport = {
  id: string;
  name: string;
  generatedBy: string;
  generatedAt: string;
  format: "PDF" | "Excel" | "ZIP" | "CSV";
};

export type ScheduledReport = {
  id: string;
  name: string;
  schedule: string;
  format: string;
  recipients: string[];
  enabled: boolean;
};

export const REPORT_CATEGORIES: ReportCategoryCard[] = [
  {
    key: "compliance",
    title: "Compliance Report",
    description: "Executive summary of your compliance program health.",
    icon: "shield",
    bullets: ["Framework readiness", "Controls", "Evidence", "Audits", "Risks"],
    reportType: "compliance",
  },
  {
    key: "audit_package",
    title: "Audit Package",
    description: "Complete audit evidence bundle for external auditors.",
    icon: "package",
    bullets: ["Evidence Bundle", "Controls", "Policies", "Auditor Comments"],
    reportType: "audit_package",
  },
  {
    key: "executive",
    title: "Executive Report",
    description: "High-level summary for leadership and board reviews.",
    icon: "chart",
    bullets: ["Compliance Score", "Risk Summary", "Audit Status"],
    reportType: "compliance",
  },
  {
    key: "risk_register",
    title: "Risk Register",
    description: "Full inventory of identified risks and mitigations.",
    icon: "alert",
    bullets: ["Open", "Mitigated", "Accepted", "Closed"],
    reportType: "risk_register",
  },
  {
    key: "vendor",
    title: "Vendor Compliance Report",
    description: "Third-party risk and vendor certification status.",
    icon: "building",
    bullets: ["SOC2", "ISO", "BAA", "DPA"],
    reportType: "vendor",
  },
  {
    key: "vulnerability",
    title: "Vulnerability Report",
    description: "Open vulnerabilities with severity and remediation status.",
    icon: "bug",
    bullets: ["Critical", "High", "Medium", "Low"],
    reportType: "vulnerability",
  },
];

export const QUICK_EXPORT_ITEMS: QuickExportItem[] = [
  { key: "compliance", label: "Compliance Report", reportType: "compliance", format: "pdf" },
  { key: "audit", label: "Audit Package", reportType: "audit_package", format: "pdf" },
  { key: "risk", label: "Risk Register", reportType: "risk_register", format: "xlsx" },
  { key: "vendor", label: "Vendor Report", reportType: "vendor", format: "pdf" },
  { key: "vulnerability", label: "Vulnerability Report", reportType: "vulnerability", format: "xlsx" },
  { key: "evidence", label: "Evidence Report", reportType: "evidence", format: "xlsx" },
  { key: "framework", label: "Framework Readiness", reportType: "framework_readiness", format: "pdf" },
];

export const REPORT_TEMPLATES: ReportTemplate[] = [
  { id: "soc2", name: "SOC 2 Type II", framework: "SOC2" },
  { id: "hipaa", name: "HIPAA Security", framework: "HIPAA" },
  { id: "iso27001", name: "ISO 27001", framework: "ISO27001" },
  { id: "gdpr", name: "GDPR Privacy", framework: "GDPR" },
  { id: "nist", name: "NIST CSF", framework: "NIST_CSF" },
];

const GENERATORS = ["Sarah Johnson", "Mike Chen", "Alex Rivera", "Jordan Lee", "Chris Patel"];

export function scoreTrend(currentScore: number): Array<{ month: string; score: number }> {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const start = Math.max(40, currentScore - 18);
  const step = (currentScore - start) / (months.length - 1);
  return months.map((month, i) => ({
    month,
    score: Math.round(start + step * i),
  }));
}

export function metricDelta(seed: number, positiveIsGood = true): { value: string; tone: "up" | "down" | "neutral" } {
  const raw = (seed % 9) + 1;
  const sign = seed % 2 === 0 ? "+" : "-";
  const tone = positiveIsGood ? (sign === "+" ? "up" : "down") : sign === "+" ? "down" : "up";
  return { value: `${sign}${raw}% vs last month`, tone };
}

export function recentGeneratedReports(
  orgId: number,
  actorName: string | null,
  frameworkCodes: string[],
): RecentReport[] {
  const base = actorName?.trim() || GENERATORS[orgId % GENERATORS.length];
  const now = Date.now();
  const items: RecentReport[] = [
    {
      id: "r1",
      name: "Compliance Report — Q2 2026",
      generatedBy: base,
      generatedAt: new Date(now - 2 * 86400000).toISOString(),
      format: "PDF",
    },
    {
      id: "r2",
      name: "SOC 2 Audit Package",
      generatedBy: GENERATORS[(orgId + 1) % GENERATORS.length],
      generatedAt: new Date(now - 5 * 86400000).toISOString(),
      format: "ZIP",
    },
    {
      id: "r3",
      name: "Risk Register Export",
      generatedBy: GENERATORS[(orgId + 2) % GENERATORS.length],
      generatedAt: new Date(now - 7 * 86400000).toISOString(),
      format: "Excel",
    },
    {
      id: "r4",
      name: "Vendor Compliance Summary",
      generatedBy: base,
      generatedAt: new Date(now - 10 * 86400000).toISOString(),
      format: "PDF",
    },
    {
      id: "r5",
      name: `${frameworkCodes[0] ?? "HIPAA"} Framework Readiness`,
      generatedBy: GENERATORS[(orgId + 3) % GENERATORS.length],
      generatedAt: new Date(now - 14 * 86400000).toISOString(),
      format: "PDF",
    },
  ];
  return items;
}

export function scheduledReports(orgId: number): ScheduledReport[] {
  return [
    {
      id: "s1",
      name: "Weekly Executive Summary",
      schedule: "Every Monday at 8:00 AM",
      format: "PDF",
      recipients: ["compliance@company.com", "ceo@company.com"],
      enabled: orgId % 2 === 0,
    },
    {
      id: "s2",
      name: "Monthly Compliance Report",
      schedule: "1st of each month at 9:00 AM",
      format: "Excel",
      recipients: ["compliance@company.com", "audit@company.com"],
      enabled: true,
    },
  ];
}

export function frameworkBarColor(pct: number): string {
  if (pct >= 85) return "bg-emerald-500";
  if (pct >= 70) return "bg-teal-500";
  if (pct >= 55) return "bg-amber-500";
  if (pct >= 40) return "bg-orange-500";
  return "bg-red-400";
}

export function auditReadinessFromFramework(auditReadyPct: number, status: string): number {
  if (status === "completed") return 100;
  if (status === "cancelled") return 0;
  return Math.max(15, Math.min(98, auditReadyPct || 45));
}

export function auditDisplayStatusLabel(status: string, endDate: Date | null): string {
  if (status === "completed") return "Ready";
  if (status === "planned") return "Planning";
  if (status === "cancelled") return "Cancelled";
  if (endDate && endDate.getTime() < Date.now()) return "Overdue";
  if (status === "in_progress" || status === "fieldwork" || status === "reporting") return "In Progress";
  return "Planning";
}

export function auditStatusBadgeClass(label: string): string {
  if (label === "Ready") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
  if (label === "In Progress") return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300";
  if (label === "Overdue") return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

export function matrixBg(tone: string): string {
  switch (tone) {
    case "critical":
      return "bg-red-500/30";
    case "high":
      return "bg-red-400/20";
    case "medium":
      return "bg-amber-400/20";
    case "low":
      return "bg-yellow-400/15";
    default:
      return "bg-muted/40";
  }
}
