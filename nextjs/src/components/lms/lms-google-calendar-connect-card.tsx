"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Status = {
  configured: boolean;
  connected: boolean;
  googleEmail: string | null;
  syncLiveSessions: boolean;
};

export function LmsGoogleCalendarConnectCard(props: { returnTo?: string; showOrgSync?: boolean }) {
  const { returnTo = "/lms/classes", showOrgSync = true } = props;
  const [loading, setLoading] = React.useState(true);
  const [status, setStatus] = React.useState<Status | null>(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/google-calendar/status", { credentials: "include" });
      const data = (await res.json().catch(() => null)) as { ok?: boolean } & Status | null;
      if (res.ok && data?.ok) setStatus(data);
      else setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("gcal") === "connected") {
      toast.success("Google Calendar connected");
      params.delete("gcal");
      const url = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState({}, "", url);
      void load();
    }
    if (params.get("gcal") === "error") {
      toast.error("Google Calendar connection failed");
      params.delete("gcal");
      const url = `${window.location.pathname}${params.toString() ? `?${params}` : ""}`;
      window.history.replaceState({}, "", url);
    }
  }, [load]);

  const connect = () => {
    window.location.href = `/api/integrations/google-calendar/connect?returnTo=${encodeURIComponent(returnTo)}`;
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/integrations/google-calendar/disconnect", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        toast.error("Could not disconnect");
        return;
      }
      toast.success("Disconnected Google Calendar");
      void load();
    } finally {
      setBusy(false);
    }
  };

  const sync = async (mode: "enrolled" | "org") => {
    setBusy(true);
    try {
      const res = await fetch("/api/integrations/google-calendar/sync", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        synced?: number;
        failed?: number;
        message?: string;
      } | null;
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Sync failed");
        return;
      }
      toast.success(`Synced ${data.synced ?? 0} session(s)${data.failed ? ` (${data.failed} skipped)` : ""}.`);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Checking Google Calendar…
        </CardContent>
      </Card>
    );
  }

  if (!status?.configured) {
    return (
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Google Calendar</CardTitle>
          <CardDescription>
            Server OAuth is not configured. Set <code className="text-xs">GOOGLE_CALENDAR_CLIENT_ID</code> and{" "}
            <code className="text-xs">GOOGLE_CALENDAR_CLIENT_SECRET</code>. Learners can still use .ics download and
            “Open in Google Calendar” links.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Google Calendar</CardTitle>
        <CardDescription>
          {status.connected
            ? `Connected as ${status.googleEmail ?? "your Google account"}. New and updated live sessions sync automatically for session creators.`
            : "Connect to sync live class schedules to your calendar and export enrolled sessions in one click."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {!status.connected ? (
          <Button type="button" size="sm" onClick={connect} disabled={busy}>
            Connect Google Calendar
          </Button>
        ) : (
          <>
            <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void sync("enrolled")}>
              Sync my enrolled sessions
            </Button>
            {showOrgSync ? (
              <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={() => void sync("org")}>
                Sync all org sessions
              </Button>
            ) : null}
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void disconnect()}>
              Disconnect
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
