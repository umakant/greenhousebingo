"use client";

import * as React from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";

const DELIVERY_LABELS: Record<(typeof LMS_EVENT_DELIVERY_MODES)[number], string> = {
  online: "Online",
  in_person: "In person",
  hybrid: "Hybrid",
};

const compactSelect = "h-9 text-sm";
const compactInput = "h-9 text-sm";

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
    <div className="rounded-xl border bg-card px-3 py-2 shadow-sm">
      <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="relative min-w-[10rem] max-w-[14rem] shrink-0 flex-1">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="event-search"
            placeholder="Search events…"
            className={cn(compactInput, "pl-8")}
            value={value.search ?? ""}
            onChange={(e) => patch({ search: e.target.value || undefined })}
          />
        </div>

        <Select
          value={value.categoryId ?? "all"}
          onValueChange={(v) => patch({ categoryId: v === "all" ? undefined : v })}
        >
          <SelectTrigger className={cn(compactSelect, "w-[8.5rem] shrink-0")} aria-label="Category">
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

        <Select
          value={value.deliveryMode ?? "all"}
          onValueChange={(v) =>
            patch({
              deliveryMode: v === "all" ? undefined : (v as LmsEventListFiltersInput["deliveryMode"]),
            })
          }
        >
          <SelectTrigger className={cn(compactSelect, "w-[7.5rem] shrink-0")} aria-label="Format">
            <SelectValue placeholder="All formats" />
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

        {showEventType ? (
          <Select
            value={value.eventType ?? "all"}
            onValueChange={(v) =>
              patch({
                eventType: v === "all" ? undefined : (v as LmsEventListFiltersInput["eventType"]),
              })
            }
          >
            <SelectTrigger className={cn(compactSelect, "w-[7.5rem] shrink-0")} aria-label="Event type">
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
        ) : null}

        <DatePickerInput
          id="event-date-from"
          placeholder="From"
          className={cn(compactInput, "w-[7.25rem] shrink-0 px-2")}
          value={value.dateFrom?.slice(0, 10) ?? ""}
          onChange={(e) => patch({ dateFrom: e.target.value || undefined })}
        />

        <DatePickerInput
          id="event-date-to"
          placeholder="To"
          className={cn(compactInput, "w-[7.25rem] shrink-0 px-2")}
          value={value.dateTo?.slice(0, 10) ?? ""}
          onChange={(e) => patch({ dateTo: e.target.value || undefined })}
        />

        <Input
          id="event-location"
          placeholder="City or venue"
          className={cn(compactInput, "w-[8.5rem] shrink-0")}
          value={value.location ?? ""}
          onChange={(e) => patch({ location: e.target.value || undefined })}
        />

        <div className="flex shrink-0 items-center gap-1">
          <Button
            type="button"
            size="sm"
            className="h-8 px-2.5 text-xs"
            variant={value.freeOnly ? "default" : "outline"}
            onClick={() => patch({ freeOnly: !value.freeOnly, paidOnly: false })}
          >
            Free
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 px-2.5 text-xs"
            variant={value.paidOnly ? "default" : "outline"}
            onClick={() => patch({ paidOnly: !value.paidOnly, freeOnly: false })}
          >
            Paid
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 px-2.5 text-xs"
            variant={value.certificationOnly ? "default" : "outline"}
            onClick={() => patch({ certificationOnly: !value.certificationOnly })}
          >
            Cert
          </Button>
          {onReset ? (
            <Button type="button" size="sm" className="h-8 px-2 text-xs" variant="ghost" onClick={onReset}>
              Reset
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
