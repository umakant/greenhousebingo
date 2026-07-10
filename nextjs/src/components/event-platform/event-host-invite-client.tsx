"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar, Check, Loader2, MapPin, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { PublicHostInvitePayload } from "@/lib/event-platform/hosts/host-types";
import { cn } from "@/lib/utils";

export function EventHostInviteClient({ token }: { token: string }) {
  const [invite, setInvite] = React.useState<PublicHostInvitePayload | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [responding, setResponding] = React.useState<"accept" | "decline" | null>(null);
  const [doneStatus, setDoneStatus] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/public/event-host-invite/${encodeURIComponent(token)}`, { cache: "no-store" });
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          invite?: PublicHostInvitePayload;
          message?: string;
        } | null;
        if (!cancelled) {
          if (res.ok && data?.ok && data.invite) {
            setInvite(data.invite);
            if (data.invite.status !== "pending") setDoneStatus(data.invite.status);
          } else {
            setInvite(null);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function respond(action: "accept" | "decline") {
    setResponding(action);
    try {
      const res = await fetch(`/api/public/event-host-invite/${encodeURIComponent(token)}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; status?: string; message?: string } | null;
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Could not submit your response.");
        return;
      }
      setDoneStatus(data.status ?? (action === "accept" ? "accepted" : "declined"));
      toast.success(action === "accept" ? "You accepted this hosting invitation." : "You declined this invitation.");
    } finally {
      setResponding(null);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading invitation…
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
        <h1 className="text-xl font-semibold">Invitation not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This link may be invalid, expired, or already used.
        </p>
      </div>
    );
  }

  const venue = [invite.venueName, invite.venueCity, invite.venueState].filter(Boolean).join(", ");
  const when = format(new Date(invite.eventStartsAt), "EEEE, MMMM d, yyyy 'at' h:mm a");

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center px-4 py-10">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Event host invitation</p>
        {invite.organizationName ? (
          <p className="mt-1 text-sm text-muted-foreground">From {invite.organizationName}</p>
        ) : null}

        <h1 className="mt-4 text-2xl font-bold tracking-tight">{invite.eventTitle}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Hello {invite.hostName}, you&apos;re invited to host this event.</p>

        <div className="mt-6 space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <span>{when}</span>
          </div>
          {venue ? (
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{venue}</span>
            </div>
          ) : null}
        </div>

        {invite.message ? (
          <div className="mt-6 rounded-lg bg-muted/50 p-4 text-sm italic text-muted-foreground">
            &ldquo;{invite.message}&rdquo;
          </div>
        ) : null}

        {doneStatus ? (
          <div
            className={cn(
              "mt-6 rounded-lg px-4 py-3 text-sm font-medium",
              doneStatus === "accepted"
                ? "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300"
                : "bg-muted text-muted-foreground",
            )}
          >
            {doneStatus === "accepted"
              ? "You accepted this invitation. The event organizer has been notified."
              : doneStatus === "declined"
                ? "You declined this invitation."
                : `This invitation is ${doneStatus}.`}
          </div>
        ) : invite.status === "pending" ? (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button
              className="flex-1 gap-2"
              onClick={() => void respond("accept")}
              disabled={responding !== null}
            >
              {responding === "accept" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Accept
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => void respond("decline")}
              disabled={responding !== null}
            >
              {responding === "decline" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
              Decline
            </Button>
          </div>
        ) : (
          <div className="mt-6 rounded-lg bg-muted px-4 py-3 text-sm text-muted-foreground">
            This invitation is {invite.status}.
          </div>
        )}
      </div>
    </div>
  );
}
