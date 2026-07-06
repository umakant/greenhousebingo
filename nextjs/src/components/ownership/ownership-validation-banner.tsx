"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

export type OwnershipValidationState = {
  isValid: boolean;
  currentAssignedOwnership: number;
  requestedOwnership: number;
  totalAfterChange: number;
  availableOwnership: number;
  conflictMessage: string | null;
  fieldErrors?: string[];
};

type Props = {
  validation: OwnershipValidationState | null;
  loading?: boolean;
  className?: string;
};

export function OwnershipValidationBanner({ validation, loading, className }: Props) {
  if (loading) {
    return (
      <div className={cn("rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground", className)}>
        Checking ownership…
      </div>
    );
  }
  if (!validation) return null;

  if (validation.fieldErrors && validation.fieldErrors.length > 0) {
    return (
      <div className={cn("rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm", className)}>
        <div className="flex items-start gap-2 font-medium text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Validation Error
        </div>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-destructive/90">
          {validation.fieldErrors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (!validation.isValid) {
    return (
      <div className={cn("rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm", className)}>
        <div className="flex items-start gap-2 font-semibold text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          Ownership Conflict
        </div>
        <p className="mt-1 text-destructive/90">
          {validation.conflictMessage ?? "This ownership change would exceed 100%."}
        </p>
        <dl className="mt-3 grid gap-1 text-muted-foreground">
          <div className="flex justify-between gap-4">
            <dt>Current Assigned Ownership</dt>
            <dd className="font-medium text-foreground">{validation.currentAssignedOwnership}%</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Requested Ownership</dt>
            <dd className="font-medium text-foreground">{validation.requestedOwnership}%</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Total Would Become</dt>
            <dd className="font-medium text-destructive">{validation.totalAfterChange}%</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Available Ownership</dt>
            <dd className="font-medium text-foreground">{validation.availableOwnership}%</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          Reduce another holder&apos;s ownership or lower the requested ownership before saving.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-lg border border-emerald-500/40 bg-emerald-50 p-4 text-sm dark:bg-emerald-950/20", className)}>
      <div className="flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-400">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Valid: Total ownership will remain within 100%.
      </div>
      <dl className="mt-2 grid gap-1 text-muted-foreground">
        <div className="flex justify-between gap-4">
          <dt>Available Ownership</dt>
          <dd className="font-medium text-foreground">{validation.availableOwnership}%</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Total After Change</dt>
          <dd className="font-medium text-foreground">{validation.totalAfterChange}%</dd>
        </div>
      </dl>
    </div>
  );
}
