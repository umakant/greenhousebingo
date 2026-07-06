export const COMPLIANCE_MONITOR_INTEGRATIONS = [
  "Okta",
  "AWS",
  "Microsoft 365",
  "GitHub",
  "Google Workspace",
  "Manual",
] as const;

export type MonitorDisplayStatus = "passing" | "failing" | "needs_attention" | "overdue";

export function monitorIntegrationFromName(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("mfa") || n.includes("sso")) return "Okta";
  if (n.includes("s3") || n.includes("encryption") || n.includes("backup") || n.includes("public port")) return "AWS";
  if (n.includes("employee") || n.includes("background")) return "Microsoft 365";
  if (n.includes("vendor")) return "Manual";
  if (n.includes("policy")) return "Manual";
  if (n.includes("github") || n.includes("code")) return "GitHub";
  if (n.includes("google")) return "Google Workspace";
  return "AWS";
}

export function monitorDescription(name: string, description: string | null): string {
  if (description?.trim()) return description.trim();
  const n = name.toLowerCase();
  if (n.includes("mfa")) {
    return "Ensure Multi-Factor Authentication (MFA) is enabled for all user accounts across the organization.";
  }
  if (n.includes("sso")) {
    return "Verify single sign-on is enforced for all corporate applications and identity providers.";
  }
  if (n.includes("encryption")) {
    return "Confirm encryption at rest is enabled for all storage volumes and databases.";
  }
  if (n.includes("backup")) {
    return "Validate backup jobs complete successfully and recovery points meet retention requirements.";
  }
  if (n.includes("public port")) {
    return "Ensure no unauthorized public ports are exposed on production infrastructure.";
  }
  if (n.includes("employee training")) {
    return "Track completion of mandatory security awareness training for all employees.";
  }
  if (n.includes("background")) {
    return "Verify background checks are completed for all new hires before start date.";
  }
  if (n.includes("vendor")) {
    return "Confirm vendor security reviews are completed on schedule for critical third parties.";
  }
  if (n.includes("policy")) {
    return "Ensure all compliance policies are reviewed and approved within the required cadence.";
  }
  return `${name} — automated compliance monitor with pass/fail evaluation.`;
}

export function monitorFrameworksFromName(name: string): string[] {
  const n = name.toLowerCase();
  const frameworks = new Set<string>();
  if (n.includes("mfa") || n.includes("sso") || n.includes("encryption") || n.includes("backup")) {
    frameworks.add("SOC 2");
    frameworks.add("ISO 27001");
    frameworks.add("NIST CSF");
  } else if (n.includes("vendor") || n.includes("policy")) {
    frameworks.add("SOC 2");
    frameworks.add("ISO 27001");
  } else if (n.includes("employee") || n.includes("background")) {
    frameworks.add("SOC 2");
    frameworks.add("HIPAA");
  } else {
    frameworks.add("SOC 2");
  }
  return [...frameworks];
}

export function scheduleFrequencyLabel(schedule: string | null | undefined): string {
  if (!schedule) return "Daily";
  const key = schedule.toLowerCase();
  if (key === "daily") return "Daily";
  if (key === "weekly") return "Weekly";
  if (key === "monthly") return "Monthly";
  if (key === "quarterly") return "Quarterly";
  if (key.includes("hour")) return schedule;
  return schedule.charAt(0).toUpperCase() + schedule.slice(1);
}

export function slaLabel(hours: number | null | undefined): string {
  if (hours == null) return "—";
  if (hours === 24) return "24 Hours";
  if (hours === 48) return "48 Hours";
  if (hours === 168) return "Weekly";
  if (hours >= 720) return "Quarterly";
  return `${hours} Hours`;
}

export function isMonitorOverdue(
  lastRunAt: Date | string | null | undefined,
  slaHours: number | null | undefined,
  remediationStatus: string | null | undefined,
): boolean {
  if (remediationStatus === "open") return true;
  if (!lastRunAt || !slaHours) return false;
  const last = lastRunAt instanceof Date ? lastRunAt : new Date(lastRunAt);
  if (Number.isNaN(last.getTime())) return false;
  const dueMs = last.getTime() + slaHours * 3600000;
  return dueMs < Date.now();
}

export function monitorDisplayStatus(input: {
  latestResultStatus: string | null | undefined;
  remediationStatus: string | null | undefined;
  lastRunAt: string | null | undefined;
  slaHours: number | null | undefined;
}): MonitorDisplayStatus {
  const overdue = isMonitorOverdue(input.lastRunAt, input.slaHours, input.remediationStatus);
  if (overdue && input.latestResultStatus === "fail") return "overdue";
  if (input.latestResultStatus === "pass") return "passing";
  if (input.latestResultStatus === "fail") {
    return input.remediationStatus === "open" ? "needs_attention" : "failing";
  }
  if (overdue) return "overdue";
  return "needs_attention";
}

export function monitorRiskLevel(displayStatus: MonitorDisplayStatus): { label: string; tone: "success" | "warning" | "danger" } {
  switch (displayStatus) {
    case "passing":
      return { label: "Low Risk", tone: "success" };
    case "needs_attention":
      return { label: "Medium Risk", tone: "warning" };
    case "failing":
      return { label: "High Risk", tone: "danger" };
    case "overdue":
      return { label: "Critical Risk", tone: "danger" };
  }
}

export function monitorRelatedCounts(monitorId: number) {
  return {
    controls: 2 + (monitorId % 4),
    evidence: 1 + (monitorId % 3),
    policies: 1 + (monitorId % 2),
    risks: monitorId % 3 === 0 ? 1 : 0,
  };
}

export function monitorNextRunAt(lastRunAt: string | null | undefined, schedule: string | null | undefined): string | null {
  if (!lastRunAt) return null;
  const last = new Date(lastRunAt);
  if (Number.isNaN(last.getTime())) return null;
  const next = new Date(last);
  const key = (schedule ?? "daily").toLowerCase();
  if (key === "weekly") next.setDate(next.getDate() + 7);
  else if (key === "monthly") next.setMonth(next.getMonth() + 1);
  else if (key === "quarterly") next.setMonth(next.getMonth() + 3);
  else next.setDate(next.getDate() + 1);
  return next.toISOString();
}

export function monitorCategoryTab(category: string): string {
  const c = category.toLowerCase();
  if (c.includes("security") || c.includes("access")) return "Security";
  if (c.includes("cloud")) return "Cloud";
  if (c.includes("hr")) return "HR";
  if (c.includes("vendor")) return "Vendor";
  if (c.includes("compliance")) return "Compliance";
  return "Custom";
}

export function monitorIconCategory(category: string): "security" | "cloud" | "hr" | "vendor" | "compliance" {
  const tab = monitorCategoryTab(category);
  if (tab === "Cloud") return "cloud";
  if (tab === "HR") return "hr";
  if (tab === "Vendor") return "vendor";
  if (tab === "Compliance") return "compliance";
  return "security";
}
