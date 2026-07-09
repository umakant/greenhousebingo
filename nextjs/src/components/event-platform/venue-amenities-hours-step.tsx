"use client";

import * as React from "react";
import { Copy, Info, Users, UtensilsCrossed, Wine } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { TimeInput12h } from "@/components/ui/time-input-12h";
import {
  formatVenueDayHours,
  parseVenueDayHours,
  type VenueDayHours,
} from "@/lib/event-platform/venues/venue-business-hours";
import type { VenueWeekday } from "@/lib/event-platform/venues/venue-types";
import { VENUE_WEEKDAYS } from "@/lib/event-platform/venues/venue-types";
import { cn } from "@/lib/utils";

import type { VenueFormState } from "./venue-form-sheet";

const WEEKDAY_LABELS: Record<VenueWeekday, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const AMENITY_CARDS = [
  {
    id: "age21Plus" as const,
    title: "Age 21+",
    description: "Requires guests to be 21 years or older",
    icon: Users,
    iconClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "drinksAlcohol" as const,
    title: "Drinks (alcohol)",
    description: "Alcoholic beverages available",
    icon: Wine,
    iconClass: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  },
  {
    id: "food" as const,
    title: "Food",
    description: "Food or catering available",
    icon: UtensilsCrossed,
    iconClass: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
  },
];

type Props = {
  form: VenueFormState;
  setForm: React.Dispatch<React.SetStateAction<VenueFormState>>;
};

function updateDayHours(
  setForm: Props["setForm"],
  day: VenueWeekday,
  next: VenueDayHours,
) {
  setForm((f) => ({
    ...f,
    businessHours: { ...f.businessHours, [day]: formatVenueDayHours(next) },
  }));
}

function DayHoursRow({
  day,
  raw,
  setForm,
}: {
  day: VenueWeekday;
  raw: string;
  setForm: Props["setForm"];
}) {
  const parsed = parseVenueDayHours(raw);
  const disabled = !parsed.isOpen || parsed.is24Hours;

  return (
    <div className="grid gap-3 border-b py-3 last:border-b-0 sm:grid-cols-[88px_88px_1fr_auto] sm:items-center">
      <span className="text-sm font-medium">{WEEKDAY_LABELS[day]}</span>

      <div className="flex items-center gap-2">
        <Switch
          id={`hours-open-${day}`}
          checked={parsed.isOpen}
          onCheckedChange={(open) =>
            updateDayHours(setForm, day, { ...parsed, isOpen: open, is24Hours: open ? parsed.is24Hours : false })
          }
        />
        <Label htmlFor={`hours-open-${day}`} className="text-xs text-muted-foreground">
          {parsed.isOpen ? "Open" : "Closed"}
        </Label>
      </div>

      <div
        className={cn(
          "flex flex-wrap items-center gap-2 sm:gap-3",
          !parsed.isOpen && "opacity-50",
        )}
      >
        <TimeInput12h
          compact
          aria-label={`${WEEKDAY_LABELS[day]} start`}
          value={parsed.start}
          disabled={disabled}
          onChange={(start) => updateDayHours(setForm, day, { ...parsed, start })}
        />
        <span className="text-xs text-muted-foreground">to</span>
        <TimeInput12h
          compact
          aria-label={`${WEEKDAY_LABELS[day]} end`}
          value={parsed.end}
          disabled={disabled}
          onChange={(end) => updateDayHours(setForm, day, { ...parsed, end })}
        />
      </div>

      <div className={cn("flex items-center gap-2", !parsed.isOpen && "opacity-50")}>
        <Checkbox
          id={`hours-24-${day}`}
          checked={parsed.is24Hours}
          disabled={!parsed.isOpen}
          onCheckedChange={(checked) =>
            updateDayHours(setForm, day, {
              ...parsed,
              is24Hours: checked === true,
            })
          }
        />
        <Label htmlFor={`hours-24-${day}`} className="text-xs text-muted-foreground whitespace-nowrap">
          24 Hours
        </Label>
      </div>
    </div>
  );
}

export function VenueAmenitiesHoursStep({ form, setForm }: Props) {
  const timezone = React.useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "local time",
    [],
  );

  function copyHoursToAll() {
    const monday = form.businessHours.mon;
    setForm((f) => {
      const next = { ...f.businessHours };
      for (const day of VENUE_WEEKDAYS) {
        if (day !== "mon") next[day] = monday;
      }
      return { ...f, businessHours: next };
    });
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <div>
          <h3 className="text-base font-semibold">Amenities</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Set the capacity and available amenities at this venue.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="venue-seating">
            Seating Capacity <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Input
              id="venue-seating"
              inputMode="numeric"
              value={form.seating}
              onChange={(e) => setForm((f) => ({ ...f, seating: e.target.value.replace(/\D/g, "") }))}
              placeholder="Enter total seating capacity"
              className="pr-10"
            />
            <Users className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground">Example: 150</p>
        </div>

        <div className="grid gap-3">
          {AMENITY_CARDS.map((card) => {
            const Icon = card.icon;
            const checked = form[card.id];
            return (
              <div
                key={card.id}
                className="flex items-center gap-4 rounded-xl border bg-card p-4 shadow-sm"
              >
                <div
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    card.iconClass,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{card.title}</p>
                  <p className="text-xs text-muted-foreground">{card.description}</p>
                </div>
                <Switch
                  id={card.id}
                  checked={checked}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, [card.id]: v }))}
                />
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-base font-semibold">Business Hours (Mon – Sun)</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Set operating hours for each day. These will be shown to event organizers and attendees.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={copyHoursToAll}>
            <Copy className="mr-2 h-4 w-4" />
            Copy hours to all
          </Button>
        </div>

        <div>
          {VENUE_WEEKDAYS.map((day) => (
            <DayHoursRow key={day} day={day} raw={form.businessHours[day]} setForm={setForm} />
          ))}
        </div>

        <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            All times are in your local time zone ({timezone}).
          </p>
        </div>
      </section>
    </div>
  );
}
