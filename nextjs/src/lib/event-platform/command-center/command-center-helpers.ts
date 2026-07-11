import type {
  CommandCenterMetricAvailability,
  CommandCenterNumericMetric,
} from "@/lib/event-platform/command-center/command-center-types";

export function metricAvailable(value: number): CommandCenterNumericMetric {
  return { availability: "available", value };
}

export function metricNoRecords(): CommandCenterNumericMetric {
  return { availability: "no_records", value: 0 };
}

export function metricNotConfigured(): CommandCenterNumericMetric {
  return { availability: "not_configured", value: null };
}

export function numFromDecimal(v: unknown): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : Number(v);
}

export function sumMetrics(
  parts: CommandCenterNumericMetric[],
): CommandCenterNumericMetric {
  const configured = parts.filter((p) => p.availability !== "not_configured");
  if (configured.length === 0) return metricNotConfigured();
  const total = configured.reduce((s, p) => s + (p.value ?? 0), 0);
  const hasRecords = configured.some((p) => p.availability === "available" && (p.value ?? 0) > 0);
  return {
    availability: hasRecords || total === 0 ? "available" : "no_records",
    value: Math.round(total * 100) / 100,
  };
}

export function netFromGrossAndExpenses(
  gross: CommandCenterNumericMetric,
  expenses: CommandCenterNumericMetric,
): CommandCenterNumericMetric {
  if (gross.availability === "not_configured" && expenses.availability === "not_configured") {
    return metricNotConfigured();
  }
  const g = gross.value ?? 0;
  const e = expenses.value ?? 0;
  return metricAvailable(Math.round((g - e) * 100) / 100);
}

export function profitMarginFrom(
  gross: CommandCenterNumericMetric,
  net: CommandCenterNumericMetric,
): CommandCenterNumericMetric {
  if (gross.availability === "not_configured" || net.availability === "not_configured") {
    return metricNotConfigured();
  }
  const g = gross.value ?? 0;
  if (g <= 0) return { availability: "no_records", value: 0 };
  const margin = ((net.value ?? 0) / g) * 100;
  return metricAvailable(Math.round(margin * 10) / 10);
}

export function healthStatus(score: number): {
  status: "excellent" | "on_track" | "needs_attention" | "at_risk";
  statusLabel: string;
} {
  if (score >= 90) return { status: "excellent", statusLabel: "Excellent" };
  if (score >= 75) return { status: "on_track", statusLabel: "On Track" };
  if (score >= 50) return { status: "needs_attention", statusLabel: "Needs Attention" };
  return { status: "at_risk", statusLabel: "At Risk" };
}

export function formatMetricLabel(availability: CommandCenterMetricAvailability): string {
  if (availability === "not_configured") return "Not configured";
  if (availability === "no_records") return "No data yet";
  return "";
}
