import type { StorefrontSetupOverviewPayload } from "@/lib/storefront/setup-status";
import {
  pickNextStorefrontSetupStep,
  type StorefrontSetupStepId,
  type StorefrontSetupStepSnapshot,
} from "@/lib/storefront/setup-types";

/** High-level numbers for dashboards, headers, and API responses. */
export function getStorefrontSetupMetrics(overview: StorefrontSetupOverviewPayload) {
  const total = overview.total;
  const completed = overview.completedCount;
  const remaining = Math.max(0, total - completed);
  return {
    total,
    completed,
    remaining,
    percent: overview.percent,
    isComplete: total > 0 && completed >= total,
    hasWebsite: overview.websites.length > 0,
    focusWebsiteId: overview.focusWebsiteId,
  };
}

export function getStorefrontSetupIncompleteSteps(
  overview: StorefrontSetupOverviewPayload,
): StorefrontSetupStepSnapshot[] {
  return overview.steps.filter((s) => !s.completed);
}

export function getStorefrontSetupCompletedSteps(
  overview: StorefrontSetupOverviewPayload,
): StorefrontSetupStepSnapshot[] {
  return overview.steps.filter((s) => s.completed);
}

/** Next recommended step, or null when every step is done (or there are zero steps). */
export function getNextStorefrontSetupAction(overview: StorefrontSetupOverviewPayload) {
  return pickNextStorefrontSetupStep(overview.steps);
}

/** Group steps for segmented progress UIs. */
export function groupStorefrontSetupStepsBySource(overview: StorefrontSetupOverviewPayload) {
  const derived = overview.steps.filter((s) => s.source === "derived");
  const manual = overview.steps.filter((s) => s.source === "manual");
  return {
    derived,
    manual,
    derivedCompleted: derived.filter((s) => s.completed).length,
    manualCompleted: manual.filter((s) => s.completed).length,
  };
}

/** Whether a specific checklist id is done (read-only helper). */
export function isStorefrontSetupStepDone(
  overview: StorefrontSetupOverviewPayload,
  stepId: StorefrontSetupStepId,
): boolean {
  return overview.steps.some((s) => s.id === stepId && s.completed);
}
