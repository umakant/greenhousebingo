import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { EventPlatformMaintenanceSettings } from "@/lib/event-platform/event-platform-settings";

export function EventPlatformMaintenanceBlock({
  settings,
}: {
  settings: EventPlatformMaintenanceSettings;
}) {
  return (
    <div
      className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center rounded-lg border border-border/80 bg-card p-8 text-center"
      style={
        settings.backgroundImage
          ? {
              backgroundImage: `url(${settings.backgroundImage})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      <h2 className="text-lg font-semibold">{settings.title}</h2>
      <p className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">{settings.message}</p>
      {settings.estimatedReturnAt ? (
        <p className="mt-2 text-xs text-muted-foreground">Expected back: {settings.estimatedReturnAt}</p>
      ) : null}
      <Button variant="outline" size="sm" className="mt-6" asChild>
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
