"use client";

import * as React from "react";

import { Calendar, Clock, MapPin, UserRound } from "lucide-react";

import { EventQuickActions } from "@/components/event-platform/event-command-center/event-quick-actions";
import { useEventCommandCenter } from "@/components/event-platform/event-command-center/event-command-center-context";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

function statusBadgeClass(status: string) {
  const s = status.toLowerCase();
  if (s === "registration_open" || s === "published") {
    return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400";
  }
  if (s === "sold_out") return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  if (s === "cancelled" || s === "archived") return "bg-red-500/15 text-red-700 dark:text-red-400";
  if (s === "in_progress") return "bg-sky-500/15 text-sky-700 dark:text-sky-400";
  return "bg-muted text-muted-foreground";
}

/** Compact circular capacity gauge shown beside the header stat strip. */
function CapacityRing({ percent }: { percent: number }) {
  const size = 96;
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(100, Math.max(0, percent));
  const offset = circumference * (1 - clamped / 100);
  const toneClass =
    clamped >= 100
      ? "stroke-amber-500"
      : clamped >= 75
        ? "stroke-emerald-500"
        : "stroke-sky-500";

  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            className="stroke-muted"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className={cn("transition-all duration-500", toneClass)}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold tabular-nums">{clamped}%</span>
        </div>
      </div>
      <span className="text-xs font-medium text-muted-foreground">Capacity filled</span>
    </div>
  );
}

type EventCommandHeaderProps = {
  onEdit: () => void;
  onCheckIn: () => void;
  onStartLiveMode?: () => void;
};

export function EventCommandHeader(props: EventCommandHeaderProps) {
  const { summary, registrationCount, checkedInCount, eventId } = useEventCommandCenter();

  if (!summary) return null;
  const event = summary.event;

  const hostName = event.host.name?.trim() || "Not assigned";

  const locationParts = [
    event.venue.name,
    [event.venue.city, event.venue.state].filter(Boolean).join(", "),
    event.venue.address,
  ].filter(Boolean);

  const capacity = event.capacity ?? null;
  const remainingMetric = summary.counts.remainingCapacity;
  const remaining =
    remainingMetric.availability === "available"
      ? remainingMetric.value
      : capacity != null
        ? Math.max(0, capacity - registrationCount)
        : null;
  const fillPercent =
    capacity != null && capacity > 0
      ? Math.min(100, Math.round((registrationCount / capacity) * 100))
      : null;

  const eventDate = new Date(event.startsAt);

  const checkedInPercent =
    registrationCount > 0 ? Math.round((checkedInCount / registrationCount) * 100) : 0;

  const stats: Array<{ label: string; value: React.ReactNode; hint?: string }> = [
    {
      label: "Registrations",
      value: registrationCount,
      hint: capacity != null ? `of ${capacity} capacity` : undefined,
    },
    {
      label: "Checked in",
      value: checkedInCount,
      hint: registrationCount > 0 ? `${checkedInPercent}% of total` : undefined,
    },
    { label: "Capacity", value: capacity ?? "—" },
    {
      label: "Remaining",
      value: remainingMetric.availability === "available" ? remainingMetric.value : (remaining ?? "—"),
    },
  ];

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={cn("capitalize border-0", statusBadgeClass(event.status))}>
                {event.status.replace(/_/g, " ")}
              </Badge>
              {event.isFeatured ? <Badge variant="secondary">Featured</Badge> : null}
            </div>

            <div>
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{event.title}</h1>
              <div className="mt-2 flex flex-col gap-1.5 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <Calendar className="h-4 w-4 shrink-0" />
                  {eventDate.toLocaleDateString(undefined, {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                  {" · "}
                  {eventDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                </span>
                {event.doorsOpen || event.bingoStart ? (
                  <span className="inline-flex items-center gap-2">
                    <Clock className="h-4 w-4 shrink-0" />
                    {event.doorsOpen ? `Doors ${event.doorsOpen}` : null}
                    {event.doorsOpen && event.bingoStart ? " · " : null}
                    {event.bingoStart ? `Bingo ${event.bingoStart}` : null}
                  </span>
                ) : null}
                {locationParts.length ? (
                  <span className="inline-flex items-start gap-2">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{locationParts.join(" · ")}</span>
                  </span>
                ) : null}
                <span className="inline-flex items-center gap-2">
                  <UserRound className="h-4 w-4 shrink-0" />
                  Host: {hostName}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 lg:items-end">
            <EventQuickActions
              onEdit={props.onEdit}
              onCheckIn={props.onCheckIn}
              onStartLiveMode={props.onStartLiveMode}
              eventId={eventId}
              className="shrink-0"
            />

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center lg:justify-end">
              <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
                {stats.map((stat) => (
                  <div key={stat.label}>
                    <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-lg font-semibold tabular-nums">{stat.value}</p>
                    {stat.hint ? (
                      <p className="text-xs text-muted-foreground">{stat.hint}</p>
                    ) : null}
                  </div>
                ))}
              </div>

              {fillPercent != null ? <CapacityRing percent={fillPercent} /> : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
