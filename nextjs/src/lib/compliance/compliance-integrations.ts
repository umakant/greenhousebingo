export type IntegrationDisplayStatus = "connected" | "needs_attention" | "disconnected" | "syncing";

const OWNER_POOL = ["Sarah Johnson", "Mike Chen", "Alex Rivera", "Jordan Lee", "Chris Patel"];

export function integrationDisplayStatus(status: string): IntegrationDisplayStatus {
  if (status === "error" || status === "needs_attention") return "needs_attention";
  if (status === "disconnected") return "disconnected";
  if (status === "syncing" || status === "in_progress") return "syncing";
  return "connected";
}

export function integrationSyncMode(displayStatus: IntegrationDisplayStatus): string {
  switch (displayStatus) {
    case "connected":
      return "Auto-sync";
    case "needs_attention":
      return "Manual sync";
    case "disconnected":
      return "Re-auth required";
    case "syncing":
      return "Syncing";
  }
}

export function categoryLabel(category: string): string {
  const map: Record<string, string> = {
    cloud: "Cloud",
    devops: "DevOps",
    identity: "Identity",
    collaboration: "Collaboration",
    project: "Productivity",
    security: "Monitoring",
    observability: "Monitoring",
  };
  return map[category] ?? category.charAt(0).toUpperCase() + category.slice(1);
}

export function categoryBadgeClass(category: string): string {
  switch (category) {
    case "cloud":
      return "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300";
    case "identity":
      return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300";
    case "devops":
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300";
    case "collaboration":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
    case "project":
      return "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300";
    case "security":
    case "observability":
      return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300";
    default:
      return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  }
}

export function systemUseCase(provider: string, category: string): string {
  if (provider === "aws") return "Infrastructure & Security";
  if (provider === "azure" || provider === "gcp") return "Cloud Infrastructure";
  if (provider === "okta" || provider === "google_workspace" || provider === "microsoft_365") return "SSO & Users";
  if (provider === "github" || provider === "gitlab") return "Source Code & CI/CD";
  if (provider === "slack") return "Team Messaging";
  if (provider === "jira" || provider === "asana") return "Project Tracking";
  if (provider === "crowdstrike" || provider === "sentinelone" || provider === "jamf") return "Endpoint Security";
  if (provider === "datadog") return "Observability & Alerts";
  return `${categoryLabel(category)} Integration`;
}

export function accountSubtitle(provider: string): string {
  const map: Record<string, string> = {
    aws: "AWS Account",
    azure: "Azure Subscription",
    gcp: "GCP Project",
    github: "GitHub Organization",
    gitlab: "GitLab Group",
    google_workspace: "Google Workspace",
    microsoft_365: "Microsoft 365 Tenant",
    okta: "Okta Org",
    slack: "Slack Workspace",
    jira: "Jira Cloud",
    asana: "Asana Workspace",
    crowdstrike: "CrowdStrike CID",
    jamf: "Jamf Pro",
    sentinelone: "SentinelOne Site",
    datadog: "Datadog Org",
  };
  return map[provider] ?? "Connected Account";
}

export function connectedAccountEmail(provider: string, connectedBy: string | undefined, id: number): string {
  if (connectedBy?.includes("@")) return connectedBy;
  const slug = provider.replace(/_/g, "");
  return `compliance+${slug}@company.com`;
}

export function integrationOwner(provider: string, id: number | null): string {
  const seed = (id ?? provider.charCodeAt(0)) % OWNER_POOL.length;
  return OWNER_POOL[seed];
}

export function nextSyncIn(lastSyncAt: string | null | undefined, displayStatus: IntegrationDisplayStatus): string | null {
  if (displayStatus === "disconnected") return null;
  if (displayStatus === "syncing") return "Syncing now";
  if (!lastSyncAt) return "Pending first sync";
  const next = new Date(lastSyncAt).getTime() + 30 * 60 * 1000;
  const mins = Math.ceil((next - Date.now()) / 60000);
  if (mins <= 0) return "Due now";
  if (mins < 60) return `in ${mins} min`;
  return `in ${Math.round(mins / 60)} hr`;
}

export function lastSyncTone(displayStatus: IntegrationDisplayStatus, lastLogStatus?: string): "success" | "warning" | "neutral" | "syncing" {
  if (displayStatus === "syncing") return "syncing";
  if (displayStatus === "needs_attention" || lastLogStatus === "error") return "warning";
  if (displayStatus === "connected") return "success";
  return "neutral";
}

export function syncHealth(provider: string, id: number | null, displayStatus: IntegrationDisplayStatus) {
  const seed = (id ?? provider.length * 7) % 20;
  const base = displayStatus === "connected" ? 240 + seed : displayStatus === "needs_attention" ? 180 + seed : 0;
  const failed = displayStatus === "needs_attention" ? 2 + (seed % 3) : displayStatus === "connected" ? seed % 2 : 0;
  const skipped = displayStatus === "connected" ? 1 + (seed % 2) : 0;
  const successful = Math.max(0, base - failed - skipped);
  return {
    resourcesSynced: base,
    successful,
    failed,
    skipped,
  };
}

export function dataCoverage(provider: string, id: number | null) {
  const seed = (id ?? provider.length * 11) % 15;
  const overallPct = displayStatusPct(provider, seed);
  const total = 220 + seed * 3;
  const inScope = Math.round(total * (overallPct / 100));
  const partial = Math.round(total * 0.05);
  const outOfScope = Math.max(0, total - inScope - partial);
  return {
    overallPct,
    inScope: { count: inScope, pct: Math.round((inScope / total) * 100) },
    partial: { count: partial, pct: Math.round((partial / total) * 100) },
    outOfScope: { count: outOfScope, pct: Math.round((outOfScope / total) * 100) },
    total,
  };
}

function displayStatusPct(provider: string, seed: number): number {
  if (provider === "aws") return 92;
  if (provider === "okta") return 88;
  return 75 + (seed % 20);
}

export function integrationStats(items: Array<{ displayStatus: IntegrationDisplayStatus }>) {
  const total = items.length;
  const connected = items.filter((i) => i.displayStatus === "connected").length;
  const needsAttention = items.filter((i) => i.displayStatus === "needs_attention").length;
  const disconnected = items.filter((i) => i.displayStatus === "disconnected").length;
  const syncing = items.filter((i) => i.displayStatus === "syncing").length;
  const pct = (n: number) => (total ? `${Math.round((n / total) * 100)}%` : "0%");
  return {
    total,
    connected,
    needsAttention,
    disconnected,
    syncing,
    connectedPct: pct(connected),
    needsAttentionPct: pct(needsAttention),
    disconnectedPct: pct(disconnected),
    syncingPct: pct(syncing),
  };
}

export function integrationAccessRole(provider: string): string {
  if (provider === "aws") return "Read Only (IAM Role)";
  if (provider === "github" || provider === "gitlab") return "Read Only (App)";
  return "Read Only";
}

export function integrationTip(provider: string): string | null {
  if (provider === "aws") {
    return "Ensure the IAM role has read-only access to maintain security and compliance.";
  }
  if (provider === "okta") {
    return "Use a dedicated API token with read-only scopes for user and group data.";
  }
  return null;
}

export function providerIconColor(provider: string): string {
  const map: Record<string, string> = {
    aws: "bg-orange-100 text-orange-700",
    azure: "bg-sky-100 text-sky-700",
    gcp: "bg-blue-100 text-blue-700",
    github: "bg-slate-100 text-slate-800",
    gitlab: "bg-orange-100 text-orange-600",
    google_workspace: "bg-emerald-100 text-emerald-700",
    microsoft_365: "bg-blue-100 text-blue-700",
    okta: "bg-indigo-100 text-indigo-700",
    slack: "bg-violet-100 text-violet-700",
    jira: "bg-blue-100 text-blue-600",
    datadog: "bg-violet-100 text-violet-600",
    crowdstrike: "bg-red-100 text-red-700",
  };
  return map[provider] ?? "bg-muted text-muted-foreground";
}
