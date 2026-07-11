"use client";

import * as React from "react";
import { Loader2, Mail, MessageCircle, QrCode, Trophy } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { EventAttendeeDetail } from "@/lib/event-platform/attendees/event-attendees-types";
import { formatPhoneDisplay } from "@/lib/phone";
import { cn } from "@/lib/utils";

const CUSTOMER_LABELS: Record<string, string> = {
  new: "New",
  returning: "Returning",
  vip: "VIP",
  affiliate_referral: "Affiliate Referral",
  venue_customer: "Venue Customer",
  walk_in: "Walk-In",
};

const BONUS_LABELS: Record<string, string> = {
  none: "None",
  buyer: "Buyer",
  above_average: "Above Average",
  power_buyer: "Power Buyer",
};

function Field(props: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{props.label}</p>
      <p className="text-sm font-medium">{props.value}</p>
    </div>
  );
}

function unavailable(label: string) {
  return <span className="text-muted-foreground">{label} not configured</span>;
}

type AttendeeDrawerProps = {
  eventId: string;
  registrationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCheckIn: (registrationId: string) => Promise<boolean | void>;
  onReload: () => void;
};

export function AttendeeDrawer(props: AttendeeDrawerProps) {
  const [detail, setDetail] = React.useState<EventAttendeeDetail | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!props.open || !props.registrationId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await fetch(
        `/api/event-platform/events/${encodeURIComponent(props.eventId)}/attendees/${encodeURIComponent(props.registrationId!)}`,
        { credentials: "include", cache: "no-store" },
      );
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        detail?: EventAttendeeDetail;
      } | null;
      if (!cancelled) {
        setDetail(res.ok && data?.ok ? (data.detail ?? null) : null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [props.open, props.registrationId, props.eventId]);

  const row = detail?.row;
  const life = detail?.lifetime;

  return (
    <Sheet open={props.open} onOpenChange={props.onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{row?.fullName ?? "Attendee"}</SheetTitle>
          <SheetDescription>{row?.email ?? "Loading attendee details…"}</SheetDescription>
        </SheetHeader>

        {loading ? (
          <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : !detail || !row ? (
          <p className="mt-8 text-sm text-muted-foreground">Attendee not found.</p>
        ) : (
          <div className="mt-6 space-y-6">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                disabled={row.checkInStatus === "checked_in"}
                onClick={() => void props.onCheckIn(row.registrationId).then(() => props.onReload())}
              >
                <QrCode className="mr-1.5 h-4 w-4" />
                Check in
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => toast.info("Bonus card sales coming soon.")}>
                Sell bonus cards
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => toast.info("Winner recording coming soon.")}>
                <Trophy className="mr-1.5 h-4 w-4" />
                Record winner
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => toast.info("Email coming soon.")}>
                <Mail className="mr-1.5 h-4 w-4" />
                Email
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => toast.info("WhatsApp coming soon.")}>
                <MessageCircle className="mr-1.5 h-4 w-4" />
                WhatsApp
              </Button>
            </div>

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Identity</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Full name" value={row.fullName} />
                <Field label="Phone" value={formatPhoneDisplay(row.phone ?? "", "—")} />
                <Field label="Email" value={row.email} />
                <Field label="Customer type" value={CUSTOMER_LABELS[row.customerType] ?? row.customerType} />
                <Field label="Registration source" value={row.registrationSource} />
              </div>
            </section>

            <Separator />

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Current event</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Registration status" value={row.bookingStatus.replace(/_/g, " ")} />
                <Field
                  label="Check-in"
                  value={
                    row.checkedInAt
                      ? new Date(row.checkedInAt).toLocaleString()
                      : row.checkInStatus.replace(/_/g, " ")
                  }
                />
                <Field label="Ticket tier" value={row.ticketName} />
                <Field label="Ticket quantity" value={row.ticketQuantity} />
                <Field label="Included cards" value={row.includedCards} />
                <Field label="Bonus cards" value={row.bonusCards} />
                <Field label="Total cards" value={row.totalCards} />
                <Field
                  label="Total spend"
                  value={new Intl.NumberFormat(undefined, { style: "currency", currency: row.currency }).format(
                    row.totalSpend,
                  )}
                />
                <Field
                  label="Bonus tier"
                  value={
                    <span className="inline-flex items-center gap-2">
                      {BONUS_LABELS[row.bonus.tier]}
                      {row.bonus.showBadge ? (
                        <Badge variant="secondary" className="text-[10px]">
                          {row.bonus.tier === "power_buyer" ? "Power Buyer" : "Above Avg"}
                        </Badge>
                      ) : null}
                    </span>
                  }
                />
                <Field
                  label="Bingo wins"
                  value={row.bingoWins === "not_configured" ? unavailable("Bingo wins") : row.bingoWinCount}
                />
                <Field
                  label="Plant request"
                  value={
                    row.plantRequest.availability === "not_configured"
                      ? unavailable("Plant request")
                      : row.plantRequest.availability === "no_records"
                        ? "—"
                        : (row.plantRequest.value ?? "—")
                  }
                />
                <Field label="Notes" value={detail.notes ?? "—"} />
              </div>
            </section>

            <Separator />

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Customer history</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Events registered" value={life?.totalEventsRegistered ?? "—"} />
                <Field label="Events attended" value={life?.totalEventsAttended ?? "—"} />
                <Field
                  label="Lifetime spend"
                  value={
                    life
                      ? new Intl.NumberFormat(undefined, { style: "currency", currency: row.currency }).format(
                          life.lifetimeSpend,
                        )
                      : "—"
                  }
                />
                <Field label="Lifetime bonus cards" value={life?.lifetimeBonusCards ?? "—"} />
                <Field
                  label="Lifetime bingo wins"
                  value={
                    life?.lifetimeBingoWins === "not_configured"
                      ? unavailable("Bingo wins")
                      : (life?.lifetimeBingoWinCount ?? 0)
                  }
                />
                <Field
                  label="Plants won"
                  value={
                    life?.plantsWon === "not_configured" ? unavailable("Plants won") : (life?.plantsWonCount ?? 0)
                  }
                />
                <Field label="Favorite venue" value={life?.favoriteVenue ?? "—"} />
                <Field
                  label="Favorite plant"
                  value={life?.favoritePlant === "not_configured" ? unavailable("Favorite plant") : "—"}
                />
                <Field label="Referrals" value={life?.referralCount ?? 0} />
                <Field
                  label="Last event attended"
                  value={
                    life?.lastEventAttended
                      ? new Date(life.lastEventAttended).toLocaleDateString()
                      : "—"
                  }
                />
              </div>
            </section>

            <Separator />

            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Activity</h3>
              {detail.activity.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity recorded.</p>
              ) : (
                <ul className="space-y-2">
                  {detail.activity.map((item) => (
                    <li key={item.id} className="rounded-md border px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{item.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(item.at).toLocaleString(undefined, {
                            month: "short",
                            day: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <p className="text-muted-foreground">{item.detail}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <Button type="button" variant="link" className="h-auto p-0" onClick={() => toast.info("Full profile coming soon.")}>
              View full profile
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function bonusTierBadge(tier: string, show: boolean) {
  if (!show) return null;
  return (
    <Badge
      variant="secondary"
      className={cn(
        "ml-1 text-[10px]",
        tier === "power_buyer" && "bg-amber-500/20 text-amber-800 dark:text-amber-300",
        tier === "above_average" && "bg-sky-500/20 text-sky-800 dark:text-sky-300",
      )}
    >
      {tier === "power_buyer" ? "Power Buyer" : "Above Avg"}
    </Badge>
  );
}
