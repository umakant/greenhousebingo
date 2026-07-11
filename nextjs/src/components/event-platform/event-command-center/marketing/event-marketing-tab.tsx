"use client";

import * as React from "react";
import Link from "next/link";
import { Download, ExternalLink, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  MarketingChartBlock,
  MarketingSummaryCards,
} from "@/components/event-platform/event-command-center/marketing/marketing-panels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableActionButton } from "@/components/ui/table-action-button";
import { REGISTRATION_SOURCE_TYPES, REGISTRATION_SOURCE_LABELS } from "@/lib/event-platform/event-marketing/attribution-constants";
import type { EventMarketingFilters, EventMarketingOverview } from "@/lib/event-platform/event-marketing/event-marketing-types";
import { EVENT_PLATFORM_PATHS } from "@/lib/event-platform/paths";

function money(n: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
}

function buildQuery(eventId: string, filters: EventMarketingFilters) {
  const p = new URLSearchParams();
  if (filters.dateFrom) p.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) p.set("dateTo", filters.dateTo);
  if (filters.source && filters.source !== "all") p.set("source", filters.source);
  if (filters.campaign) p.set("campaign", filters.campaign);
  if (filters.affiliateId) p.set("affiliateId", filters.affiliateId);
  if (filters.promotionCode) p.set("promotionCode", filters.promotionCode);
  if (filters.checkInStatus && filters.checkInStatus !== "all") p.set("checkInStatus", filters.checkInStatus);
  if (filters.ticketTierId) p.set("ticketTierId", filters.ticketTierId);
  const q = p.toString();
  return `/api/event-platform/events/${encodeURIComponent(eventId)}/marketing${q ? `?${q}` : ""}`;
}

export function EventMarketingTab(props: { eventId: string }) {
  const [overview, setOverview] = React.useState<EventMarketingOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [filters, setFilters] = React.useState<EventMarketingFilters>({
    source: "all",
    checkInStatus: "all",
  });

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await fetch(buildQuery(props.eventId, filters), { credentials: "include", cache: "no-store" });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; overview?: EventMarketingOverview; message?: string };
    if (!res.ok || !data?.ok || !data.overview) {
      toast.error(data?.message ?? "Could not load marketing data.");
      setOverview(null);
    } else {
      setOverview(data.overview);
    }
    setLoading(false);
  }, [props.eventId, filters]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function copyText(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard.");
    } catch {
      toast.error("Could not copy.");
    }
  }

  if (loading && !overview) {
    return (
      <div className="flex min-h-[240px] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading marketing attribution…
      </div>
    );
  }

  if (!overview) {
    return <p className="text-sm text-muted-foreground">Marketing data is unavailable.</p>;
  }

  const currency = overview.summary.currency;
  const canManage = overview.canManage;

  return (
    <div className="space-y-4">
      <Card className="border-dashed shadow-sm">
        <CardContent className="flex gap-2 p-3 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{overview.attributionRuleDescription}</p>
        </CardContent>
      </Card>

      <p className="text-xs text-amber-700 dark:text-amber-400">{overview.dataQuality.message}</p>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label className="text-xs">From</Label>
            <Input type="date" className="h-8" value={filters.dateFrom?.slice(0, 10) ?? ""} onChange={(e) => setFilters((f) => ({ ...f, dateFrom: e.target.value || undefined }))} />
          </div>
          <div>
            <Label className="text-xs">To</Label>
            <Input type="date" className="h-8" value={filters.dateTo?.slice(0, 10) ?? ""} onChange={(e) => setFilters((f) => ({ ...f, dateTo: e.target.value || undefined }))} />
          </div>
          <div>
            <Label className="text-xs">Source</Label>
            <Select value={filters.source ?? "all"} onValueChange={(v) => setFilters((f) => ({ ...f, source: v as EventMarketingFilters["source"] }))}>
              <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {REGISTRATION_SOURCE_TYPES.map((s) => (
                  <SelectItem key={s} value={s}>{REGISTRATION_SOURCE_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Campaign</Label>
            <Input className="h-8" placeholder="Filter campaign…" value={filters.campaign ?? ""} onChange={(e) => setFilters((f) => ({ ...f, campaign: e.target.value || undefined }))} />
          </div>
        </CardContent>
      </Card>

      <MarketingSummaryCards summary={overview.summary} loading={loading} />

      <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        <MarketingChartBlock title="Registrations by source" points={overview.charts.registrationsBySource} field="registrations" />
        <MarketingChartBlock title="Revenue by source" points={overview.charts.revenueBySource} field="revenue" currency={currency} />
        <MarketingChartBlock title="Registration trend by campaign" points={overview.charts.registrationTrendByCampaign} field="registrations" />
        <MarketingChartBlock title="Ad spend vs revenue" points={overview.charts.adSpendVsRevenue} field="revenue" currency={currency} />
        <MarketingChartBlock title="Affiliate conversion performance" points={overview.charts.affiliateConversion} field="conversionRate" />
      </div>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-base">Source performance</CardTitle>
            <CardDescription>Each registration counted once under its primary source.</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" asChild>
            <a href={`/api/event-platform/events/${encodeURIComponent(props.eventId)}/marketing/export?section=sources`} download>
              <Download className="h-3.5 w-3.5" /> Export
            </a>
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Source</TableHead>
                <TableHead>Campaign</TableHead>
                <TableHead className="text-right">Reg.</TableHead>
                <TableHead className="text-right">Checked in</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Spend</TableHead>
                <TableHead className="text-right">CPR</TableHead>
                <TableHead className="text-right">ROI</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.sources.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-muted-foreground">No source data yet.</TableCell></TableRow>
              ) : (
                overview.sources.map((row) => (
                  <TableRow key={`${row.sourceType}-${row.campaign ?? ""}`}>
                    <TableCell className="text-xs font-medium">{row.sourceLabel}</TableCell>
                    <TableCell className="text-xs">{row.campaign ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{row.registrations}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{row.checkedIn}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{money(row.totalRevenue, currency)}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{row.spendKnown && row.spend != null ? money(row.spend, currency) : "N/A"}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{row.costPerRegistration != null ? money(row.costPerRegistration, currency) : "—"}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{row.roi != null ? `${row.roi.toFixed(1)}%` : "—"}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Affiliate performance</CardTitle>
          <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" asChild>
            <a href={`/api/event-platform/events/${encodeURIComponent(props.eventId)}/marketing/export?section=affiliates`} download>
              <Download className="h-3.5 w-3.5" /> Export
            </a>
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Affiliate</TableHead>
                <TableHead>Code</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">Reg.</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead className="text-right">Commission</TableHead>
                <TableHead>Payout</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.affiliates.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-muted-foreground">No affiliate-attributed registrations for this event.</TableCell></TableRow>
              ) : (
                overview.affiliates.map((row) => (
                  <TableRow key={row.partnerId}>
                    <TableCell className="text-xs font-medium">{row.affiliateName}</TableCell>
                    <TableCell className="font-mono text-xs">{row.trackingCode}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{row.clicks}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{row.registrations}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{money(row.ticketRevenue + row.bonusCardRevenue, currency)}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{money(row.commissionAmount, currency)}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs capitalize">{row.payoutStatus ?? "—"}</Badge></TableCell>
                    <TableCell>
                      <TableActionButton
                        label="Actions"
                        items={[
                          { label: "View affiliate", href: `/affiliate-business/partners?q=${encodeURIComponent(row.affiliateName)}` },
                          ...(row.trackingUrl
                            ? [{ label: "Copy tracking link", onSelect: () => void copyText(row.trackingUrl!) }]
                            : []),
                          { label: "View referred attendees", href: `${EVENT_PLATFORM_PATHS.eventDetail(props.eventId)}?tab=attendees` },
                        ]}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base">Promotions & coupons</CardTitle>
          <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" asChild>
            <a href={`/api/event-platform/events/${encodeURIComponent(props.eventId)}/marketing/export?section=promotions`} download>
              <Download className="h-3.5 w-3.5" /> Export
            </a>
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Usage</TableHead>
                <TableHead className="text-right">Revenue</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overview.promotions.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-muted-foreground">No promotion-code registrations recorded.</TableCell></TableRow>
              ) : (
                overview.promotions.map((row) => (
                  <TableRow key={row.code}>
                    <TableCell className="font-mono text-xs">{row.code}</TableCell>
                    <TableCell className="text-xs capitalize">{row.discountType ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{row.usageCount}</TableCell>
                    <TableCell className="text-right tabular-nums text-xs">{money(row.revenueGenerated, currency)}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs capitalize">{row.status}</Badge></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {overview.sponsor ? (
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Event sponsor</CardTitle>
            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" asChild>
              <a href={`/api/event-platform/events/${encodeURIComponent(props.eventId)}/marketing/export?section=sponsor`} download>
                <Download className="h-3.5 w-3.5" /> Export
              </a>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-lg font-semibold">{overview.sponsor.sponsorName}</p>
            <p><span className="text-muted-foreground">Package: </span>{overview.sponsor.package ?? "—"}</p>
            <p><span className="text-muted-foreground">Contribution: </span>{overview.sponsor.contribution != null ? money(overview.sponsor.contribution, currency) : "—"}</p>
            <p><span className="text-muted-foreground">Payment: </span>{overview.sponsor.paymentStatus ?? "—"}</p>
            <p><span className="text-muted-foreground">Deliverables: </span>{overview.sponsor.deliverables.join(", ") || "—"}</p>
            <p><span className="text-muted-foreground">Completed: </span>{overview.sponsor.completedDeliverables.join(", ") || "None recorded"}</p>
            <p><span className="text-muted-foreground">Contact: </span>{overview.sponsor.contact ?? "—"}</p>
            {overview.sponsor.profileUrl ? (
              <Link href={overview.sponsor.profileUrl} className="inline-flex items-center gap-1 text-primary hover:underline">
                View sponsor profile <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/affiliate-business/links">Affiliate links <ExternalLink className="ml-1 h-3.5 w-3.5" /></Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={EVENT_PLATFORM_PATHS.commissions}>Commissions <ExternalLink className="ml-1 h-3.5 w-3.5" /></Link>
        </Button>
        {canManage ? (
          <Button variant="outline" size="sm" asChild>
            <Link href={`${EVENT_PLATFORM_PATHS.eventDetail(props.eventId)}?tab=financials`}>Record ad spend (promotions expense)</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
