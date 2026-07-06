"use client";

import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { lmsEventAdminDetailPath } from "@/lib/lms-events/paths";
import type { LmsEventTicket } from "@/lib/lms-events/types";

export function LmsEventAdminTicketsClient(props: { eventId: string }) {
  const [loading, setLoading] = React.useState(true);
  const [tickets, setTickets] = React.useState<LmsEventTicket[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch(`/api/lms/admin/events/${encodeURIComponent(props.eventId)}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; tickets?: LmsEventTicket[] } | null;
      if (!cancelled && res.ok && data?.ok) setTickets(data.tickets ?? []);
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [props.eventId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading tickets…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button asChild variant="outline" size="sm">
        <Link href={lmsEventAdminDetailPath(props.eventId)}>Back to event</Link>
      </Button>
      <div className="grid gap-4 md:grid-cols-2">
        {tickets.map((ticket) => (
          <Card key={ticket.id}>
            <CardHeader>
              <CardTitle className="text-base">{ticket.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              <p>
                {ticket.isFree
                  ? "Free"
                  : new Intl.NumberFormat(undefined, { style: "currency", currency: ticket.currency }).format(
                      ticket.price,
                    )}
              </p>
              <p>
                Sold {ticket.soldCount}
                {ticket.quantity != null ? ` / ${ticket.quantity}` : ""}
              </p>
              <p className="capitalize">Status: {ticket.ticketStatus.replace(/_/g, " ")}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
