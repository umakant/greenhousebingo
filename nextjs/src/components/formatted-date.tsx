"use client";

import { useAppSettingsOptional } from "@/contexts/app-settings-context";
import { formatDate, formatDateTime } from "@/lib/format-date";

type Props = {
  value: string | Date | number | null | undefined;
  /** If true, also shows the time portion using timeFormat setting. */
  withTime?: boolean;
  /** Shown when value is null/invalid. */
  fallback?: string;
  /** Optional settings override (when used outside AppSettingsProvider). */
  settings?: Record<string, string>;
};

export function FormattedDate({ value, withTime = false, fallback = "—", settings: settingsOverride }: Props) {
  const ctx = useAppSettingsOptional();
  const settings =
    settingsOverride && Object.keys(settingsOverride).length > 0
      ? settingsOverride
      : (ctx?.settings ?? {});
  return <>{withTime ? formatDateTime(value, settings, fallback) : formatDate(value, settings, fallback)}</>;
}
