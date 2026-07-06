"use client";

import * as React from "react";
import { t } from "@/lib/admin-t";


export function PerPageSelector({
  value,
  onChange,
  options = [10, 25, 50, 100],
}: {
  value: number;
  onChange: (value: number) => void;
  options?: number[];
}) {
  return (
    <select
      value={String(value)}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-10 rounded-md border border-input bg-background px-3 text-sm focus:border-primary focus:outline-none"
      aria-label={t("Rows per page")}
    >
      {options.map((n) => (
        <option key={n} value={String(n)}>
          {n} {t("per page")}
        </option>
      ))}
    </select>
  );
}

