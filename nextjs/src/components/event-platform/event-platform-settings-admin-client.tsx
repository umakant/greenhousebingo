"use client";

import * as React from "react";
import { Loader2, Star } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import {
  EVENT_FORM_OPTION_SECTIONS,
  EventFormOptionSectionEditor,
  isEventFormOptionSectionId,
  type EventFormOptionSectionId,
} from "@/components/event-platform/event-form-options-editor";
import { FeaturedEventsSettingsEditor } from "@/components/event-platform/featured-events-settings-editor";
import {
  SettingsSectionShell,
  SettingsSidebarLayout,
  type SettingsSidebarSection,
} from "@/components/settings/settings-section-layout";
import {
  defaultEventPlatformEventFormSettings,
  type EventPlatformEventFormSettings,
} from "@/lib/event-platform/event-form-options";
import {
  DEFAULT_FEATURED_EVENTS_MAX_SLOTS,
  type EventPlatformFeaturedEventsSettings,
  type FeaturedEventsStats,
} from "@/lib/event-platform/featured-events-types";

const SECTIONS: SettingsSidebarSection[] = [
  ...EVENT_FORM_OPTION_SECTIONS.map((section) => ({
    id: section.id,
    title: section.title,
    icon: section.icon,
  })),
  { id: "featured-events", title: "Featured events", icon: Star },
];

type SettingsSectionId = EventFormOptionSectionId | "featured-events";

const SECTION_META = Object.fromEntries(
  EVENT_FORM_OPTION_SECTIONS.map((section) => [section.id, section]),
) as Record<
  EventFormOptionSectionId,
  (typeof EVENT_FORM_OPTION_SECTIONS)[number]
>;

export function EventPlatformSettingsAdminClient() {
  const searchParams = useSearchParams();
  const [active, setActive] = React.useState<SettingsSectionId>("event-types");
  const [eventForm, setEventForm] = React.useState<EventPlatformEventFormSettings>(
    defaultEventPlatformEventFormSettings(),
  );
  const [featuredSettings, setFeaturedSettings] = React.useState<EventPlatformFeaturedEventsSettings>({
    maxSlots: DEFAULT_FEATURED_EVENTS_MAX_SLOTS,
  });
  const [featuredStats, setFeaturedStats] = React.useState<FeaturedEventsStats | null>(null);
  const [loadingEventForm, setLoadingEventForm] = React.useState(true);
  const [loadingFeatured, setLoadingFeatured] = React.useState(true);
  const [savingEventForm, setSavingEventForm] = React.useState(false);
  const [savingFeatured, setSavingFeatured] = React.useState(false);

  const loadEventForm = React.useCallback(async () => {
    setLoadingEventForm(true);
    try {
      const res = await fetch("/api/event-platform/settings/event-form", {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        settings?: EventPlatformEventFormSettings;
        message?: string;
      };
      if (!res.ok || !data.ok || !data.settings) throw new Error(data.message ?? "Load failed");
      setEventForm(data.settings);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load event form options.");
    } finally {
      setLoadingEventForm(false);
    }
  }, []);

  const loadFeatured = React.useCallback(async () => {
    setLoadingFeatured(true);
    try {
      const res = await fetch("/api/event-platform/settings/featured-events", {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        settings?: EventPlatformFeaturedEventsSettings;
        stats?: FeaturedEventsStats;
        message?: string;
      };
      if (!res.ok || !data.ok || !data.settings) throw new Error(data.message ?? "Load failed");
      setFeaturedSettings(data.settings);
      setFeaturedStats(data.stats ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not load featured events settings.");
    } finally {
      setLoadingFeatured(false);
    }
  }, []);

  React.useEffect(() => {
    const tab = searchParams?.get("tab") ?? null;
    if (tab === "featured-events") setActive("featured-events");
    else if (isEventFormOptionSectionId(tab)) setActive(tab);
  }, [searchParams]);

  React.useEffect(() => {
    void loadEventForm();
    void loadFeatured();
  }, [loadEventForm, loadFeatured]);

  async function saveEventForm() {
    setSavingEventForm(true);
    try {
      const res = await fetch("/api/event-platform/settings/event-form", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: eventForm }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Save failed");
      toast.success(data.message ?? "Event form options saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingEventForm(false);
    }
  }

  async function saveFeatured() {
    setSavingFeatured(true);
    try {
      const res = await fetch("/api/event-platform/settings/featured-events", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: featuredSettings }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        message?: string;
        stats?: FeaturedEventsStats;
        settings?: EventPlatformFeaturedEventsSettings;
      };
      if (!res.ok || !data.ok) throw new Error(data.message ?? "Save failed");
      if (data.settings) setFeaturedSettings(data.settings);
      if (data.stats) setFeaturedStats(data.stats);
      toast.success(data.message ?? "Featured events settings saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingFeatured(false);
    }
  }

  if (loadingEventForm && loadingFeatured) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading event form options…
      </div>
    );
  }

  const isFeaturedSection = active === "featured-events";
  const meta = isFeaturedSection
    ? {
        title: "Featured events",
        description: "Set how many events can be featured on the public events page at once.",
        icon: Star,
      }
    : SECTION_META[active as EventFormOptionSectionId];

  return (
    <SettingsSidebarLayout
      sections={SECTIONS}
      active={active}
      onSelect={(id) => setActive(id as SettingsSectionId)}
    >
      <SettingsSectionShell
        title={meta.title}
        description={meta.description}
        icon={meta.icon}
        onSave={() => void (isFeaturedSection ? saveFeatured() : saveEventForm())}
        saving={isFeaturedSection ? savingFeatured : savingEventForm}
      >
        {isFeaturedSection ? (
          <FeaturedEventsSettingsEditor
            settings={featuredSettings}
            stats={featuredStats}
            onChange={setFeaturedSettings}
          />
        ) : (
          <EventFormOptionSectionEditor sectionId={active as EventFormOptionSectionId} settings={eventForm} onChange={setEventForm} />
        )}
      </SettingsSectionShell>
    </SettingsSidebarLayout>
  );
}
