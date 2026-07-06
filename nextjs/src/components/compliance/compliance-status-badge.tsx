"use client";

import { Badge } from "@/components/ui/badge";
import type { MonitorDisplayStatus } from "@/lib/compliance/compliance-monitors";
import { categoryBadgeClass, categoryLabel } from "@/lib/compliance/compliance-integrations";
import { cn } from "@/lib/utils";

const STATUS_VARIANTS: Record<string, string> = {
  active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  published: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  complete: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  implemented: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  passing: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  pass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  pending: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  requested: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  in_review: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  not_started: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  failing: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  needs_review: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
  fail: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  open: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
  expired: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
};

export function ComplianceStatusBadge({ status, label }: { status: string; label?: string }) {
  const key = status.toLowerCase().replace(/\s+/g, "_");
  return (
    <Badge variant="outline" className={cn("border-0 font-medium capitalize", STATUS_VARIANTS[key] ?? "")}>
      {label ?? status.replace(/_/g, " ")}
    </Badge>
  );
}

export function controlStatusDisplay(status: string): { key: string; label: string } {
  switch (status) {
    case "implemented":
      return { key: "passing", label: "Passing" };
    case "in_progress":
      return { key: "needs_review", label: "Needs Review" };
    case "failing":
      return { key: "failing", label: "Failed" };
    case "not_started":
      return { key: "not_started", label: "Not Started" };
    default:
      return { key: status, label: status.replace(/_/g, " ") };
  }
}

export function ControlStatusBadge({ status }: { status: string }) {
  const { key, label } = controlStatusDisplay(status);
  return <ComplianceStatusBadge status={key} label={label} />;
}

export function evidenceStatusDisplay(status: string): { key: string; label: string } {
  switch (status) {
    case "approved":
    case "complete":
      return { key: "approved", label: "Approved" };
    case "pending":
    case "requested":
    case "draft":
      return { key: "pending", label: "Pending Review" };
    case "rejected":
      return { key: "rejected", label: "Rejected" };
    default:
      return { key: status, label: status.replace(/_/g, " ") };
  }
}

export function EvidenceStatusBadge({ status, expired }: { status: string; expired?: boolean }) {
  if (expired) return <ComplianceStatusBadge status="expired" label="Expired" />;
  const { key, label } = evidenceStatusDisplay(status);
  return <ComplianceStatusBadge status={key} label={label} />;
}

export function policyStatusDisplay(status: string): { key: string; label: string } {
  switch (status) {
    case "published":
      return { key: "published", label: "Published" };
    case "in_review":
      return { key: "pending", label: "Pending Review" };
    case "archived":
      return { key: "draft", label: "Archived" };
    case "draft":
      return { key: "draft", label: "Draft" };
    default:
      return { key: status, label: status.replace(/_/g, " ") };
  }
}

export function PolicyStatusBadge({ status }: { status: string }) {
  const { key, label } = policyStatusDisplay(status);
  return <ComplianceStatusBadge status={key} label={label} />;
}

export function documentStatusDisplay(
  status: string,
  expired?: boolean,
): { key: string; label: string } {
  if (expired) return { key: "expired", label: "Expired" };
  const key = status.toLowerCase();
  if (key === "approved" || key === "active") return { key: "approved", label: "Approved" };
  if (key === "draft" || key === "pending" || key === "in_review") {
    return { key: "pending", label: "Pending Review" };
  }
  return { key: status, label: status.replace(/_/g, " ") };
}

export function DocumentStatusBadge({ status, expired }: { status: string; expired?: boolean }) {
  const { key, label } = documentStatusDisplay(status, expired);
  return <ComplianceStatusBadge status={key} label={label} />;
}

export function monitorStatusDisplay(status: MonitorDisplayStatus): { key: string; label: string } {
  switch (status) {
    case "passing":
      return { key: "passing", label: "Passing" };
    case "failing":
      return { key: "failing", label: "Failing" };
    case "needs_attention":
      return { key: "needs_review", label: "Needs Attention" };
    case "overdue":
      return { key: "open", label: "Overdue" };
  }
}

export function MonitorStatusBadge({ status }: { status: MonitorDisplayStatus }) {
  const { key, label } = monitorStatusDisplay(status);
  const overdueStyle =
    status === "overdue"
      ? "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300"
      : undefined;
  return (
    <Badge variant="outline" className={cn("border-0 font-medium capitalize", overdueStyle ?? STATUS_VARIANTS[key] ?? "")}>
      {label}
    </Badge>
  );
}

export type { MonitorDisplayStatus };

export function riskStatusDisplay(status: string): { key: string; label: string } {
  switch (status) {
    case "open":
      return { key: "open", label: "Open" };
    case "mitigating":
      return { key: "in_progress", label: "In Progress" };
    case "accepted":
      return { key: "approved", label: "Accepted" };
    case "closed":
      return { key: "in_review", label: "Reviewed" };
    default:
      return { key: status, label: status.replace(/_/g, " ") };
  }
}

export function RiskStatusBadge({ status }: { status: string }) {
  const { key, label } = riskStatusDisplay(status);
  return <ComplianceStatusBadge status={key} label={label} />;
}

export function riskLevelDisplay(level: string): { key: string; label: string } {
  const normalized = level.charAt(0).toUpperCase() + level.slice(1).toLowerCase();
  switch (level.toLowerCase()) {
    case "critical":
    case "high":
      return { key: "failing", label: normalized === "Critical" ? "Critical" : "High" };
    case "medium":
      return { key: "pending", label: "Medium" };
    case "low":
      return { key: "approved", label: "Low" };
    default:
      return { key: "draft", label: normalized };
  }
}

export function RiskLevelBadge({ level }: { level: string }) {
  const { key, label } = riskLevelDisplay(level);
  return <ComplianceStatusBadge status={key} label={label} />;
}

export function vendorTierDisplay(tier: string): { key: string; label: string } {
  switch (tier.toLowerCase()) {
    case "critical":
    case "high":
      return { key: "failing", label: "High" };
    case "medium":
      return { key: "pending", label: "Medium" };
    case "low":
      return { key: "approved", label: "Low" };
    default:
      return { key: tier, label: tier.replace(/_/g, " ") };
  }
}

export function VendorRiskTierBadge({ tier }: { tier: string }) {
  const { key, label } = vendorTierDisplay(tier);
  return <ComplianceStatusBadge status={key} label={label} />;
}

export function vendorReviewStatusDisplay(status: string): { key: string; label: string } {
  if (status === "completed") return { key: "approved", label: "Active" };
  if (status === "pending") return { key: "in_progress", label: "Under Review" };
  return { key: status, label: status.replace(/_/g, " ") };
}

export function VendorReviewStatusBadge({ status }: { status: string }) {
  const { key, label } = vendorReviewStatusDisplay(status);
  return <ComplianceStatusBadge status={key} label={label} />;
}

export function accessReviewStatusDisplay(status: string): { key: string; label: string } {
  switch (status) {
    case "in_progress":
      return { key: "in_progress", label: "In Progress" };
    case "pending_review":
      return { key: "pending", label: "Pending Review" };
    case "completed":
      return { key: "approved", label: "Completed" };
    case "overdue":
      return { key: "failing", label: "Overdue" };
    case "scheduled":
      return { key: "draft", label: "Scheduled" };
    case "cancelled":
      return { key: "draft", label: "Cancelled" };
    default:
      return { key: status, label: status.replace(/_/g, " ") };
  }
}

export function AccessReviewStatusBadge({ status }: { status: string }) {
  const { key, label } = accessReviewStatusDisplay(status);
  return <ComplianceStatusBadge status={key} label={label} />;
}

export function vulnerabilitySeverityDisplay(severity: string): { key: string; label: string } {
  const normalized = severity.charAt(0).toUpperCase() + severity.slice(1).toLowerCase();
  switch (severity.toLowerCase()) {
    case "critical":
      return { key: "failing", label: "Critical" };
    case "high":
      return { key: "open", label: "High" };
    case "medium":
      return { key: "pending", label: "Medium" };
    case "low":
      return { key: "approved", label: "Low" };
    case "informational":
      return { key: "draft", label: "Informational" };
    default:
      return { key: severity, label: normalized };
  }
}

export function VulnerabilitySeverityBadge({ severity }: { severity: string }) {
  const { key, label } = vulnerabilitySeverityDisplay(severity);
  return <ComplianceStatusBadge status={key} label={label} />;
}

export function vulnerabilityStatusDisplay(status: string): { key: string; label: string } {
  switch (status) {
    case "open":
      return { key: "failing", label: "Open" };
    case "in_progress":
      return { key: "in_progress", label: "In Progress" };
    case "remediated":
      return { key: "approved", label: "Resolved" };
    case "accepted":
    case "false_positive":
      return { key: "draft", label: "Ignored" };
    default:
      return { key: status, label: status.replace(/_/g, " ") };
  }
}

export function VulnerabilityStatusBadge({ status }: { status: string }) {
  const { key, label } = vulnerabilityStatusDisplay(status);
  return <ComplianceStatusBadge status={key} label={label} />;
}

export function trustProfileStatusDisplay(status: string): { key: string; label: string; className?: string } {
  switch (status) {
    case "published":
      return {
        key: "approved",
        label: "Published",
        className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
      };
    case "in_review":
      return {
        key: "in_progress",
        label: "In Review",
        className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
      };
    case "draft":
      return {
        key: "draft",
        label: "Draft",
        className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      };
    default:
      return { key: status, label: status.replace(/_/g, " ") };
  }
}

export function TrustProfileStatusBadge({ status }: { status: string }) {
  const { label, className } = trustProfileStatusDisplay(status);
  return (
    <Badge variant="outline" className={cn("border-0 font-medium", className ?? "")}>
      {label}
    </Badge>
  );
}

export function trustVisibilityDisplay(visibility: string): { label: string } {
  switch (visibility) {
    case "public":
      return { label: "Public" };
    case "unlisted":
      return { label: "Unlisted" };
    case "private":
      return { label: "Private" };
    default:
      return { label: visibility.replace(/_/g, " ") };
  }
}

export function integrationStatusDisplay(
  displayStatus: string,
): { key: string; label: string; className?: string } {
  switch (displayStatus) {
    case "connected":
      return {
        key: "approved",
        label: "Connected",
        className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
      };
    case "needs_attention":
      return {
        key: "pending",
        label: "Needs Attention",
        className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
      };
    case "disconnected":
      return {
        key: "failing",
        label: "Disconnected",
        className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
      };
    case "syncing":
      return {
        key: "in_progress",
        label: "In Progress",
        className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
      };
    default:
      return { key: displayStatus, label: displayStatus.replace(/_/g, " ") };
  }
}

export function IntegrationStatusBadge({ displayStatus }: { displayStatus: string }) {
  const { label, className } = integrationStatusDisplay(displayStatus);
  return (
    <Badge variant="outline" className={cn("border-0 font-medium", className ?? "")}>
      {label}
    </Badge>
  );
}

export function IntegrationCategoryBadge({ category }: { category: string }) {
  return (
    <Badge variant="outline" className={cn("border-0 font-medium", categoryBadgeClass(category))}>
      {categoryLabel(category)}
    </Badge>
  );
}

export function auditTypeDisplay(auditType: string): { key: string; label: string; className?: string } {
  if (auditType === "internal") {
    return {
      key: "approved",
      label: "Internal",
      className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
    };
  }
  return {
    key: "in_review",
    label: "External",
    className: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
  };
}

export function AuditTypeBadge({ auditType }: { auditType: string }) {
  const { label, className } = auditTypeDisplay(auditType);
  return (
    <Badge variant="outline" className={cn("border-0 font-medium", className)}>
      {label}
    </Badge>
  );
}

export function auditDisplayStatusBadge(
  displayStatus: string,
): { key: string; label: string; className?: string } {
  switch (displayStatus) {
    case "in_progress":
      return {
        key: "in_progress",
        label: "In Progress",
        className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
      };
    case "upcoming":
      return {
        key: "in_review",
        label: "Upcoming",
        className: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-300",
      };
    case "completed":
      return {
        key: "approved",
        label: "Completed",
        className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
      };
    case "overdue":
      return {
        key: "failing",
        label: "Overdue",
        className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
      };
    case "cancelled":
      return { key: "draft", label: "Cancelled" };
    default:
      return { key: displayStatus, label: displayStatus.replace(/_/g, " ") };
  }
}

export function AuditDisplayStatusBadge({ displayStatus }: { displayStatus: string }) {
  const { label, className } = auditDisplayStatusBadge(displayStatus);
  return (
    <Badge variant="outline" className={cn("border-0 font-medium", className ?? STATUS_VARIANTS[displayStatus] ?? "")}>
      {label}
    </Badge>
  );
}

export function taskPriorityDisplay(priority: string): { key: string; label: string; className?: string } {
  switch (priority) {
    case "high":
      return {
        key: "failing",
        label: "High",
        className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
      };
    case "low":
      return {
        key: "approved",
        label: "Low",
        className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
      };
    default:
      return {
        key: "pending",
        label: "Medium",
        className: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
      };
  }
}

export function TaskPriorityBadge({ priority }: { priority: string }) {
  const { label, className } = taskPriorityDisplay(priority);
  return (
    <Badge variant="outline" className={cn("border-0 font-medium", className ?? "")}>
      {label}
    </Badge>
  );
}

export function taskDisplayStatusBadge(
  displayStatus: string,
): { key: string; label: string; className?: string } {
  switch (displayStatus) {
    case "open":
      return {
        key: "pending",
        label: "Open",
        className: "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300",
      };
    case "in_progress":
      return {
        key: "in_progress",
        label: "In Progress",
        className: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
      };
    case "due_soon":
      return {
        key: "pending",
        label: "Due Soon",
        className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300",
      };
    case "overdue":
      return {
        key: "failing",
        label: "Overdue",
        className: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
      };
    case "done":
      return {
        key: "approved",
        label: "Completed",
        className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
      };
    default:
      return { key: displayStatus, label: displayStatus.replace(/_/g, " ") };
  }
}

export function TaskStatusBadge({ displayStatus }: { displayStatus: string }) {
  const { label, className } = taskDisplayStatusBadge(displayStatus);
  return (
    <Badge variant="outline" className={cn("border-0 font-medium", className ?? STATUS_VARIANTS[displayStatus] ?? "")}>
      {label}
    </Badge>
  );
}

export function ComplianceProgressBar({ value, className }: { value: number; className?: string }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: "#E31B23" }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  );
}
