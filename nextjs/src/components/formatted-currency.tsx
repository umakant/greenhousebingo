"use client";

import { useAppSettingsOptional } from "@/contexts/app-settings-context";
import { formatCurrency as formatCurrencyUtil } from "@/lib/format-currency";

type Props = {
  value: number | string;
  /** Optional override when not inside AppSettingsProvider (e.g. landing). */
  settings?: Record<string, string>;
};

export function FormattedCurrency({ value, settings: settingsOverride }: Props) {
  const ctx = useAppSettingsOptional();
  const settings = (settingsOverride && Object.keys(settingsOverride).length > 0)
    ? settingsOverride
    : (ctx?.settings ?? {}) as Record<string, string>;
  const num = typeof value === "string" ? parseFloat(value) : Number(value);
  return <>{formatCurrencyUtil(Number.isFinite(num) ? num : 0, settings)}</>;
}
