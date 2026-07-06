"use client";

import Link from "next/link";
import {
  Award,
  Calendar,
  MapPin,
  Monitor,
  Users,
  Video,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LMS_EVENT_TYPE_LABELS } from "@/lib/lms-events/constants";
import { lmsEventStudentDetailPath } from "@/lib/lms-events/paths";
import type { LmsEventCardModel } from "@/lib/lms-events/types";
import { cn } from "@/lib/utils";

function formatEventDateRange(startsAt: string, endsAt: string): string {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const sameDay = start.toDateString() === end.toDateString();
  const dateFmt: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  const timeFmt: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  if (sameDay) {
    return `${start.toLocaleDateString(undefined, dateFmt)} · ${start.toLocaleTimeString(undefined, timeFmt)} – ${end.toLocaleTimeString(undefined, timeFmt)}`;
  }
  return `${start.toLocaleDateString(undefined, dateFmt)} – ${end.toLocaleDateString(undefined, dateFmt)}`;
}

function formatPrice(isFree: boolean, priceFrom: number | null, currency: string): string {
  if (isFree || priceFrom == null || priceFrom <= 0) return "Free";
  return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(priceFrom);
}

function locationLabel(event: LmsEventCardModel): string {
  if (event.deliveryMode === "online") return "Online";
  if (event.deliveryMode === "hybrid") {
    return event.venueCity ? `${event.venueCity} + Online` : "Hybrid";
  }
  return [event.venueName, event.venueCity].filter(Boolean).join(", ") || "Venue TBA";
}

function DeliveryIcon({ mode }: { mode: LmsEventCardModel["deliveryMode"] }) {
  if (mode === "online") return <Monitor className="h-3.5 w-3.5" aria-hidden />;
  if (mode === "hybrid") return <Video className="h-3.5 w-3.5" aria-hidden />;
  return <MapPin className="h-3.5 w-3.5" aria-hidden />;
}

export function EventCard(props: {
  event: LmsEventCardModel;
  href?: string;
  showRegister?: boolean;
  onWishlist?: () => void;
  wishlisted?: boolean;
  className?: string;
}) {
  const { event, showRegister = true, className } = props;
  const href = props.href ?? lmsEventStudentDetailPath(event.id);

  return (
    <Card className={cn("flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md", className)}>
      <div className="relative aspect-[16/9] bg-muted">
        {event.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={event.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-sky-50 to-indigo-50 text-indigo-400">
            <Calendar className="h-10 w-10 opacity-60" aria-hidden />
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {event.categoryName ? (
            <Badge variant="secondary" className="bg-background/90 text-xs">
              {event.categoryName}
            </Badge>
          ) : null}
          {event.certificationAvailable ? (
            <Badge className="gap-1 bg-amber-500/90 text-xs hover:bg-amber-500/90">
              <Award className="h-3 w-3" aria-hidden />
              Cert
            </Badge>
          ) : null}
        </div>
      </div>

      <CardHeader className="space-y-2 pb-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {LMS_EVENT_TYPE_LABELS[event.eventType]}
        </p>
        <CardTitle className="line-clamp-2 text-lg leading-snug">
          <Link href={href} className="hover:text-primary">
            {event.title}
          </Link>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 space-y-2 text-sm text-muted-foreground">
        {event.shortDescription ? <p className="line-clamp-2">{event.shortDescription}</p> : null}
        <div className="flex items-start gap-2">
          <Calendar className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>{formatEventDateRange(event.startsAt, event.endsAt)}</span>
        </div>
        <div className="flex items-start gap-2">
          <DeliveryIcon mode={event.deliveryMode} />
          <span>{locationLabel(event)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <span className="font-semibold text-foreground">
            {formatPrice(event.isFree, event.priceFrom, event.currency)}
          </span>
          {event.seatsRemaining != null ? (
            <span className="inline-flex items-center gap-1 text-xs">
              <Users className="h-3.5 w-3.5" aria-hidden />
              {event.seatsRemaining} seats left
            </span>
          ) : null}
        </div>
      </CardContent>

      <CardFooter className="gap-2 pt-0">
        {showRegister ? (
          <Button asChild size="sm" className="flex-1">
            <Link href={href}>View event</Link>
          </Button>
        ) : null}
        {props.onWishlist ? (
          <Button type="button" size="sm" variant="outline" onClick={props.onWishlist}>
            {props.wishlisted ? "Saved" : "Wishlist"}
          </Button>
        ) : null}
      </CardFooter>
    </Card>
  );
}
