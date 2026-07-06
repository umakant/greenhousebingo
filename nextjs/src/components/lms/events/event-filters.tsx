"use client";

import * as React from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LMS_EVENT_DELIVERY_MODES, LMS_EVENT_TYPES, LMS_EVENT_TYPE_LABELS } from "@/lib/lms-events/constants";
import type { LmsEventListFiltersInput } from "@/lib/lms-events/schemas";
import type { LmsEventCategory } from "@/lib/lms-events/types";

const DELIVERY_LABELS: Record<(typeof LMS_EVENT_DELIVERY_MODES)[number], string> = {
  online: "Online",
  in_person: "In person",
  hybrid: "Hybrid",
};

export function EventFilters(props: {
  categories: LmsEventCategory[];
  value: LmsEventListFiltersInput;
  onChange: (next: LmsEventListFiltersInput) => void;
  onReset?: () => void;
  showEventType?: boolean;
}) {
  const { categories, value, onChange, onReset, showEventType = false } = props;

  function patch(partial: Partial<LmsEventListFiltersInput>) {
    onChange({ ...value, ...partial });
  }

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-2 md:col-span-2 xl:col-span-2">
          <Label htmlFor="event-search">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="event-search"
              placeholder="Search events…"
              className="pl-9"
              value={value.search ?? ""}
              onChange={(e) => patch({ search: e.target.value || undefined })}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Category</Label>
          <Select
            value={value.categoryId ?? "all"}
            onValueChange={(v) => patch({ categoryId: v === "all" ? undefined : v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Format</Label>
          <Select
            value={value.deliveryMode ?? "all"}
            onValueChange={(v) =>
              patch({
                deliveryMode: v === "all" ? undefined : (v as LmsEventListFiltersInput["deliveryMode"]),
              })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Any format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All formats</SelectItem>
              {LMS_EVENT_DELIVERY_MODES.map((mode) => (
                <SelectItem key={mode} value={mode}>
                  {DELIVERY_LABELS[mode]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {showEventType ? (
          <div className="space-y-2">
            <Label>Event type</Label>
            <Select
              value={value.eventType ?? "all"}
              onValueChange={(v) =>
                patch({
                  eventType: v === "all" ? undefined : (v as LmsEventListFiltersInput["eventType"]),
                })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {LMS_EVENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {LMS_EVENT_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label htmlFor="event-date-from">From</Label>
          <Input
            id="event-date-from"
            type="date"
            value={value.dateFrom?.slice(0, 10) ?? ""}
            onChange={(e) => patch({ dateFrom: e.target.value || undefined })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="event-date-to">To</Label>
          <Input
            id="event-date-to"
            type="date"
            value={value.dateTo?.slice(0, 10) ?? ""}
            onChange={(e) => patch({ dateTo: e.target.value || undefined })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="event-location">Location</Label>
          <Input
            id="event-location"
            placeholder="City or venue"
            value={value.location ?? ""}
            onChange={(e) => patch({ location: e.target.value || undefined })}
          />
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <Button
            type="button"
            size="sm"
            variant={value.freeOnly ? "default" : "outline"}
            onClick={() => patch({ freeOnly: !value.freeOnly, paidOnly: false })}
          >
            Free
          </Button>
          <Button
            type="button"
            size="sm"
            variant={value.paidOnly ? "default" : "outline"}
            onClick={() => patch({ paidOnly: !value.paidOnly, freeOnly: false })}
          >
            Paid
          </Button>
          <Button
            type="button"
            size="sm"
            variant={value.certificationOnly ? "default" : "outline"}
            onClick={() => patch({ certificationOnly: !value.certificationOnly })}
          >
            Certification
          </Button>
          {onReset ? (
            <Button type="button" size="sm" variant="ghost" onClick={onReset}>
              Reset
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
