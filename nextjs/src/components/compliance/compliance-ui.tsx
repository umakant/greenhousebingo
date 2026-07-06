"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** Brand accent from compliance mockups */
export const COMPLIANCE_BRAND = "#E31B23";

export const complianceCardClass =
  "rounded-lg border border-border/80 bg-card shadow-sm";

export const complianceTableHeadClass =
  "border-b bg-muted/30 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground";

export const complianceTableRowClass = "border-b border-border/60 hover:bg-muted/30 transition-colors";

export {
  ComplianceAddressField,
  ComplianceDate,
  ComplianceDateField,
  ComplianceHistoryButton,
  CompliancePhoneField,
  ComplianceRowActions,
  complianceFormatPhoneDisplay,
  complianceRelativeTime,
  complianceUnformatPhone,
  useComplianceFormat,
} from "@/components/compliance/compliance-shared";

type StatItem = {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "success" | "warning" | "danger";
};

export function CompliancePageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description ? <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function CompliancePrimaryButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      size="sm"
      className={cn("text-white hover:opacity-90", className)}
      style={{ backgroundColor: COMPLIANCE_BRAND }}
      {...props}
    />
  );
}

export function ComplianceStatGrid({ stats }: { stats: StatItem[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
      {stats.map((s) => (
        <Card key={s.label} className={complianceCardClass}>
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p
              className={cn(
                "mt-1 text-2xl font-bold tabular-nums",
                s.tone === "success" && "text-emerald-600",
                s.tone === "warning" && "text-amber-600",
                s.tone === "danger" && "text-red-600",
              )}
            >
              {s.value}
            </p>
            {s.hint ? <p className="mt-0.5 text-xs text-muted-foreground">{s.hint}</p> : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ComplianceSectionShell({
  title,
  description,
  actions,
  stats,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  stats?: StatItem[];
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <CompliancePageHeader title={title} description={description} actions={actions} />
      {stats?.length ? <ComplianceStatGrid stats={stats} /> : null}
      {children}
    </div>
  );
}

export function ComplianceOutlineLinkButton({
  href,
  children,
  icon,
}: {
  href: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <Button size="sm" variant="outline" asChild>
      <Link href={href}>
        {icon}
        {children}
      </Link>
    </Button>
  );
}
