"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { EventEmptyState } from "@/components/lms/events/event-empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  lmsEventSupportTicketSchema,
  type LmsEventSupportTicketInput,
} from "@/lib/lms-events/schemas";
import type { LmsEventSupportTicket } from "@/lib/lms-events/types";

export function LmsEventSupportClient() {
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [tickets, setTickets] = React.useState<LmsEventSupportTicket[]>([]);
  const [submitting, setSubmitting] = React.useState(false);
  const [formErr, setFormErr] = React.useState<string | null>(null);

  const form = useForm<LmsEventSupportTicketInput>({
    resolver: zodResolver(lmsEventSupportTicketSchema),
    defaultValues: { subject: "", body: "" },
  });

  const loadTickets = React.useCallback(async () => {
    const res = await fetch("/api/lms/event-support", { credentials: "include", cache: "no-store" });
    const data = (await res.json().catch(() => null)) as {
      ok?: boolean;
      message?: string;
      tickets?: LmsEventSupportTicket[];
    } | null;
    if (!res.ok || !data?.ok) {
      setErr(data?.message ?? "Could not load support tickets.");
      return;
    }
    setTickets(data.tickets ?? []);
  }, []);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      await loadTickets();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadTickets]);

  async function onSubmit(values: LmsEventSupportTicketInput) {
    setSubmitting(true);
    setFormErr(null);
    try {
      const res = await fetch("/api/lms/event-support", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) {
        setFormErr(data?.message ?? "Could not submit ticket.");
        return;
      }
      form.reset();
      await loadTickets();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Your tickets</h3>
        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : err ? (
          <p className="text-sm text-destructive">{err}</p>
        ) : tickets.length === 0 ? (
          <EventEmptyState
            title="No support tickets"
            description="Need help with an event registration? Submit a ticket using the form."
          />
        ) : (
          tickets.map((t) => (
            <Card key={t.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <CardTitle className="text-base">{t.subject}</CardTitle>
                <Badge variant="secondary" className="capitalize">
                  {t.status}
                </Badge>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Updated {new Date(t.lastReplyAt ?? t.updatedAt).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">New ticket</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-2">
              <Label htmlFor="support-subject">Subject</Label>
              <Input id="support-subject" {...form.register("subject")} />
              {form.formState.errors.subject ? (
                <p className="text-xs text-destructive">{form.formState.errors.subject.message}</p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="support-body">Message</Label>
              <Textarea id="support-body" rows={5} {...form.register("body")} />
              {form.formState.errors.body ? (
                <p className="text-xs text-destructive">{form.formState.errors.body.message}</p>
              ) : null}
            </div>
            {formErr ? <p className="text-sm text-destructive">{formErr}</p> : null}
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting ? "Submitting…" : "Submit ticket"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
