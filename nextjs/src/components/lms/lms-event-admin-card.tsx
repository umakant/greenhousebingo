"use client";

import Link from "next/link";
import { Calendar, MapPin, Monitor, User } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { TableActionButton, type TableActionItem } from "@/components/ui/table-action-button";
import { LMS_EVENT_TYPE_LABELS } from "@/lib/lms-events/constants";
import { lmsEventAdminDetailPath } from "@/lib/lms-events/paths";
import type { LmsEvent } from "@/lib/lms-events/types";
import { cn } from "@/lib/utils";

const TYPE_BADGE: Partial<Record<LmsEvent["eventType"], { label: string; className: string }>> = {
  cpr_class: { label: "Live Class", className: "bg-violet-600 hover:bg-violet-600" },
  live_workshop: { label: "Workshop", className: "bg-teal-600 hover:bg-teal-600" },
  in_person_training: { label: "Training", className: "bg-orange-500 hover:bg-orange-500" },
  certification_class: { label: "Certification", className: "bg-indigo-600 hover:bg-indigo-600" },
  online_training: { label: "Online", className: "bg-sky-600 hover:bg-sky-600" },
  security_training: { label: "Security", className: "bg-slate-700 hover:bg-slate-700" },
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

export function LmsEventAdminCard(props: {
  event: LmsEvent;
  canManage?: boolean;
  onEdit?: () => void;
  actionItems?: TableActionItem[];
  className?: string;
}) {
  const { event, canManage = true, onEdit, actionItems = [], className } = props;
  const badge = TYPE_BADGE[event.eventType] ?? {
    label: LMS_EVENT_TYPE_LABELS[event.eventType],
    className: "bg-primary hover:bg-primary",
  };
  const seats = event.seatsRemaining ?? (event.capacity != null ? event.capacity - event.registeredCount : null);

  const titleNode =
    canManage && onEdit ? (
      <button
        type="button"
        className="line-clamp-2 text-left text-base font-semibold leading-snug hover:text-primary"
        onClick={onEdit}
      >
        {event.title}
      </button>
    ) : (
      <Link
        href={lmsEventAdminDetailPath(event.id)}
        className="line-clamp-2 text-base font-semibold leading-snug hover:text-primary"
      >
        {event.title}
      </Link>
    );

  return (
    <Card className={cn("group flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md", className)}>
      <div className="relative aspect-[16/10] bg-muted">
        {event.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-violet-50 to-indigo-100 text-indigo-400">
            <Calendar className="h-12 w-12 opacity-50" aria-hidden />
          </div>
        )}
        <Badge className={cn("absolute left-3 top-3 text-xs text-white", badge.className)}>{badge.label}</Badge>
        {seats != null && seats > 0 ? (
          <Badge className="absolute bottom-3 left-3 bg-emerald-600 text-xs hover:bg-emerald-600">
            {seats} Seats Left
          </Badge>
        ) : null}
      </div>

      <CardContent className="flex flex-1 flex-col gap-3 p-4">
        {titleNode}

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{formatWhen(event.startsAt, event.endsAt)}</span>
          </div>
          <div className="flex items-start gap-2">
            {event.deliveryMode === "online" ? (
              <Monitor className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            )}
            <span className="line-clamp-2">{locationLine(event)}</span>
          </div>
          {event.instructorName ? (
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">
                {instructorInitial(event.instructorName)}
              </span>
              <span className="flex items-center gap-1">
                <User className="h-3.5 w-3.5" aria-hidden />
                {event.instructorName}
              </span>
            </div>
          ) : null}
        </div>
      </CardContent>

      <CardFooter className="mt-auto flex items-center justify-between border-t bg-muted/20 px-4 py-3">
        <div className="flex min-w-0 flex-col gap-1">
          {event.categoryName ? (
            <Badge variant="outline" className="w-fit font-normal">
              {event.categoryName}
            </Badge>
          ) : null}
          <span className="text-base font-bold text-primary">{formatPrice(event)}</span>
        </div>
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
