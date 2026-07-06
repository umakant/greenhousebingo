"use client";

import * as React from "react";

import {
  LmsEventCreateWizard,
} from "@/components/lms/lms-event-create-wizard";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { LmsEventCreateWizardInput } from "@/lib/lms-events/schemas";
import type { LmsEventCategory } from "@/lib/lms-events/types";

type LmsEventFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: LmsEventCategory[];
  onCreated: () => void;
};

export function LmsEventFormSheet({ open, onOpenChange, categories, onCreated }: LmsEventFormSheetProps) {
  const [saving, setSaving] = React.useState(false);
  const [formKey, setFormKey] = React.useState(0);

  React.useEffect(() => {
    if (open) {
      setSaving(false);
      setFormKey((k) => k + 1);
    }
  }, [open]);

  async function handleSubmit(values: LmsEventCreateWizardInput) {
    const res = await fetch("/api/lms/admin/events", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
    if (!res.ok || !data?.ok) {
      throw new Error(data?.message ?? "Could not create event.");
    }
    onCreated();
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl lg:max-w-2xl">
        <SheetHeader className="shrink-0 border-b px-6 py-4 text-left">
          <SheetTitle>Create New Event</SheetTitle>
          <p className="text-sm text-muted-foreground">Fill in the details to create a training event.</p>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="relative px-6 py-4">
            <LmsEventCreateWizard
              key={formKey}
              categories={categories}
              onSubmit={handleSubmit}
              onSavingChange={setSaving}
            />
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
