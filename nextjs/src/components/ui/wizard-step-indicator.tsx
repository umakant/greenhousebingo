"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export type WizardStepIndicatorProps = {
  steps: readonly string[];
  current: number;
  completedSteps: ReadonlySet<number>;
  className?: string;
  onStepClick?: (index: number) => void;
};

/** Pill stepper — completed and current steps use theme `primary` fill. */
export function WizardStepIndicator({
  steps,
  current,
  completedSteps,
  className,
  onStepClick,
}: WizardStepIndicatorProps) {
  return (
    <ol className={cn("flex flex-wrap gap-2 border-b pb-4", className)}>
      {steps.map((label, i) => {
        const isCurrent = i === current;
        const isComplete = completedSteps.has(i);
        const isThemed = isCurrent || isComplete;
        const canNavigate = Boolean(onStepClick) && (isComplete || isCurrent);

        return (
          <li key={`${label}-${i}`}>
            <button
              type="button"
              disabled={!canNavigate}
              onClick={() => onStepClick?.(i)}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors",
                isThemed ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
                isCurrent && isThemed && "ring-2 ring-primary/30 ring-offset-2 ring-offset-background",
                canNavigate && "cursor-pointer",
                !canNavigate && "cursor-default",
              )}
            >
              {isComplete && !isCurrent ? (
                <Check className="h-3 w-3 shrink-0" aria-hidden />
              ) : (
                <span className="tabular-nums">{i + 1}</span>
              )}
              {label}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function markWizardStepComplete(completed: Set<number>, step: number): Set<number> {
  const next = new Set(completed);
  next.add(step);
  return next;
}

export function collectCompletedWizardSteps(
  stepCount: number,
  validateStep: (index: number) => string | null,
): Set<number> {
  const completed = new Set<number>();
  for (let i = 0; i < stepCount; i++) {
    if (!validateStep(i)) completed.add(i);
  }
  return completed;
}
