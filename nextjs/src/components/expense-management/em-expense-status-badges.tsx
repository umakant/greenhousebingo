"use client";

import { normalizeEmReportStatus, statusLabel } from "@/lib/em-expense-workflow";

/** Status pill styling aligned with HRM employee badges. */
export function EmLineStatusBadge({ status }: { status: string }) {
  const k = normalizeEmReportStatus(status);
  const map: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-100",
    submitted: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200",
    supervisor_approved: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
    approved: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200",
    rejected: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
    in_billing: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
    paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
    processed: "bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200",
  };
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${map[k] ?? "bg-muted text-foreground"}`}
    >
      {statusLabel(status)}
    </span>
  );
}

export function EmReportStatusBadge({ status }: { status: string }) {
  return <EmLineStatusBadge status={status} />;
}
