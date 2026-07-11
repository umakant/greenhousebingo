"use client";

import * as React from "react";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";

import { QRScannerPlaceholder } from "@/components/lms/events/qr-scanner-placeholder";
import type { EventAttendeeRow } from "@/lib/event-platform/attendees/event-attendees-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatPhone } from "@/lib/phone";

type LiveCheckInPanelProps = {
  eventId: string;
  canCheckIn: boolean;
  canUndoCheckIn: boolean;
  onSuccess: () => void;
  onUndo?: () => void;
};

export function LiveCheckInPanel(props: LiveCheckInPanelProps) {
  const [qrToken, setQrToken] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [searchResults, setSearchResults] = React.useState<EventAttendeeRow[]>([]);
  const [searchLoading, setSearchLoading] = React.useState(false);

  React.useEffect(() => {
    const q = query.trim();
    const ph = phone.trim();
    if (q.length < 2 && ph.length < 4) {
      setSearchResults([]);
      return;
    }
    const t = window.setTimeout(async () => {
      setSearchLoading(true);
      const params = new URLSearchParams({ pageSize: "8" });
      if (q.length >= 2) params.set("q", q);
      if (ph.length >= 4) params.set("phone", ph);
      const res = await fetch(
        `/api/event-platform/events/${encodeURIComponent(props.eventId)}/attendees?${params}`,
        { credentials: "include", cache: "no-store" },
      );
      const data = (await res.json().catch(() => null)) as { ok?: boolean; rows?: EventAttendeeRow[] };
      setSearchResults(data?.ok ? (data.rows ?? []) : []);
      setSearchLoading(false);
    }, 300);
    return () => window.clearTimeout(t);
  }, [props.eventId, query, phone]);

  async function checkIn(body: { qrToken?: string; query?: string; registrationId?: string }) {
    if (!props.canCheckIn) {
      toast.error("You do not have check-in permission.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/lms/admin/events/${encodeURIComponent(props.eventId)}/check-in`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        registration?: { checkedInAt?: string | null; attendeeName?: string };
      };
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Check-in failed.");
        return;
      }
      if (data.registration?.checkedInAt) {
        const wasDuplicate = body.registrationId && searchResults.find((r) => r.registrationId === body.registrationId)?.checkedInAt;
        if (wasDuplicate) {
          toast.warning(`${data.registration.attendeeName ?? "Guest"} was already checked in.`);
        } else {
          toast.success(`${data.registration.attendeeName ?? "Guest"} checked in.`);
        }
      }
      setQrToken("");
      setQuery("");
      setPhone("");
      setSearchResults([]);
      props.onSuccess();
    } finally {
      setSubmitting(false);
    }
  }

  async function undoCheckIn(registrationId: string) {
    if (!props.canUndoCheckIn) {
      toast.error("Not permitted to undo check-in.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/event-platform/events/${encodeURIComponent(props.eventId)}/live/actions`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "undo_check_in", registrationId }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Undo failed.");
        return;
      }
      toast.success("Check-in removed.");
      props.onSuccess();
      props.onUndo?.();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <QRScannerPlaceholder />
      <div className="space-y-2">
        <Label htmlFor="live-qr">Scan / QR token</Label>
        <div className="flex gap-2">
          <Input
            id="live-qr"
            className="h-11 text-base"
            value={qrToken}
            onChange={(e) => setQrToken(e.target.value)}
            placeholder="QR-EVT-…"
            disabled={!props.canCheckIn || submitting}
          />
          <Button
            type="button"
            className="h-11 min-w-[100px]"
            disabled={!props.canCheckIn || submitting || !qrToken.trim()}
            onClick={() => void checkIn({ qrToken: qrToken.trim() })}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check in"}
          </Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="live-name">Name or email</Label>
          <Input
            id="live-name"
            className="h-11"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search attendee…"
            disabled={!props.canCheckIn}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="live-phone">Phone</Label>
          <Input
            id="live-phone"
            className="h-11"
            value={phone}
            onChange={(e) => setPhone(formatPhone(e.target.value))}
            placeholder="(000) 000-0000"
            disabled={!props.canCheckIn}
          />
        </div>
      </div>
      {(searchLoading || searchResults.length > 0) && (
        <div className="rounded-lg border">
          {searchLoading ? (
            <p className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </p>
          ) : (
            <ul className="divide-y">
              {searchResults.map((row) => (
                <li key={row.registrationId} className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <div>
                    <p className="font-medium">{row.fullName}</p>
                    <p className="text-xs text-muted-foreground">{row.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {row.checkedInAt ? (
                      <Badge variant="secondary">Checked in</Badge>
                    ) : null}
                    {row.checkedInAt && props.canUndoCheckIn ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={submitting}
                        onClick={() => void undoCheckIn(row.registrationId)}
                      >
                        Undo
                      </Button>
                    ) : null}
                    {!row.checkedInAt ? (
                      <Button
                        type="button"
                        size="sm"
                        disabled={submitting || !props.canCheckIn}
                        onClick={() => void checkIn({ registrationId: row.registrationId })}
                      >
                        Check in
                      </Button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {query.trim().length >= 2 && !searchLoading && searchResults.length === 0 ? (
        <Button
          type="button"
          variant="secondary"
          className="w-full h-11"
          disabled={submitting || !props.canCheckIn}
          onClick={() => void checkIn({ query: query.trim() })}
        >
          <Search className="mr-2 h-4 w-4" />
          Find & check in first match
        </Button>
      ) : null}
    </div>
  );
}
