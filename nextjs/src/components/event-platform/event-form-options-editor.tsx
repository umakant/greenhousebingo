"use client";

import * as React from "react";
import { ArrowDown, ArrowUp, CalendarRange, MapPin, Monitor, Plus, Shield, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  slugifyFormOptionValue,
  type EventFormOptionItem,
  type EventPlatformEventFormSettings,
} from "@/lib/event-platform/event-form-options";
import { LMS_EVENT_IN_PERSON_ONLY } from "@/lib/lms-events/constants";

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

const ALL_EVENT_FORM_OPTION_SECTIONS: EventFormOptionSectionConfig[] = [
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

export const EVENT_FORM_OPTION_SECTIONS = ALL_EVENT_FORM_OPTION_SECTIONS.filter(
  (section) => !(LMS_EVENT_IN_PERSON_ONLY && section.id === "formats"),
);

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

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40%]">Label</TableHead>
              <TableHead className="w-[35%]">{valueEditable ? "Value (stored)" : "Value"}</TableHead>
              <TableHead className="w-24 text-center">Enabled</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                  No options yet.
                </TableCell>
              </TableRow>
            ) : (
              items.map((row, index) => (
                <TableRow key={`${row.value}-${index}`}>
                  <TableCell className="align-middle">
                    <Input
                      value={row.label}
                      onChange={(e) => {
                        const label = e.target.value;
                        const patch: Partial<EventFormOptionItem> = { label };
                        if (!valueEditable) patch.value = label;
                        patchAt(index, patch);
                      }}
                    />
                  </TableCell>
                  <TableCell className="align-middle">
                    <Input
                      value={row.value}
                      disabled={!valueEditable}
                      onChange={(e) =>
                        patchAt(index, { value: slugifyFormOptionValue(e.target.value) || e.target.value })
                      }
                    />
                  </TableCell>
                  <TableCell className="align-middle text-center">
                    <Switch checked={row.enabled} onCheckedChange={(v) => patchAt(index, { enabled: v })} />
                  </TableCell>
                  <TableCell className="align-middle">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                        aria-label="Move up"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => move(index, 1)}
                        disabled={index === items.length - 1}
                        aria-label="Move down"
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => remove(index)}
                        disabled={items.length <= 1}
                        aria-label="Remove"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {valueHint ? <p className="text-xs text-muted-foreground">{valueHint}</p> : null}

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
