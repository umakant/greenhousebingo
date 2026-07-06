export type VulnerabilityDisplayStatus = "open" | "in_progress" | "resolved" | "ignored";

const OWNER_POOL = [
  "Sarah Johnson",
  "Mike Chen",
  "Alex Rivera",
  "Jordan Lee",
  "Taylor Brooks",
  "Chris Patel",
  "Emily Watson",
];

const SYSTEM_NAMES = [
  "Payment Service",
  "Customer Portal",
  "Internal API",
  "Analytics Pipeline",
  "Auth Gateway",
];

const ENVIRONMENTS = ["Production", "Staging", "Production", "Production", "Production"];

export function vulnerabilityOwnerName(id: number, ownerName: string | null | undefined): string | null {
  if (ownerName?.trim()) return ownerName.trim();
  if (id % 4 === 0) return null;
  return OWNER_POOL[id % OWNER_POOL.length];
}

export function cvssFromSeverity(severity: string, id: number): number {
  const base: Record<string, number> = {
    critical: 9.4,
    high: 7.8,
    medium: 5.4,
    low: 3.1,
    informational: 0.0,
  };
  const seed = (id % 7) * 0.1;
  const score = (base[severity.toLowerCase()] ?? 5.0) + seed;
  return Math.min(10, Math.round(score * 10) / 10);
}

export function systemFromAsset(assetName: string | null | undefined, id: number): {
  systemName: string;
  environment: string;
} {
  if (assetName?.startsWith("server-")) {
    const idx = Math.max(0, parseInt(assetName.replace("server-", ""), 10) - 1) % SYSTEM_NAMES.length;
    return { systemName: SYSTEM_NAMES[idx], environment: ENVIRONMENTS[idx] };
  }
  if (assetName?.trim()) {
    const env = id % 5 === 0 ? "Staging" : "Production";
    return { systemName: assetName.trim(), environment: env };
  }
  const idx = id % SYSTEM_NAMES.length;
  return { systemName: SYSTEM_NAMES[idx], environment: ENVIRONMENTS[idx] };
}

export function vulnerabilityDisplayStatus(status: string): VulnerabilityDisplayStatus {
  switch (status) {
    case "in_progress":
      return "in_progress";
    case "remediated":
      return "resolved";
    case "accepted":
    case "false_positive":
      return "ignored";
    default:
      return "open";
  }
}

export function vulnerabilityDescription(title: string, cveId: string | null): string {
  const t = title.toLowerCase();
  if (t.includes("log4j") || cveId === "CVE-2021-44228") {
    return "Apache Log4j2 JNDI features do not protect against attacker-controlled LDAP and other JNDI-related endpoints, allowing remote code execution when logs are processed.";
  }
  if (t.includes("xss")) {
    return "Cross-site scripting vulnerability allows attackers to inject malicious scripts into web pages viewed by other users, potentially leading to session hijacking or data theft.";
  }
  if (cveId) {
    return `${title} (${cveId}) — a known security vulnerability requiring assessment, prioritization, and remediation on affected systems.`;
  }
  return `${title} — security vulnerability identified during scanning or assessment. Review affected assets and apply patches or compensating controls.`;
}

export function vulnerabilityLikelihood(severity: string): string {
  switch (severity.toLowerCase()) {
    case "critical":
    case "high":
      return "High";
    case "medium":
      return "Medium";
    default:
      return "Low";
  }
}

export function vulnerabilityImpact(severity: string): string {
  switch (severity.toLowerCase()) {
    case "critical":
      return "Critical";
    case "high":
      return "High";
    case "medium":
      return "Medium";
    default:
      return "Low";
  }
}

export function relatedAssets(
  assetName: string | null | undefined,
  id: number,
): Array<{ hostname: string; type: string }> {
  const { systemName } = systemFromAsset(assetName, id);
  const slug = systemName.toLowerCase().replace(/\s+/g, "-");
  const host = assetName?.startsWith("server-")
    ? `${slug}-${String((id % 3) + 1).padStart(2, "0")}.far.com`
    : `${slug}.far.com`;
  return [
    { hostname: host, type: "Application Server" },
    ...(id % 3 === 0 ? [{ hostname: `lb-${slug}.far.com`, type: "Load Balancer" }] : []),
  ];
}

export function vulnerabilityLinkedCounts(id: number) {
  return {
    risks: 1 + (id % 3),
    controls: 2 + (id % 4),
  };
}

export function daysUntilDue(dueDate: string | null | undefined): string | null {
  if (!dueDate) return null;
  const days = Math.ceil((new Date(dueDate).getTime() - Date.now()) / 86400000);
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "1 day left";
  return `${days} days left`;
}

export function dueDateFromDiscovered(discoveredAt: string | null | undefined, severity: string, id: number): string | null {
  if (!discoveredAt) return null;
  const base = new Date(discoveredAt);
  if (Number.isNaN(base.getTime())) return null;
  const slaDays: Record<string, number> = { critical: 7, high: 14, medium: 30, low: 90, informational: 180 };
  const days = slaDays[severity.toLowerCase()] ?? 30;
  base.setDate(base.getDate() + days + (id % 5));
  return base.toISOString();
}

export function lastSeenAt(discoveredAt: string | null | undefined, updatedAt: string | null | undefined): string | null {
  return updatedAt ?? discoveredAt ?? null;
}

export function severityTabMatch(severity: string, tab: string): boolean {
  if (tab === "all") return true;
  if (tab === "resolved" || tab === "ignored") return false;
  return severity.toLowerCase() === tab;
}

export function statusTabMatch(displayStatus: VulnerabilityDisplayStatus, tab: string): boolean {
  if (tab === "all") return true;
  if (tab === "resolved") return displayStatus === "resolved";
  if (tab === "ignored") return displayStatus === "ignored";
  return false;
}

export function cvssGaugeColor(score: number): string {
  if (score >= 9) return "#dc2626";
  if (score >= 7) return "#ea580c";
  if (score >= 4) return "#ca8a04";
  if (score > 0) return "#16a34a";
  return "#94a3b8";
}
