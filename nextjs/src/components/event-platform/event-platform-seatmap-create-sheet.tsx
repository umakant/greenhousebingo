"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import {
  EventPlatformSeatmapCreateWizard,
  buildLayoutFromCreateValues,
  type SeatmapCreateWizardValues,
} from "@/components/event-platform/event-platform-seatmap-create-wizard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EVENT_PLATFORM_PATHS } from "@/lib/event-platform/paths";

type EventPlatformSeatmapCreateSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDemo?: boolean;
};

export function EventPlatformSeatmapCreateSheet({
  open,
  onOpenChange,
  isDemo = false,
}: EventPlatformSeatmapCreateSheetProps) {
  const router = useRouter();
  const [formKey, setFormKey] = React.useState(0);

  React.useEffect(() => {
    if (open) setFormKey((k) => k + 1);
  }, [open]);

  async function handleSubmit(values: SeatmapCreateWizardValues) {
    if (isDemo) {
      toast.message("Demo mode", { description: "Create a real seat map after seeding or clearing demo state." });
      onOpenChange(false);
      return;
    }

    const res = await fetch("/api/event-platform/seatmaps", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: values.name.trim(),
        description: values.description.trim() || undefined,
        status: "draft",
        layout: buildLayoutFromCreateValues(values),
      }),
    });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; item?: { id: string }; message?: string } | null;
    if (!res.ok || !json?.ok || !json.item) {
      throw new Error(json?.message ?? "Create failed.");
    }

    toast.success("Seat map created.");
    onOpenChange(false);
    router.push(EVENT_PLATFORM_PATHS.seatmapEdit(json.item.id));
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl lg:max-w-2xl">
        <SheetHeader className="shrink-0 border-b px-6 py-4 text-left">
          <SheetTitle>New Seat Map</SheetTitle>
          <p className="text-sm text-muted-foreground">Create a reusable seat map template for events.</p>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="px-6 py-4">
            <EventPlatformSeatmapCreateWizard
              key={formKey}
              onSubmit={handleSubmit}
              onCancel={() => onOpenChange(false)}
            />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
