"use client";

import * as React from "react";
import Link from "next/link";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DEFAULT_FEATURED_EVENTS_MAX_SLOTS,
  MAX_FEATURED_EVENTS_MAX_SLOTS,
  MIN_FEATURED_EVENTS_MAX_SLOTS,
  type EventPlatformFeaturedEventsSettings,
  type FeaturedEventsStats,
} from "@/lib/event-platform/featured-events-types";
import { EVENT_PLATFORM_PATHS } from "@/lib/event-platform/paths";

type Props = {
  settings: EventPlatformFeaturedEventsSettings;
  stats: FeaturedEventsStats | null;
  onChange: (settings: EventPlatformFeaturedEventsSettings) => void;
};

export function FeaturedEventsSettingsEditor({ settings, stats, onChange }: Props) {
  return (
    <div className="space-y-6 max-w-lg">
      <div className="rounded-lg border bg-muted/20 p-4 text-sm text-muted-foreground">
        <p>
          Control how many events can be marked <strong className="text-foreground">Featured on events page</strong> at
          once. Event editors see a live counter (e.g. <strong className="text-foreground">8/10</strong>) when creating
          or editing events.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="featured-max-slots">Maximum featured events</Label>
        <Input
          id="featured-max-slots"
          type="number"
          min={MIN_FEATURED_EVENTS_MAX_SLOTS}
          max={MAX_FEATURED_EVENTS_MAX_SLOTS}
          value={settings.maxSlots}
          onChange={(e) =>
            onChange({
              maxSlots: Number.parseInt(e.target.value, 10) || DEFAULT_FEATURED_EVENTS_MAX_SLOTS,
            })
          }
        />
        <p className="text-xs text-muted-foreground">
          Between {MIN_FEATURED_EVENTS_MAX_SLOTS} and {MAX_FEATURED_EVENTS_MAX_SLOTS}. Default is{" "}
          {DEFAULT_FEATURED_EVENTS_MAX_SLOTS}.
        </p>
      </div>

      <div className="rounded-lg border p-4">
        <p className="text-sm font-medium">Current usage</p>
        <p className="mt-2 text-3xl font-bold tracking-tight">
          {stats ? `${stats.used}/${stats.maxSlots}` : "—"}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {stats
            ? stats.remaining > 0
              ? `${stats.remaining} featured slot${stats.remaining === 1 ? "" : "s"} remaining`
              : "All featured slots are in use"
            : "Loading usage…"}
        </p>
        {stats && stats.atLimit ? (
          <p className="mt-3 text-xs text-amber-700 dark:text-amber-400">
            New events cannot be featured until you unfeature an existing event or increase this limit.
          </p>
        ) : null}
      </div>

      <p className="text-xs text-muted-foreground">
        Manage which events are featured from{" "}
        <Link href={EVENT_PLATFORM_PATHS.events} className="text-primary hover:underline">
          Event Platform → Events
        </Link>
        .
      </p>
    </div>
  );
}
