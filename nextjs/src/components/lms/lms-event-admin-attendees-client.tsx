"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QRScannerPlaceholder } from "@/components/lms/events/qr-scanner-placeholder";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { lmsEventAdminDetailPath } from "@/lib/lms-events/paths";
import type { LmsEventAttendee } from "@/lib/lms-events/types";

export function LmsEventAdminAttendeesClient(props: { eventId: string; embedded?: boolean }) {
  const [loading, setLoading] = React.useState(true);
  const [attendees, setAttendees] = React.useState<LmsEventAttendee[]>([]);

  const load = React.useCallback(async () => {
    const res = await fetch(`/api/lms/admin/events/${encodeURIComponent(props.eventId)}/attendees`, {
      credentials: "include",
      cache: "no-store",
    });
    const data = (await res.json().catch(() => null)) as { ok?: boolean; attendees?: LmsEventAttendee[] } | null;
    if (res.ok && data?.ok) setAttendees(data.attendees ?? []);
  }, [props.eventId]);

  React.useEffect(() => {
    void (async () => {
      setLoading(true);
      await load();
      setLoading(false);
    })();
  }, [load]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading attendees…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{attendees.length} registration(s)</p>
        {!props.embedded ? (
          <Button asChild variant="outline" size="sm">
            <Link href={lmsEventAdminDetailPath(props.eventId)}>Back to event</Link>
          </Button>
        ) : null}
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Ticket</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Check-in</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attendees.map((a) => (
            <TableRow key={a.registrationId}>
              <TableCell className="font-medium">{a.name}</TableCell>
              <TableCell>{a.email}</TableCell>
              <TableCell>{a.ticketName}</TableCell>
              <TableCell>
                <Badge variant="secondary" className="capitalize">
                  {a.bookingStatus.replace(/_/g, " ")}
                </Badge>
              </TableCell>
              <TableCell>{a.checkedInAt ? new Date(a.checkedInAt).toLocaleString() : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export function LmsEventAdminCheckInClient(props: { eventId: string }) {
  const [qrToken, setQrToken] = React.useState("");
  const [query, setQuery] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function checkIn(body: { qrToken?: string; query?: string }) {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/lms/admin/events/${encodeURIComponent(props.eventId)}/check-in`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) {
        toast.error(data?.message ?? "Check-in failed.");
        return;
      }
      toast.success("Attendee checked in.");
      setQrToken("");
      setQuery("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <QRScannerPlaceholder />
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="qr-token">
          QR token
        </label>
        <div className="flex gap-2">
          <Input
            id="qr-token"
            value={qrToken}
            onChange={(e) => setQrToken(e.target.value)}
            placeholder="QR-EVT-…"
          />
          <Button type="button" disabled={submitting || !qrToken.trim()} onClick={() => void checkIn({ qrToken })}>
            Check in
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium" htmlFor="manual-search">
          Manual search
        </label>
        <div className="flex gap-2">
          <Input
            id="manual-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or email"
          />
          <Button type="button" disabled={submitting || !query.trim()} onClick={() => void checkIn({ query })}>
            Find & check in
          </Button>
        </div>
      </div>
    </div>
  );
}
