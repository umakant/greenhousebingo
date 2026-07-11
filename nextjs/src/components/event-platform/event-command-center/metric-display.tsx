import type {
  CommandCenterMetricAvailability,
  CommandCenterNumericMetric,
} from "@/lib/event-platform/command-center/command-center-types";
import { cn } from "@/lib/utils";

export function formatMetricValue(
  metric: CommandCenterNumericMetric,
  formatter?: (value: number) => string,
): string {
  if (metric.availability === "not_configured") return "—";
  const v = metric.value ?? 0;
  if (metric.availability === "no_records" && v === 0) return "0";
  return formatter ? formatter(v) : String(v);
}

export function metricSublabel(metric: CommandCenterNumericMetric): string | undefined {
  if (metric.availability === "not_configured") return "Not configured";
  if (metric.availability === "no_records") return "No records yet";
  return undefined;
}

export function availabilityBadgeClass(availability: CommandCenterMetricAvailability): string {
  if (availability === "not_configured") return "bg-muted text-muted-foreground";
  if (availability === "no_records") return "bg-sky-500/15 text-sky-700 dark:text-sky-400";
  return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
}

export function MetricValue(props: {
  metric: CommandCenterNumericMetric;
  formatter?: (value: number) => string;
  className?: string;
  unavailableClassName?: string;
}) {
  const unavailable = props.metric.availability === "not_configured";
  return (
    <span
      className={cn(
        "tabular-nums",
        unavailable && (props.unavailableClassName ?? "text-muted-foreground"),
        props.className,
      )}
    >
      {formatMetricValue(props.metric, props.formatter)}
    </span>
  );
}
