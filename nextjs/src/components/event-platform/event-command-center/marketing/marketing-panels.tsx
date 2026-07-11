"use client";

import type { EventMarketingOverview, MarketingMetricValue } from "@/lib/event-platform/event-marketing/event-marketing-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function fmtMetric(m: MarketingMetricValue, currency?: string, suffix = "") {
  if (m.notAvailable || m.value == null) return m.label ?? "Not Available";
  if (currency && suffix !== "%") {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(m.value);
  }
  if (suffix === "%") return `${m.value.toFixed(1)}%`;
  return String(m.value);
}

export function MarketingSummaryCards(props: { summary: EventMarketingOverview["summary"] | null; loading?: boolean }) {
  if (props.loading || !props.summary) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="h-14 animate-pulse bg-muted/40 p-4" />
          </Card>
        ))}
      </div>
    );
  }

  const s = props.summary;
  const c = s.currency;
  const items = [
    { label: "Total registrations", value: String(s.totalRegistrations) },
    { label: "Attributed registrations", value: String(s.attributedRegistrations) },
    { label: "Organic / direct", value: String(s.organicRegistrations) },
    { label: "Affiliate registrations", value: String(s.affiliateRegistrations) },
    { label: "Venue registrations", value: String(s.venueRegistrations) },
    { label: "Referral registrations", value: String(s.referralRegistrations) },
    { label: "Promotion-code registrations", value: String(s.promotionCodeRegistrations) },
    { label: "Ad spend", value: fmtMetric(s.adSpend, c) },
    { label: "Cost per registration", value: fmtMetric(s.costPerRegistration, c) },
    { label: "Attributed revenue", value: fmtMetric(s.attributedRevenue, c) },
    { label: "Return on ad spend", value: fmtMetric(s.returnOnAdSpend) },
    { label: "Conversion rate", value: fmtMetric(s.conversionRate, undefined, "%") },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} className="shadow-sm">
          <CardContent className="p-3 sm:p-4">
            <p className="text-xs text-muted-foreground">{item.label}</p>
            <p className="text-lg font-bold tabular-nums">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function MarketingChartBlock(props: {
  title: string;
  points: Array<{ label: string; registrations?: number; revenue?: number; spend?: number | null; conversionRate?: number | null }>;
  field: "registrations" | "revenue" | "spend" | "conversionRate";
  currency?: string;
}) {
  const max = Math.max(
    1,
    ...props.points.map((p) => {
      const v = p[props.field];
      return v == null ? 0 : Math.abs(v);
    }),
  );

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{props.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {props.points.length === 0 ? (
          <p className="text-xs text-muted-foreground">No data for this view.</p>
        ) : (
          props.points.map((p) => {
            const raw = p[props.field] ?? 0;
            const display =
              props.field === "revenue" || props.field === "spend"
                ? raw
                  ? new Intl.NumberFormat(undefined, { style: "currency", currency: props.currency ?? "USD" }).format(raw)
                  : "N/A"
                : props.field === "conversionRate"
                  ? raw != null
                    ? `${Number(raw).toFixed(1)}%`
                    : "—"
                  : String(raw);
            return (
              <div key={p.label}>
                <div className="flex justify-between text-xs">
                  <span className="truncate pr-2">{p.label}</span>
                  <span className="shrink-0 tabular-nums font-medium">{display}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-muted">
                  <div className="h-1.5 rounded-full bg-primary" style={{ width: `${(Math.abs(Number(raw) || 0) / max) * 100}%` }} />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
