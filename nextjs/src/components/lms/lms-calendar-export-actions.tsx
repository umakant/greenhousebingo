"use client";

import * as React from "react";
import { Calendar, Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  buildGoogleCalendarAddUrl,
  buildLiveSessionIcsContent,
  type LiveSessionCalendarInput,
} from "@/lib/lms-live-session-calendar";
import { downloadIcsFile } from "@/lib/event-calendar-ics";

type Props = {
  session: LiveSessionCalendarInput;
  /** Admin/staff ICS API path */
  icsHref?: string;
  /** Student calendar API base (adds sync query) */
  studentCalendarApi?: string;
  size?: "sm" | "default";
  variant?: "outline" | "secondary" | "ghost";
};

export function LmsCalendarExportActions(props: Props) {
  const { session, icsHref, studentCalendarApi, size = "sm", variant = "outline" } = props;
  const [syncing, setSyncing] = React.useState(false);

  const googleUrl = buildGoogleCalendarAddUrl(session);

  const downloadIcs = () => {
    if (icsHref) {
      window.open(icsHref, "_blank", "noopener,noreferrer");
      return;
    }
    const ics = buildLiveSessionIcsContent(session);
    if (!ics) {
      toast.error("Invalid session schedule for calendar export.");
      return;
    }
    const base = session.title.replace(/[^\w\-+.]+/g, "_").slice(0, 80) || "live-session";
    downloadIcsFile(`${base}.ics`, ics);
    toast.success("Calendar file downloaded");
  };

  const syncToGoogle = async () => {
    if (!studentCalendarApi) return;
    setSyncing(true);
    try {
      const res = await fetch(`${studentCalendarApi}?sync=1`, { credentials: "include" });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        googleSync?: { ok: boolean; message?: string };
        message?: string;
      } | null;
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Could not sync to Google Calendar.");
        return;
      }
      if (data.googleSync?.ok) {
        toast.success("Added to your Google Calendar.");
      } else {
        toast.error(data.googleSync?.message ?? "Connect Google Calendar first.");
      }
    } finally {
      setSyncing(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" size={size} variant={variant} disabled={syncing}>
          {syncing ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Calendar className="mr-1 h-3.5 w-3.5" />}
          Calendar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {googleUrl ? (
          <DropdownMenuItem asChild>
            <a href={googleUrl} target="_blank" rel="noopener noreferrer">
              Open in Google Calendar
            </a>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onClick={() => downloadIcs()}>
          <Download className="mr-2 h-4 w-4" />
          Download .ics file
        </DropdownMenuItem>
        {studentCalendarApi ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void syncToGoogle()}>Sync to my Google Calendar</DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
