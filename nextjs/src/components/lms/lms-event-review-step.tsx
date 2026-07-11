"use client";

import * as React from "react";
import {
  CalendarDays,
  Grid3x3,
  MapPin,
  Settings2,
  Ticket,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LMS_EVENT_STATUS_LABELS } from "@/lib/lms-events/constants";
import {
  eventDateFromIso,
  formatScheduleDisplay,
} from "@/lib/lms-events/event-schedule-helpers";
import type { LmsEventCreateWizardInput } from "@/lib/lms-events/schemas";
import { formatPhoneDisplay } from "@/lib/phone";
import { cn } from "@/lib/utils";

function formatReviewTime(value: string | null | undefined): string {
  if (!value?.trim()) return "—";
  if (value.includes("T")) {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    }
  }
  return formatScheduleDisplay(value) ?? value;
}

function formatEventDate(values: LmsEventCreateWizardInput): string {
  const dateStr = values.eventDate?.trim() || eventDateFromIso(values.startsAt);
  if (!dateStr) return "—";
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function venueAddressLine(values: LmsEventCreateWizardInput): string {
  return [values.venueAddress, values.venueCity, values.venueState, values.venuePostalCode]
    .filter(Boolean)
    .join(", ");
}

function ReviewField({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  if (value == null || value === "" || value === "—") return null;
  return (
    <div className={cn("min-w-0 space-y-0.5", className)}>
      <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium leading-snug text-foreground">{value}</dd>
    </div>
  );
}

function ReviewSection({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-xl border bg-card shadow-sm", className)}>
      <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-2.5">
        <Icon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
        <h4 className="text-sm font-semibold">{title}</h4>
      </div>
      <dl className="grid gap-4 p-4 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function StatusBadge({ children, tone }: { children: React.ReactNode; tone?: "default" | "warn" | "success" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tone === "warn" && "bg-amber-500/15 text-amber-800 dark:text-amber-300",
        tone === "success" && "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
        (!tone || tone === "default") && "bg-muted text-muted-foreground",
      )}
    >
      {children}
    </span>
  );
}

export function LmsEventReviewStep({
  values,
  categoryName,
  onPatch,
}: {
  values: LmsEventCreateWizardInput;
  categoryName: string;
  onPatch: (partial: Partial<LmsEventCreateWizardInput>) => void;
}) {
  const bingoGamesCount = values.bingoGameIds?.length || values.bingoRounds?.length || 0;
  const faqCount = values.faqIds?.length || values.faqs?.length || 0;
  const venueLine = venueAddressLine(values);

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Double-check the details below, then choose how you want to publish this event.
      </p>

      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <Label htmlFor="ev-review-status" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Publish status
            </Label>
            <Select
              value={values.status}
              onValueChange={(v) => onPatch({ status: v as LmsEventCreateWizardInput["status"] })}
            >
              <SelectTrigger id="ev-review-status" className="w-full bg-background sm:w-[220px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["draft", "published", "registration_open"] as const).map((s) => (
                  <SelectItem key={s} value={s}>
                    {LMS_EVENT_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            {values.soldOut ? <StatusBadge tone="warn">Sold out</StatusBadge> : null}
            {values.isPublic ? <StatusBadge tone="success">Public listing</StatusBadge> : null}
            {values.isFeatured ? <StatusBadge>Featured</StatusBadge> : null}
          </div>
        </div>
      </div>

      {values.imageUrl?.trim() || values.title ? (
        <div className="flex gap-4 overflow-hidden rounded-xl border bg-card p-4 shadow-sm">
          {values.imageUrl?.trim() ? (
            <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={values.imageUrl} alt="" className="h-full w-full object-cover" />
            </div>
          ) : null}
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-lg font-semibold leading-tight">
              {values.venueName || values.title || "Untitled event"}
            </p>
            <p className="text-sm text-muted-foreground">{categoryName}</p>
            {values.shortDescription?.trim() ? (
              <p className="line-clamp-2 text-sm text-muted-foreground">{values.shortDescription}</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <ReviewSection title="Schedule" icon={CalendarDays}>
        <ReviewField label="Event date" value={formatEventDate(values)} className="sm:col-span-2" />
        <ReviewField label="Doors open" value={formatReviewTime(values.doorsOpen)} />
        <ReviewField label="Bingo start" value={formatReviewTime(values.bingoStart || values.startsAt)} />
        <ReviewField label="Bingo end" value={formatReviewTime(values.bingoEnd || values.endsAt)} />
        {values.timezone ? <ReviewField label="Timezone" value={values.timezone} /> : null}
      </ReviewSection>

      {(values.venueName || venueLine || values.ageRule || values.capacity) ? (
        <ReviewSection title="Venue" icon={MapPin}>
          <ReviewField label="Venue" value={values.venueName} className="sm:col-span-2" />
          {venueLine ? (
            <ReviewField label="Address" value={venueLine} className="sm:col-span-2" />
          ) : null}
          {values.ageRule || values.venueType ? (
            <ReviewField
              label="Age / type"
              value={[values.ageRule, values.venueType].filter(Boolean).join(" · ")}
            />
          ) : null}
          {values.capacity != null ? <ReviewField label="Capacity" value={values.capacity.toLocaleString()} /> : null}
          {values.venuePhone?.trim() ? <ReviewField label="Phone" value={formatPhoneDisplay(values.venuePhone)} /> : null}
        </ReviewSection>
      ) : null}

      <ReviewSection title="Tickets" icon={Ticket}>
        <ReviewField
          label="Bingo card"
          value={
            <>
              {values.ticketName}
              <span className="ml-1.5 font-normal text-muted-foreground">
                · {values.price > 0 ? `$${values.price.toFixed(2)}` : "Free"}
              </span>
            </>
          }
          className="sm:col-span-2"
        />
        {(values.capacity ?? values.quantity) != null ? (
          <ReviewField
            label="Number of seats"
            value={(values.capacity ?? values.quantity)!.toLocaleString()}
          />
        ) : null}
        {values.extraCardPrice != null && values.bonusCardsAllowed !== false ? (
          <ReviewField label="Bonus card price (USD)" value={`$${values.extraCardPrice.toFixed(2)}`} />
        ) : null}
        {values.bonusCardsAllowed === false ? (
          <ReviewField label="Bonus cards" value="Not allowed" />
        ) : null}
      </ReviewSection>

      {(values.hosts?.length || values.hostName || values.sponsors?.length || values.sponsorName) ? (
        <ReviewSection title="Host & sponsor" icon={Users}>
          {values.hosts?.length ? (
            <ReviewField
              label={values.hosts.length > 1 ? "Hosts" : "Host"}
              value={values.hosts.map((host) => host.name).join(", ")}
            />
          ) : values.hostName ? (
            <ReviewField label="Host" value={values.hostName} />
          ) : null}
          {values.sponsors?.length ? (
            <ReviewField
              label={values.sponsors.length > 1 ? "Sponsors" : "Sponsor"}
              value={values.sponsors.map((sponsor) => sponsor.name).join(", ")}
            />
          ) : values.sponsorName ? (
            <ReviewField label="Sponsor" value={values.sponsorName} />
          ) : null}
        </ReviewSection>
      ) : null}

      {(bingoGamesCount > 0 || faqCount > 0) ? (
        <ReviewSection title="Games & FAQs" icon={Grid3x3}>
          {bingoGamesCount > 0 ? (
            <ReviewField
              label="Bingo games"
              value={`${bingoGamesCount} round${bingoGamesCount === 1 ? "" : "s"}`}
            />
          ) : null}
          {faqCount > 0 ? (
            <ReviewField
              label="FAQs"
              value={`${faqCount} question${faqCount === 1 ? "" : "s"}`}
            />
          ) : null}
        </ReviewSection>
      ) : null}

      <ReviewSection title="Settings" icon={Settings2}>
        <ReviewField label="Format" value={values.deliveryMode.replace(/_/g, " ")} className="capitalize" />
        <ReviewField label="Listing" value={values.isPublic ? "Visible in catalog" : "Hidden from catalog"} />
        {values.cancellationPolicy?.trim() ? (
          <ReviewField label="Cancellation" value={values.cancellationPolicy} className="sm:col-span-2" />
        ) : null}
        {values.requirements?.trim() ? (
          <ReviewField label="Requirements" value={values.requirements} className="sm:col-span-2" />
        ) : null}
      </ReviewSection>
    </div>
  );
}
