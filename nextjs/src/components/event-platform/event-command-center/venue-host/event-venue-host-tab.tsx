"use client";

import * as React from "react";
import Link from "next/link";
import {
  Building2,
  CalendarPlus,
  Download,
  ExternalLink,
  Info,
  Loader2,
  Mail,
  MapPin,
  Phone,
  StickyNote,
  Users,
  Utensils,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";

import {
  ChartFilterSelect,
  DetailRow,
  HostMetricsGrid,
  IconDetailRow,
  PerformanceChartBlock,
  VenueMetricsGrid,
} from "@/components/event-platform/event-command-center/venue-host/venue-host-panels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableActionButton } from "@/components/ui/table-action-button";
import type { VenueHostChartFilter, VenueHostOverview } from "@/lib/event-platform/event-venue-host/event-venue-host-types";
import { EVENT_PLATFORM_PATHS } from "@/lib/event-platform/paths";
import { formatPhoneDisplay } from "@/lib/phone";

function money(n: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(n);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { dateStyle: "medium" });
}

function statusBadge(status: string | null | undefined) {
  if (!status) return null;
  return (
    <Badge variant="outline" className="capitalize text-xs">
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

export function EventVenueHostTab(props: { eventId: string }) {
  const [overview, setOverview] = React.useState<VenueHostOverview | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [chartFilter, setChartFilter] = React.useState<VenueHostChartFilter>("last_10");
  const [noteOpen, setNoteOpen] = React.useState(false);
  const [noteText, setNoteText] = React.useState("");

  const load = React.useCallback(async () => {
    setLoading(true);
    const res = await fetch(
      `/api/event-platform/events/${encodeURIComponent(props.eventId)}/venue-host?chartFilter=${chartFilter}`,
      { credentials: "include", cache: "no-store" },
    );
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      overview?: VenueHostOverview;
      message?: string;
    };
    if (!res.ok || !data?.ok || !data.overview) {
      toast.error(data?.message ?? "Could not load venue & host data.");
      setOverview(null);
    } else {
      setOverview(data.overview);
    }
    setLoading(false);
  }, [props.eventId, chartFilter]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function runAction(body: Record<string, unknown>) {
    const res = await fetch(
      `/api/event-platform/events/${encodeURIComponent(props.eventId)}/venue-host/actions`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
    if (!res.ok || !data?.ok) {
      toast.error(data?.message ?? "Action failed.");
      return false;
    }
    toast.success("Updated.");
    await load();
    return true;
  }

  if (loading && !overview) {
    return (
      <div className="flex min-h-[240px] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading venue & host…
      </div>
    );
  }

  if (!overview) {
    return <p className="text-sm text-muted-foreground">Venue & host data is unavailable.</p>;
  }

  const canManage = overview.canManage;
  const currency = overview.currency;
  const venue = overview.venue;
  const host = overview.host;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sky-200 bg-sky-50/70 px-4 py-3 dark:border-sky-900/50 dark:bg-sky-950/20">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Info className="h-4 w-4 shrink-0 text-sky-500" />
          {overview.ratingSystem.message}
        </p>
        <ChartFilterSelect value={chartFilter} onChange={setChartFilter} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* Venue column */}
        <div className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MapPin className="h-4 w-4" />
                  Venue — current event
                </CardTitle>
                <CardDescription>Details and operational status for this event.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="h-32 w-full shrink-0 overflow-hidden rounded-lg bg-muted sm:h-auto sm:w-40">
                  {venue.current.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={venue.current.imageUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full min-h-[8rem] w-full items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-100 text-emerald-400">
                      <MapPin className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-lg font-semibold">{venue.current.name ?? "No venue assigned"}</p>
                    <Badge className="border-0 bg-emerald-100 text-xs font-medium text-emerald-700 hover:bg-emerald-100">
                      Active Event
                    </Badge>
                  </div>
                  <div className="mt-1 divide-y divide-border/50">
                    <IconDetailRow icon={Building2} label="Type" value={venue.current.venueType} />
                    <IconDetailRow icon={MapPin} label="Address" value={venue.current.address} />
                    <IconDetailRow icon={Phone} label="Phone" value={formatPhoneDisplay(venue.current.phone, "—")} />
                    <IconDetailRow
                      icon={Users}
                      label="Capacity"
                      value={venue.current.capacity != null ? String(venue.current.capacity) : null}
                    />
                    <IconDetailRow icon={Utensils} label="Food & drink" value={venue.current.foodAndDrink} />
                  </div>
                </div>
              </div>

              <div className="grid gap-1 border-t pt-3 sm:grid-cols-2">
                <DetailRow label="Contact" value={venue.current.contactPerson} />
                <DetailRow label="Email" value={venue.current.email} />
                <DetailRow
                  label="Venue fee"
                  value={venue.current.venueFee != null ? money(venue.current.venueFee, currency) : null}
                />
                <DetailRow label="Contract status" value={venue.current.contractStatus} />
                <DetailRow label="Payment status" value={venue.current.paymentStatus} />
                <DetailRow label="Parking" value={venue.current.parking} />
                <DetailRow label="Accessibility" value={venue.current.accessibility} />
                <DetailRow label="Setup instructions" value={venue.current.setupInstructions} />
                <DetailRow label="Notes" value={venue.current.notes} />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Venue Usage Metrics</CardTitle>
              <CardDescription>
                Calculated from {venue.metrics.timesUsed} event{venue.metrics.timesUsed === 1 ? "" : "s"} at this venue
                (company-scoped).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <VenueMetricsGrid metrics={venue.metrics} currency={currency} />
            </CardContent>
          </Card>

          <div className="grid gap-3 md:grid-cols-3">
            <PerformanceChartBlock title="Attendance by event" points={venue.charts} field="attendance" />
            <PerformanceChartBlock title="Revenue by event" points={venue.charts} field="revenue" currency={currency} />
            <PerformanceChartBlock title="Profit by event" points={venue.charts} field="profit" currency={currency} />
          </div>

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Venue Event History</CardTitle>
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" asChild>
                <a
                  href={`/api/event-platform/events/${encodeURIComponent(props.eventId)}/venue-host/export?section=venue`}
                  download
                >
                  <Download className="h-3.5 w-3.5" />
                  Export
                </a>
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Reg.</TableHead>
                    <TableHead className="text-right">In</TableHead>
                    <TableHead className="text-right">Rev.</TableHead>
                    <TableHead className="text-right">Profit</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {venue.history.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-muted-foreground">
                        No venue history yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    venue.history.map((row) => (
                      <TableRow key={row.eventId}>
                        <TableCell className="whitespace-nowrap text-xs">{formatDate(row.date)}</TableCell>
                        <TableCell className="max-w-[140px] truncate text-xs font-medium">{row.eventTitle}</TableCell>
                        <TableCell>{statusBadge(row.status)}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs">{row.registered}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs">{row.checkedIn}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs">{money(row.revenue, currency)}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs">{money(row.profit, currency)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{row.rating.label}</TableCell>
                        <TableCell>
                          <TableActionButton
                            label="Actions"
                            items={[
                              {
                                label: "View event",
                                href: EVENT_PLATFORM_PATHS.eventDetail(row.eventId) + "?tab=overview",
                              },
                              {
                                label: "Compare event",
                                href: EVENT_PLATFORM_PATHS.eventDetail(row.eventId) + "?tab=financials",
                              },
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

          <div className="flex flex-wrap gap-2">
            {venue.current.profileUrl ? (
              <Button variant="outline" size="sm" asChild>
                <Link href={venue.current.profileUrl}>
                  View venue profile
                  <ExternalLink className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : null}
            {venue.current.email ? (
              <Button variant="outline" size="sm" asChild>
                <a href={`mailto:${venue.current.email}`}>
                  <Mail className="mr-1 h-3.5 w-3.5" />
                  Contact venue
                </a>
              </Button>
            ) : null}
            {canManage ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void runAction({ action: "mark_venue_fee_paid" })}
                >
                  Mark fee paid
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`${EVENT_PLATFORM_PATHS.events}?duplicateVenue=${encodeURIComponent(venue.current.name ?? "")}`}>
                    <CalendarPlus className="mr-1 h-3.5 w-3.5" />
                    Schedule another event
                  </Link>
                </Button>
              </>
            ) : null}
          </div>
        </div>

        {/* Host column */}
        <div className="space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <UserRound className="h-4 w-4" />
                Host — current event
              </CardTitle>
              <CardDescription>Assigned host and event-day logistics.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                {host.current.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={host.current.photoUrl}
                    alt=""
                    className="h-14 w-14 rounded-full object-cover ring-1 ring-border"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                    <UserRound className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="text-lg font-semibold">{host.current.name ?? "No host assigned"}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {statusBadge(host.current.invitationStatus)}
                    {statusBadge(host.current.confirmationStatus)}
                  </div>
                </div>
              </div>
              <div className="divide-y divide-border/50">
                <IconDetailRow icon={Phone} label="Phone" value={formatPhoneDisplay(host.current.phone, "—")} />
                <IconDetailRow icon={Mail} label="Email" value={host.current.email} />
              </div>
              <div className="grid gap-1 border-t pt-2 sm:grid-cols-2">
                <DetailRow
                  label="Scheduled arrival"
                  value={host.current.scheduledArrival ? new Date(host.current.scheduledArrival).toLocaleString() : null}
                />
                <DetailRow
                  label="Actual arrival"
                  value={host.current.actualArrival ? new Date(host.current.actualArrival).toLocaleString() : null}
                />
                <DetailRow label="Payment type" value={host.current.paymentType} />
                <DetailRow
                  label="Payment amount"
                  value={host.current.paymentAmount != null ? money(host.current.paymentAmount, currency) : null}
                />
                <DetailRow label="Payment status" value={host.current.paymentStatus} />
                <DetailRow label="Agreement" value={host.current.agreementUrl ? "On file" : null} />
                <DetailRow label="Notes" value={host.current.notes} />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Host Performance Metrics</CardTitle>
              <CardDescription>From prior events assigned to this host (company-scoped).</CardDescription>
            </CardHeader>
            <CardContent>
              <HostMetricsGrid metrics={host.metrics} currency={currency} />
            </CardContent>
          </Card>

          <div className="grid gap-3 md:grid-cols-3">
            <PerformanceChartBlock title="Attendance by hosted event" points={host.charts} field="attendance" />
            <PerformanceChartBlock title="Revenue by hosted event" points={host.charts} field="revenue" currency={currency} />
            <PerformanceChartBlock title="Rating over time" points={host.charts} field="rating" />
          </div>

          {host.performanceNotes.length > 0 ? (
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Performance Notes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {host.performanceNotes.map((n) => (
                  <div key={n.id} className="rounded-md border p-2 text-sm">
                    <p>{n.note}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {n.createdByName ?? "Staff"} · {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Host Event History</CardTitle>
              <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" asChild>
                <a
                  href={`/api/event-platform/events/${encodeURIComponent(props.eventId)}/venue-host/export?section=host`}
                  download
                >
                  <Download className="h-3.5 w-3.5" />
                  Export
                </a>
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead className="text-right">Att.</TableHead>
                    <TableHead className="text-right">Rev.</TableHead>
                    <TableHead>Arrival</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {host.history.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-muted-foreground">
                        No host history yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    host.history.map((row) => (
                      <TableRow key={row.eventId}>
                        <TableCell className="whitespace-nowrap text-xs">{formatDate(row.date)}</TableCell>
                        <TableCell className="max-w-[120px] truncate text-xs font-medium">{row.eventTitle}</TableCell>
                        <TableCell className="max-w-[100px] truncate text-xs">{row.venueName ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs">{row.attendance}</TableCell>
                        <TableCell className="text-right tabular-nums text-xs">{money(row.revenue, currency)}</TableCell>
                        <TableCell className="text-xs">{row.arrivalStatus ?? "—"}</TableCell>
                        <TableCell>
                          <TableActionButton
                            label="Actions"
                            items={[
                              {
                                label: "View event",
                                href: EVENT_PLATFORM_PATHS.eventDetail(row.eventId) + "?tab=overview",
                              },
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

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link href={host.current.profileUrl ?? EVENT_PLATFORM_PATHS.hosts}>
                View host profile
                <ExternalLink className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
            {host.current.email ? (
              <Button variant="outline" size="sm" asChild>
                <a href={`mailto:${host.current.email}`}>
                  <Mail className="mr-1 h-3.5 w-3.5" />
                  Contact host
                </a>
              </Button>
            ) : null}
            {canManage && host.current.hostId ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    void runAction({
                      action: "resend_invitation",
                      hostId: host.current.hostId,
                    })
                  }
                >
                  Resend invitation
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void runAction({ action: "confirm_host_arrival" })}
                >
                  Confirm arrival
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void runAction({ action: "mark_host_payment_paid" })}
                >
                  Mark payment paid
                </Button>
                <Button variant="outline" size="sm" onClick={() => setNoteOpen(true)}>
                  <StickyNote className="mr-1 h-3.5 w-3.5" />
                  Add performance note
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-100 text-sky-600">
              <Info className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">Additional Information</p>
              <p className="text-xs text-muted-foreground">
                All data is based on completed event records and may exclude current in-progress activities.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`${EVENT_PLATFORM_PATHS.eventDetail(props.eventId)}?tab=overview`}>View Event Details</Link>
          </Button>
        </CardContent>
      </Card>

      <Sheet open={noteOpen} onOpenChange={setNoteOpen}>
        <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Host performance note</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-2">
            <Label htmlFor="host-note">Note</Label>
            <Textarea
              id="host-note"
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              rows={4}
              placeholder="Observations about host performance for this event…"
            />
          </div>
          <SheetFooter className="mt-6">
            <Button
              onClick={async () => {
                if (!host.current.hostId || !noteText.trim()) return;
                const ok = await runAction({
                  action: "add_performance_note",
                  hostId: host.current.hostId,
                  note: noteText.trim(),
                });
                if (ok) {
                  setNoteText("");
                  setNoteOpen(false);
                }
              }}
            >
              Save note
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
