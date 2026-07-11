"use client";

import Link from "next/link";
import { AlertCircle, Lock, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EVENT_PLATFORM_PATHS } from "@/lib/event-platform/paths";

export function EventCommandNotFoundState(props: { message?: string }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
        <AlertCircle className="h-10 w-10 text-muted-foreground" />
        <div>
          <h2 className="text-lg font-semibold">Event not found</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {props.message ?? "This event may have been removed or you may have followed an invalid link."}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={EVENT_PLATFORM_PATHS.events}>Back to events</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function EventCommandPermissionDeniedState(props: { message?: string }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
        <Lock className="h-10 w-10 text-muted-foreground" />
        <div>
          <h2 className="text-lg font-semibold">Permission denied</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {props.message ?? "You do not have permission to view this event command center."}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={EVENT_PLATFORM_PATHS.dashboard}>Back to Event Platform</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

export function EventCommandErrorState(props: { message: string; onRetry: () => void; retrying?: boolean }) {
  return (
    <Card className="shadow-sm border-destructive/30">
      <CardContent className="flex flex-col items-center gap-4 py-16 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <div>
          <h2 className="text-lg font-semibold">Could not load event</h2>
          <p className="mt-1 text-sm text-muted-foreground">{props.message}</p>
        </div>
        <Button type="button" variant="outline" className="gap-2" onClick={props.onRetry} disabled={props.retrying}>
          <RefreshCw className={`h-4 w-4 ${props.retrying ? "animate-spin" : ""}`} />
          Try again
        </Button>
      </CardContent>
    </Card>
  );
}
