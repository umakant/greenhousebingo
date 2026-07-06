export type AccessReviewDisplayStatus =
  | "in_progress"
  | "pending_review"
  | "completed"
  | "overdue"
  | "scheduled"
  | "cancelled";

export function accessReviewSystemFromName(name: string, scope: string | null): string {
  const text = `${name} ${scope ?? ""}`.toLowerCase();
  if (text.includes("okta")) return "Okta";
  if (text.includes("aws") || text.includes("amazon")) return "AWS";
  if (text.includes("github")) return "GitHub";
  if (text.includes("google")) return "Google Workspace";
  if (text.includes("microsoft") || text.includes("365")) return "Microsoft 365";
  if (text.includes("admin")) return "Okta";
  if (text.includes("production") || text.includes("employee")) return "Internal Apps";
  return "Internal Systems";
}

export function accessReviewTypeFromName(name: string, scope: string | null): string {
  const text = `${name} ${scope ?? ""}`.toLowerCase();
  if (text.includes("admin") || text.includes("privileged")) return "Privileged Access";
  return "User Access";
}

export function accessReviewDescription(name: string, scope: string | null): string {
  const system = accessReviewSystemFromName(name, scope);
  return `Quarterly certification of user access for ${system}. Reviewers validate that each account still requires access based on role and business need.`;
}

export function accessReviewDisplayStatus(
  status: string,
  dueDate: string | null | undefined,
): AccessReviewDisplayStatus {
  if (dueDate && status !== "completed" && status !== "cancelled") {
    const due = new Date(dueDate);
    if (!Number.isNaN(due.getTime()) && due < new Date()) return "overdue";
  }
  if (status === "in_progress") return "in_progress";
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";
  if (status === "scheduled") return "pending_review";
  return "scheduled";
}

export function accessReviewProgress(
  id: number,
  approvedCount: number,
  revokedCount: number,
  exceptionCount: number,
  status: string,
): {
  usersInScope: number;
  reviewed: number;
  pending: number;
  modified: number;
  removed: number;
  approved: number;
  progressPct: number;
} {
  const usersInScope = 120 + (id % 7) * 32;
  const reviewedFromCounts = approvedCount + revokedCount + exceptionCount;
  const reviewed =
    reviewedFromCounts > 0
      ? reviewedFromCounts
      : status === "completed"
        ? usersInScope
        : status === "in_progress"
          ? Math.round(usersInScope * (0.45 + (id % 5) * 0.05))
          : status === "scheduled"
            ? 0
            : Math.round(usersInScope * 0.65);
  const approved = approvedCount || Math.round(reviewed * 0.88);
  const removed = revokedCount || Math.round(reviewed * 0.07);
  const modified = exceptionCount || Math.round(reviewed * 0.05);
  const pending = Math.max(0, usersInScope - reviewed);
  const progressPct = usersInScope ? Math.round((reviewed / usersInScope) * 100) : 0;
  return { usersInScope, reviewed, pending, modified, removed, approved, progressPct };
}

export function accessReviewReviewers(id: number, ownerName: string | null): string[] {
  const base = ownerName ? [ownerName] : ["Sarah Johnson"];
  const extras = ["Mike Jones", "Emily Chen", "David Park", "Lisa Wong", "James Miller"];
  const count = 3 + (id % 4);
  return [...base, ...extras].slice(0, count);
}

export function daysUntilDue(value: string | null | undefined): string | null {
  if (!value) return null;
  const days = Math.ceil((new Date(value).getTime() - Date.now()) / 86400000);
  if (days < 0) return `${Math.abs(days)} days overdue`;
  if (days === 0) return "Today";
  return `${days} days left`;
}

export function dueDateTone(displayStatus: AccessReviewDisplayStatus): "success" | "warning" | "danger" | "info" {
  if (displayStatus === "overdue") return "danger";
  if (displayStatus === "pending_review" || displayStatus === "scheduled") return "info";
  if (displayStatus === "in_progress") return "warning";
  return "success";
}

export function accessReviewStartDate(createdAt: string | null | undefined): string | null {
  return createdAt ?? null;
}

export function systemInfoFromName(name: string, scope: string | null) {
  const system = accessReviewSystemFromName(name, scope);
  const usersInScope = 200 + (name.length % 150);
  return {
    system,
    connected: true,
    lastSync: new Date(Date.now() - 2 * 3600000).toISOString(),
    totalUsers: usersInScope,
    groups: 12 + (name.length % 20),
    ssoEnabled: system !== "Internal Apps",
  };
}
