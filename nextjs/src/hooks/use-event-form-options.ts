"use client";

import * as React from "react";

import {
  defaultEventPlatformEventFormSettings,
  enabledFormOptions,
  type EventPlatformEventFormSettings,
} from "@/lib/event-platform/event-form-options";

export function useEventFormOptions() {
  const [settings, setSettings] = React.useState<EventPlatformEventFormSettings>(
    defaultEventPlatformEventFormSettings(),
  );
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/event-platform/settings/event-form", {
          credentials: "include",
          cache: "no-store",
        });
        const data = (await res.json()) as { ok?: boolean; settings?: EventPlatformEventFormSettings };
        if (!cancelled && res.ok && data.ok && data.settings) {
          setSettings(data.settings);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    loading,
    settings,
    eventTypes: enabledFormOptions(settings.eventTypes),
    deliveryModes: enabledFormOptions(settings.deliveryModes),
    ageRules: enabledFormOptions(settings.ageRules),
    venueTypes: enabledFormOptions(settings.venueTypes),
  };
}
