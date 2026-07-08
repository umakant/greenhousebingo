import {
  LMS_EVENT_AGE_RULES,
  LMS_EVENT_DELIVERY_MODES,
  LMS_EVENT_TYPE_LABELS,
  LMS_EVENT_TYPES,
  LMS_EVENT_VENUE_TYPES,
} from "@/lib/lms-events/constants";

export type EventFormOptionItem = {
  value: string;
  label: string;
  enabled: boolean;
  sortOrder: number;
};

export type EventPlatformEventFormSettings = {
  eventTypes: EventFormOptionItem[];
  deliveryModes: EventFormOptionItem[];
  ageRules: EventFormOptionItem[];
  venueTypes: EventFormOptionItem[];
};

const DELIVERY_MODE_LABELS: Record<(typeof LMS_EVENT_DELIVERY_MODES)[number], string> = {
  online: "Online",
  in_person: "In person",
  hybrid: "Hybrid",
};

function item(value: string, label: string, sortOrder: number): EventFormOptionItem {
  return { value, label, enabled: true, sortOrder };
}

export function defaultEventPlatformEventFormSettings(): EventPlatformEventFormSettings {
  return {
    eventTypes: LMS_EVENT_TYPES.map((t, i) => item(t, LMS_EVENT_TYPE_LABELS[t], i + 1)),
    deliveryModes: LMS_EVENT_DELIVERY_MODES.map((m, i) => item(m, DELIVERY_MODE_LABELS[m], i + 1)),
    ageRules: LMS_EVENT_AGE_RULES.map((r, i) => item(r, r, i + 1)),
    venueTypes: LMS_EVENT_VENUE_TYPES.map((v, i) => item(v, v, i + 1)),
  };
}

function normalizeList(raw: unknown, fallback: EventFormOptionItem[]): EventFormOptionItem[] {
  if (!Array.isArray(raw) || raw.length === 0) return fallback;
  const parsed: EventFormOptionItem[] = [];
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const value = String(o.value ?? "").trim();
    const label = String(o.label ?? value).trim();
    if (!value || !label) continue;
    parsed.push({
      value: value.slice(0, 64),
      label: label.slice(0, 128),
      enabled: o.enabled !== false,
      sortOrder: Number.isFinite(Number(o.sortOrder)) ? Number(o.sortOrder) : i + 1,
    });
  }
  return parsed.length ? parsed.sort((a, b) => a.sortOrder - b.sortOrder) : fallback;
}

export function mergeEventFormSettings(stored: Partial<EventPlatformEventFormSettings> | null | undefined): EventPlatformEventFormSettings {
  const defaults = defaultEventPlatformEventFormSettings();
  if (!stored) return defaults;
  return {
    eventTypes: normalizeList(stored.eventTypes, defaults.eventTypes),
    deliveryModes: normalizeList(stored.deliveryModes, defaults.deliveryModes),
    ageRules: normalizeList(stored.ageRules, defaults.ageRules),
    venueTypes: normalizeList(stored.venueTypes, defaults.venueTypes),
  };
}

export function enabledFormOptions(list: EventFormOptionItem[]): EventFormOptionItem[] {
  return [...list].filter((o) => o.enabled).sort((a, b) => a.sortOrder - b.sortOrder);
}

export function slugifyFormOptionValue(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

export function validateEventFormSettings(input: EventPlatformEventFormSettings): string | null {
  const groups: { name: string; items: EventFormOptionItem[] }[] = [
    { name: "Event types", items: input.eventTypes },
    { name: "Formats", items: input.deliveryModes },
    { name: "Age rules", items: input.ageRules },
    { name: "Venue types", items: input.venueTypes },
  ];

  for (const group of groups) {
    if (!group.items.length) return `${group.name} must have at least one option.`;
    const enabled = group.items.filter((o) => o.enabled);
    if (!enabled.length) return `${group.name} must have at least one enabled option.`;
    const values = new Set<string>();
    for (const item of group.items) {
      if (!item.value.trim() || !item.label.trim()) {
        return `Each ${group.name.toLowerCase()} option needs a value and label.`;
      }
      if (values.has(item.value)) {
        return `Duplicate value "${item.value}" in ${group.name.toLowerCase()}.`;
      }
      values.add(item.value);
    }
  }
  return null;
}
