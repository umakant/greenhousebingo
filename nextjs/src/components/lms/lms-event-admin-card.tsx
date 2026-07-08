"use client";

import Link from "next/link";
import { Award, Calendar, MapPin, Monitor, User, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { TableActionButton, type TableActionItem } from "@/components/ui/table-action-button";
import { lmsEventTypeLabel, type LmsEventType } from "@/lib/lms-events/constants";
import { lmsEventAdminDetailPath } from "@/lib/lms-events/paths";
import type { LmsEvent } from "@/lib/lms-events/types";
import { cn } from "@/lib/utils";

const TYPE_BADGE: Partial<Record<LmsEventType, { label: string; className: string }>> = {
  cpr_class: { label: "Live Class", className: "bg-violet-600/95 hover:bg-violet-600/95" },
  live_workshop: { label: "Workshop", className: "bg-teal-600/95 hover:bg-teal-600/95" },
  in_person_training: { label: "Training", className: "bg-orange-500/95 hover:bg-orange-500/95" },
  certification_class: { label: "Certification", className: "bg-indigo-600/95 hover:bg-indigo-600/95" },
  online_training: { label: "Online", className: "bg-sky-600/95 hover:bg-sky-600/95" },
  security_training: { label: "Security", className: "bg-slate-700/95 hover:bg-slate-700/95" },
};

function formatWhen(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const date = start.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const t1 = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const t2 = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} · ${t1} – ${t2}`;
}

function locationLine(event: LmsEvent): string {
  if (event.deliveryMode === "online") return "Online (Live Webinar)";
  const parts = [event.venueName, event.venueCity, event.venueState].filter(Boolean);
  return parts.join(", ") || "Venue TBA";
}

function formatPrice(event: LmsEvent): string {
  if (event.isFree || !event.priceFrom || event.priceFrom <= 0) return "Free";
  return new Intl.NumberFormat(undefined, { style: "currency", currency: event.currency }).format(event.priceFrom);
}

function instructorInitial(name: string | null): string {
  if (!name?.trim()) return "?";
  return name.trim().charAt(0).toUpperCase();
}

function seatsBadgeClass(seats: number | null): string {
  if (seats == null || seats <= 0) return "bg-destructive/95 hover:bg-destructive/95";
  if (seats <= 10) return "bg-amber-600/95 hover:bg-amber-600/95";
  return "bg-emerald-600/95 hover:bg-emerald-600/95";
}

function EventImage({
  event,
  badge,
  seats,
  className,
}: {
  event: LmsEvent;
  badge: { label: string; className: string };
  seats: number | null;
  className?: string;
}) {
  return (
    <div className={cn("relative shrink-0 overflow-hidden bg-muted", className)}>
      {event.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={event.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-violet-50 to-indigo-100 text-indigo-400 dark:from-violet-950/40 dark:to-indigo-950/40">
          <Calendar className="h-10 w-10 opacity-50" aria-hidden />
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/10" />
      <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1.5">
        <Badge className={cn("border-0 text-[11px] font-medium text-white shadow-sm", badge.className)}>
          {badge.label}
        </Badge>
        {event.certificationAvailable ? (
          <Badge className="gap-0.5 border-0 bg-amber-500/95 text-[11px] text-white shadow-sm hover:bg-amber-500/95">
            <Award className="h-3 w-3" aria-hidden />
            Cert
          </Badge>
        ) : null}
      </div>
      {seats != null ? (
        <Badge
          className={cn(
            "absolute bottom-2.5 left-2.5 gap-1 border-0 text-[11px] font-medium text-white shadow-sm",
            seatsBadgeClass(seats),
          )}
        >
          <Users className="h-3 w-3" aria-hidden />
          {seats > 0 ? `${seats} seats left` : "Sold out"}
        </Badge>
      ) : null}
    </div>
  );
}

function EventMeta({ event, compact }: { event: LmsEvent; compact?: boolean }) {
  return (
    <div className={cn("text-muted-foreground", compact ? "flex flex-wrap gap-x-4 gap-y-1 text-xs" : "space-y-1.5 text-sm")}>
      <div className="inline-flex min-w-0 items-center gap-1.5">
        <Calendar className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
        <span className="truncate">{formatWhen(event.startsAt, event.endsAt)}</span>
      </div>
      <div className="inline-flex min-w-0 items-center gap-1.5">
        {event.deliveryMode === "online" ? (
          <Monitor className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
        ) : (
          <MapPin className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
        )}
        <span className="truncate">{locationLine(event)}</span>
      </div>
      {event.instructorName ? (
        <div className="inline-flex min-w-0 items-center gap-1.5">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-foreground">
            {instructorInitial(event.instructorName)}
          </span>
          <User className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
          <span className="truncate">{event.instructorName}</span>
        </div>
      ) : null}
    </div>
  );
}

function EventTitle({
  event,
  canManage,
  onEdit,
  className,
}: {
  event: LmsEvent;
  canManage: boolean;
  onEdit?: () => void;
  className?: string;
}) {
  if (canManage && onEdit) {
    return (
      <button
        type="button"
        className={cn(
          "line-clamp-2 text-left font-semibold leading-snug tracking-tight transition-colors hover:text-primary",
          className,
        )}
        onClick={onEdit}
      >
        {event.title}
      </button>
    );
  }
  return (
    <Link
      href={lmsEventAdminDetailPath(event.id)}
      className={cn("line-clamp-2 font-semibold leading-snug tracking-tight transition-colors hover:text-primary", className)}
    >
      {event.title}
    </Link>
  );
}

function EventActions({
  event,
  canManage,
  onEdit,
  actionItems,
  priceClassName,
}: {
  event: LmsEvent;
  canManage: boolean;
  onEdit?: () => void;
  actionItems: TableActionItem[];
  priceClassName?: string;
}) {
  return (
    <div className="flex shrink-0 flex-col items-end justify-center gap-2 sm:min-w-[7rem]">
      <span className={cn("text-lg font-bold tabular-nums text-primary", priceClassName)}>{formatPrice(event)}</span>
      {canManage && onEdit ? (
        <TableActionButton label="Edit" onPrimaryClick={onEdit} items={actionItems} />
      ) : (
        <Link href={lmsEventAdminDetailPath(event.id)} className="text-sm font-medium text-primary hover:underline">
          View
        </Link>
      )}
    </div>
  );
}

function LmsEventAdminCardList(props: {
  event: LmsEvent;
  canManage: boolean;
  onEdit?: () => void;
  actionItems: TableActionItem[];
  className?: string;
  badge: { label: string; className: string };
  seats: number | null;
}) {
  const { event, canManage, onEdit, actionItems, className, badge, seats } = props;

  return (
    <Card
      className={cn(
        "group overflow-hidden border-border/80 transition-all hover:border-border hover:shadow-md",
        className,
      )}
    >
      <div className="flex flex-col sm:flex-row">
        <EventImage
          event={event}
          badge={badge}
          seats={seats}
          className="aspect-[16/9] w-full sm:aspect-auto sm:min-h-[9.5rem] sm:w-52 md:w-60"
        />

        <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:flex-row sm:items-stretch sm:gap-4 sm:py-4 sm:pl-4 sm:pr-3">
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {event.categoryName ? (
                <Badge variant="secondary" className="h-5 px-2 text-[11px] font-normal">
                  {event.categoryName}
                </Badge>
              ) : null}
              {event.status !== "published" ? (
                <Badge variant="outline" className="h-5 px-2 text-[11px] capitalize">
                  {event.status}
                </Badge>
              ) : null}
            </div>
            <EventTitle event={event} canManage={canManage} onEdit={onEdit} className="text-base sm:text-lg" />
            <EventMeta event={event} compact />
          </div>

          <EventActions event={event} canManage={canManage} onEdit={onEdit} actionItems={actionItems} />
        </div>
      </div>
    </Card>
  );
}

function LmsEventAdminCardGrid(props: {
  event: LmsEvent;
  canManage: boolean;
  onEdit?: () => void;
  actionItems: TableActionItem[];
  className?: string;
  badge: { label: string; className: string };
  seats: number | null;
}) {
  const { event, canManage, onEdit, actionItems, className, badge, seats } = props;

  return (
    <Card
      className={cn(
        "group flex h-full flex-col overflow-hidden border-border/80 transition-all hover:border-border hover:shadow-md",
        className,
      )}
    >
      <EventImage event={event} badge={badge} seats={seats} className="aspect-[16/10] w-full" />

      <CardContent className="flex flex-1 flex-col gap-2.5 p-4">
        {event.categoryName ? (
          <Badge variant="secondary" className="w-fit text-[11px] font-normal">
            {event.categoryName}
          </Badge>
        ) : null}
        <EventTitle event={event} canManage={canManage} onEdit={onEdit} className="text-base" />
        <EventMeta event={event} />
      </CardContent>

      <CardFooter className="mt-auto flex items-center justify-between border-t bg-muted/30 px-4 py-3">
        <span className="text-base font-bold tabular-nums text-primary">{formatPrice(event)}</span>
        {canManage && onEdit ? (
          <TableActionButton label="Edit" onPrimaryClick={onEdit} items={actionItems} />
        ) : (
          <Link href={lmsEventAdminDetailPath(event.id)} className="text-sm font-medium text-primary hover:underline">
            View
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}

export function LmsEventAdminCard(props: {
  event: LmsEvent;
  variant?: "grid" | "list";
  canManage?: boolean;
  onEdit?: () => void;
  actionItems?: TableActionItem[];
  className?: string;
}) {
  const { event, variant = "grid", canManage = true, onEdit, actionItems = [], className } = props;
  const badge = TYPE_BADGE[event.eventType as LmsEventType] ?? {
    label: lmsEventTypeLabel(event.eventType),
    className: "bg-primary/95 hover:bg-primary/95",
  };
  const seats = event.seatsRemaining ?? (event.capacity != null ? event.capacity - event.registeredCount : null);

  const shared = { event, canManage, onEdit, actionItems, className, badge, seats };

  if (variant === "list") {
    return <LmsEventAdminCardList {...shared} />;
  }
  return <LmsEventAdminCardGrid {...shared} />;
}
