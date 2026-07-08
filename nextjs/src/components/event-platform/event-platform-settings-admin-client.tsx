"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";

import {
  EVENT_FORM_OPTION_SECTIONS,
  EventFormOptionSectionEditor,
  isEventFormOptionSectionId,
  type EventFormOptionSectionId,
} from "@/components/event-platform/event-form-options-editor";
import {
  SettingsSectionShell,
  SettingsSidebarLayout,
  type SettingsSidebarSection,
} from "@/components/settings/settings-section-layout";
import {
  defaultEventPlatformEventFormSettings,
  type EventPlatformEventFormSettings,
} from "@/lib/event-platform/event-form-options";

const SECTIONS: SettingsSidebarSection[] = EVENT_FORM_OPTION_SECTIONS.map((section) => ({
  id: section.id,
  title: section.title,
  icon: section.icon,
}));

const SECTION_META = Object.fromEntries(
  EVENT_FORM_OPTION_SECTIONS.map((section) => [section.id, section]),
) as Record<
  EventFormOptionSectionId,
  (typeof EVENT_FORM_OPTION_SECTIONS)[number]
>;

export function EventPlatformSettingsAdminClient() {
  const searchParams = useSearchParams();
  const [active, setActive] = React.useState<EventFormOptionSectionId>("event-types");
  const [eventForm, setEventForm] = React.useState<EventPlatformEventFormSettings>(
    defaultEventPlatformEventFormSettings(),
  );
  const [loadingEventForm, setLoadingEventForm] = React.useState(true);
  const [savingEventForm, setSavingEventForm] = React.useState(false);

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

  React.useEffect(() => {
    const tab = searchParams?.get("tab") ?? null;
    if (isEventFormOptionSectionId(tab)) setActive(tab);
  }, [searchParams]);

  React.useEffect(() => {
    void loadEventForm();
  }, [loadEventForm]);

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

  if (loadingEventForm) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading event form options…
      </div>
    );
  }

  const meta = SECTION_META[active];

  return (
    <SettingsSidebarLayout
      sections={SECTIONS}
      active={active}
      onSelect={(id) => setActive(id as EventFormOptionSectionId)}
    >
      <SettingsSectionShell
        title={meta.title}
        description={meta.description}
        icon={meta.icon}
        onSave={() => void saveEventForm()}
        saving={savingEventForm}
      >
        <EventFormOptionSectionEditor sectionId={active} settings={eventForm} onChange={setEventForm} />
      </SettingsSectionShell>
    </SettingsSidebarLayout>
  );
}
