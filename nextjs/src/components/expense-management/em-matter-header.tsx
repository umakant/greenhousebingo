"use client";

import * as React from "react";

import { useEmWorkspaceContext } from "@/hooks/use-em-workspace-context";
import { useTranslation } from "@/contexts/translation-context";
import { useAppSettingsOptional } from "@/contexts/app-settings-context";
import { formatDate as fmtDateLib } from "@/lib/format-date";
import { cn } from "@/lib/utils";

function HeaderField({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={cn("min-w-0 space-y-0.5", className)}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-xs text-foreground break-words">{value || "—"}</p>
    </div>
  );
}

export function EmMatterHeader() {
  const { t: tLang } = useTranslation();
  const t = React.useCallback((s: string) => tLang(s) || s, [tLang]);
  const { data, loading } = useEmWorkspaceContext();
  const appSettings = useAppSettingsOptional();
  const settings = appSettings?.settings ?? {};
  const fmt = (d: string | null | undefined) => (d ? fmtDateLib(d, settings) : "—");

  if (loading && !data) {
    return (
      <div className="mb-6 rounded-lg border bg-card px-4 py-6 text-sm text-muted-foreground">
        {t("Loading matter details…")}
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="mb-6 rounded-lg border bg-card shadow-sm">
      <div className="grid gap-4 border-b px-4 py-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
        <HeaderField label={t("JSR #")} value={data.jsrNumber ?? "—"} className="lg:col-span-1" />
        <HeaderField label={t("AAR/BI Start Date")} value={fmt(data.aarStartDate)} />
        <HeaderField label={t("Matter #")} value={data.matterNumber ?? "—"} />
        <HeaderField label={t("Requesting Director")} value={data.requestingDirector ?? "—"} />
        <HeaderField label={t("AAR/BI End Date")} value={fmt(data.aarEndDate)} />
        <HeaderField label={t("Client Name")} value={data.clientName ?? "—"} />
        <HeaderField label={t("Requesting Department")} value={data.requestingDepartment ?? "—"} />
        <HeaderField label={t("Receiving Department")} value={data.receivingDepartment ?? "—"} />
        <HeaderField label={t("AAR/BI Location")} value={data.aarLocation ?? "—"} className="md:col-span-2 lg:col-span-3" />
        <HeaderField label={t("Billing POC Name")} value={data.billingPocName ?? "—"} />
        <HeaderField label={t("Billing POC Email")} value={data.billingPocEmail ?? "—"} />
        <HeaderField label={t("Client POC Name")} value={data.clientPocName ?? "—"} />
        <HeaderField label={t("Legacy Client Id")} value={data.legacyClientId ?? "—"} />
        <HeaderField label={t("D365 Client Id")} value={data.d365ClientId ?? "—"} />
      </div>
    </div>
  );
}
