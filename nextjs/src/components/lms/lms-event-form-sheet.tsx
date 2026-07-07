"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import {
  LmsEventCreateWizard,
  LmsEventCreateWizardSavingOverlay,
} from "@/components/lms/lms-event-create-wizard";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { eventToWizardInput } from "@/lib/lms-events/event-wizard-input";
import type { LmsEventCreateWizardInput } from "@/lib/lms-events/schemas";
import type { LmsEvent, LmsEventCategory, LmsEventTicket } from "@/lib/lms-events/types";

export type LmsEventSheetMode = "create" | "edit";

type LmsEventFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: LmsEventSheetMode;
  eventId?: string;
  eventTitle?: string;
  categories: LmsEventCategory[];
  onSaved: () => void;
};

export function LmsEventFormSheet({
  open,
  onOpenChange,
  mode: initialMode,
  eventId: initialEventId,
  eventTitle,
  categories,
  onSaved,
}: LmsEventFormSheetProps) {
  const [mode, setMode] = React.useState<LmsEventSheetMode>(initialMode);
  const [eventId, setEventId] = React.useState<string | undefined>(initialEventId);
  const [saving, setSaving] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [loadErr, setLoadErr] = React.useState<string | null>(null);
  const [initialValues, setInitialValues] = React.useState<LmsEventCreateWizardInput | undefined>();
  const [formKey, setFormKey] = React.useState(0);

  React.useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setEventId(initialEventId);
    setSaving(false);
    setLoadErr(null);

    if (initialMode === "create") {
      setInitialValues(undefined);
      setLoading(false);
      setFormKey((k) => k + 1);
      return;
    }

    if (!initialEventId) {
      setLoadErr("Event not found.");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void (async () => {
      const res = await fetch(`/api/lms/admin/events/${encodeURIComponent(initialEventId)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        event?: LmsEvent;
        tickets?: LmsEventTicket[];
      } | null;

      if (cancelled) return;
      if (!res.ok || !data?.ok || !data.event) {
        setLoadErr(data?.message ?? "Could not load event.");
        setLoading(false);
        return;
      }

      setInitialValues(eventToWizardInput(data.event, data.tickets ?? []));
      setFormKey((k) => k + 1);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, initialMode, initialEventId]);

  const title =
    mode === "create"
      ? "Create New Event"
      : eventTitle?.trim()
        ? `Edit Event — ${eventTitle.trim().slice(0, 48)}`
        : "Edit Event";

  async function handleSubmit(values: LmsEventCreateWizardInput) {
    const url =
      mode === "edit" && eventId
        ? `/api/lms/admin/events/${encodeURIComponent(eventId)}`
        : "/api/lms/admin/events";
    const method = mode === "edit" ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    if (!res.ok || !data?.ok) {
      throw new Error(data?.message ?? (mode === "edit" ? "Could not update event." : "Could not create event."));
    }
    onSaved();
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl lg:max-w-2xl">
        <SheetHeader className="shrink-0 border-b px-6 py-4 text-left">
          <SheetTitle>{title}</SheetTitle>
          <p className="text-sm text-muted-foreground">
            {mode === "create"
              ? "Fill in the details to create a training event."
              : "Update event details, schedule, tickets, and settings."}
          </p>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="relative px-6 py-4">
            {loading ? (
              <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading event…
              </div>
            ) : loadErr ? (
              <p className="text-sm text-destructive">{loadErr}</p>
            ) : (
              <>
                <LmsEventCreateWizard
                  key={formKey}
                  mode={mode}
                  categories={categories}
                  initialValues={initialValues}
                  onSubmit={handleSubmit}
                  onSavingChange={setSaving}
                />
                <LmsEventCreateWizardSavingOverlay saving={saving} />
              </>
            )}
          </div>
        </ScrollArea>

        <SheetFooter className="shrink-0 border-t px-6 py-4 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
