"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { QRCodeTicket } from "@/components/lms/events/qr-code-ticket";
import type { CompanySiteWorkshopTicket } from "@/lib/company-themes/company-site-workshop-service";
import type { LmsEventBookingStatus } from "@/lib/lms-events/constants";

type Props = {
  companySlug: string;
  reference: string;
  siteBase?: string;
  initialEmail?: string;
};

export function CompanySiteTicketClient({ companySlug, reference, siteBase: siteBaseProp, initialEmail }: Props) {
  const siteBase = siteBaseProp ?? `/sites/${encodeURIComponent(companySlug)}`;
  const [email, setEmail] = useState(initialEmail ?? "");
  const [tickets, setTickets] = useState<CompanySiteWorkshopTicket[]>([]);
  const [loading, setLoading] = useState(Boolean(initialEmail));
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const loadTickets = async (lookupEmail?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (lookupEmail?.trim()) params.set("email", lookupEmail.trim());
      const res = await fetch(
        `/api/company-sites/${encodeURIComponent(companySlug)}/tickets/${encodeURIComponent(reference)}?${params.toString()}`,
      );
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        tickets?: CompanySiteWorkshopTicket[];
      } | null;
      if (!res.ok || !data?.ok || !data.tickets?.length) {
        throw new Error(data?.message || "Ticket not found.");
      }
      setTickets(data.tickets);
      setLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load ticket.");
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialEmail?.trim()) {
      void loadTickets(initialEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companySlug, reference, initialEmail]);

  if (!loaded) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <h1 className="text-2xl font-bold">Workshop ticket</h1>
        <p className="mt-2 text-sm text-slate-600">Enter the email you used when reserving to view your QR code.</p>
        <form
          className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6"
          onSubmit={(e) => {
            e.preventDefault();
            void loadTickets(email);
          }}
        >
          <div>
            <label className="text-sm font-medium" htmlFor="ticket-email">
              Email
            </label>
            <input
              id="ticket-email"
              type="email"
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {loading ? "Loading…" : "View ticket"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">Reference: {reference}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-sm font-medium text-slate-600">
        <Link href={siteBase} className="hover:text-red-600">
          ← Back to site
        </Link>
      </p>
      <h1 className="mt-4 text-3xl font-bold tracking-tight">Your workshop ticket</h1>
      <p className="mt-2 text-slate-600">
        Show this QR code at check-in. Reference: <span className="font-mono text-sm">{reference}</span>
      </p>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {tickets.map((ticket) => (
          <QRCodeTicket
            key={ticket.registrationId}
            eventTitle={ticket.eventTitle}
            attendeeName={ticket.attendeeName}
            startsAt={ticket.startsAt}
            locationLabel={ticket.locationLabel}
            qrToken={ticket.qrToken}
            bookingStatus={ticket.bookingStatus as LmsEventBookingStatus}
            className="w-full max-w-none"
          />
        ))}
      </div>
      {tickets.some((t) => t.quantityTotal > 1) ? (
        <p className="mt-6 text-center text-sm text-slate-500">
          Each seat has its own QR code. All tickets are listed above.
        </p>
      ) : null}
    </div>
  );
}
