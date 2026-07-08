"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, CalendarRange, MapPin, Monitor, Plus, Shield, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  slugifyFormOptionValue,
  type EventFormOptionItem,
  type EventPlatformEventFormSettings,
} from "@/lib/event-platform/event-form-options";

export type EventFormOptionSectionId = "event-types" | "formats" | "age-rules" | "venue-types";

type EventFormOptionSectionConfig = {
  id: EventFormOptionSectionId;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  settingsKey: keyof EventPlatformEventFormSettings;
  valueEditable?: boolean;
  valueHint?: string;
};

export const EVENT_FORM_OPTION_SECTIONS: EventFormOptionSectionConfig[] = [
  {
    id: "event-types",
    title: "Event types",
    description: 'Options shown in the event editor "Event type" dropdown.',
    icon: CalendarRange,
    settingsKey: "eventTypes",
    valueEditable: true,
    valueHint: "Use lowercase slugs (e.g. live_workshop). Existing events keep their stored value.",
  },
  {
    id: "formats",
    title: "Formats",
    description: "Delivery format buttons (Online, In person, Hybrid, etc.).",
    icon: Monitor,
    settingsKey: "deliveryModes",
    valueEditable: true,
    valueHint: "Stored as delivery_mode (e.g. in_person).",
  },
  {
    id: "age-rules",
    title: "Age rules",
    description: "Age restriction choices on the event details step.",
    icon: Shield,
    settingsKey: "ageRules",
  },
  {
    id: "venue-types",
    title: "Venue types",
    description: "Venue category dropdown (Brewery, Taproom, etc.).",
    icon: MapPin,
    settingsKey: "venueTypes",
  },
];

const SECTION_BY_ID = Object.fromEntries(
  EVENT_FORM_OPTION_SECTIONS.map((section) => [section.id, section]),
) as Record<EventFormOptionSectionId, EventFormOptionSectionConfig>;

export function isEventFormOptionSectionId(value: string | null): value is EventFormOptionSectionId {
  return value !== null && value in SECTION_BY_ID;
}

function OptionListEditor(props: {
  title?: string;
  description?: string;
  items: EventFormOptionItem[];
  onChange: (items: EventFormOptionItem[]) => void;
  valueEditable?: boolean;
  valueHint?: string;
  hideHeader?: boolean;
}) {
  const { title, description, items, onChange, valueEditable = false, valueHint, hideHeader = false } = props;

  function patchAt(index: number, patch: Partial<EventFormOptionItem>) {
    onChange(items.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  function move(index: number, dir: -1 | 1) {
    const next = index + dir;
    if (next < 0 || next >= items.length) return;
    const copy = [...items];
    const a = copy[index];
    const b = copy[next];
    copy[index] = { ...b, sortOrder: a.sortOrder };
    copy[next] = { ...a, sortOrder: b.sortOrder };
    onChange(copy.sort((x, y) => x.sortOrder - y.sortOrder));
  }

  function remove(index: number) {
    onChange(
      items
        .filter((_, i) => i !== index)
        .map((row, i) => ({ ...row, sortOrder: i + 1 })),
    );
  }

  function add() {
    const label = "New option";
    const base = slugifyFormOptionValue(label) || `option_${items.length + 1}`;
    let value = base;
    let n = 2;
    const used = new Set(items.map((i) => i.value));
    while (used.has(value)) {
      value = `${base}_${n++}`;
    }
    onChange([...items, { value, label, enabled: true, sortOrder: items.length + 1 }]);
  }

  return (
    <div className={hideHeader ? "space-y-4" : "rounded-lg border p-4 space-y-4"}>
      {!hideHeader && title ? (
        <div>
          <p className="font-medium">{title}</p>
          {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
        </div>
      ) : null}

      <div className="space-y-3">
        {items.map((row, index) => (
          <div
            key={`${row.value}-${index}`}
            className="grid gap-3 rounded-md border border-border/60 bg-muted/20 p-3 sm:grid-cols-[1fr_1fr_auto]"
          >
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Label</Label>
              <Input
                value={row.label}
                onChange={(e) => {
                  const label = e.target.value;
                  const patch: Partial<EventFormOptionItem> = { label };
                  if (!valueEditable) patch.value = label;
                  patchAt(index, patch);
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                {valueEditable ? "Value (stored)" : "Value"}
              </Label>
              <Input
                value={row.value}
                disabled={!valueEditable}
                onChange={(e) => patchAt(index, { value: slugifyFormOptionValue(e.target.value) || e.target.value })}
              />
              {valueHint ? <p className="text-[11px] text-muted-foreground">{valueHint}</p> : null}
            </div>
            <div className="flex flex-wrap items-end gap-2 sm:flex-col sm:items-stretch">
              <div className="flex items-center justify-between gap-2 rounded-md border bg-background px-3 py-2">
                <Label className="text-xs">Enabled</Label>
                <Switch checked={row.enabled} onCheckedChange={(v) => patchAt(index, { enabled: v })} />
              </div>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => move(index, 1)}
                  disabled={index === items.length - 1}
                >
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 text-destructive"
                  onClick={() => remove(index)}
                  disabled={items.length <= 1}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Button type="button" variant="outline" size="sm" onClick={add}>
        <Plus className="mr-2 h-4 w-4" />
        Add option
      </Button>
    </div>
  );
}

export function EventFormOptionSectionEditor(props: {
  sectionId: EventFormOptionSectionId;
  settings: EventPlatformEventFormSettings;
  onChange: (settings: EventPlatformEventFormSettings) => void;
}) {
  const { sectionId, settings, onChange } = props;
  const section = SECTION_BY_ID[sectionId];

  return (
    <OptionListEditor
      items={settings[section.settingsKey]}
      onChange={(items) => onChange({ ...settings, [section.settingsKey]: items })}
      valueEditable={section.valueEditable}
      valueHint={section.valueHint}
      hideHeader
    />
  );
}

export function EventFormOptionsEditor(props: {
  settings: EventPlatformEventFormSettings;
  onChange: (settings: EventPlatformEventFormSettings) => void;
}) {
  const { settings, onChange } = props;

  return (
    <div className="space-y-6">
      {EVENT_FORM_OPTION_SECTIONS.map((section) => (
        <OptionListEditor
          key={section.id}
          title={section.title}
          description={section.description}
          items={settings[section.settingsKey]}
          onChange={(items) => onChange({ ...settings, [section.settingsKey]: items })}
          valueEditable={section.valueEditable}
          valueHint={section.valueHint}
        />
      ))}
    </div>
  );
}
