"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type TicketRow = {
  id: string;
  ticketCode: string;
  subject: string;
  status: string;
  createdAt: string;
  storefrontOrderId?: string | null;
};

type OrderPick = { id: string; orderNumber: string };

export function StorefrontAccountSupportClient({
  websiteId,
  email,
}: {
  websiteId: string;
  email: string;
}) {
  const qs = `websiteId=${encodeURIComponent(websiteId)}`;

  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderPick[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [relatedOrderId, setRelatedOrderId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, oRes] = await Promise.all([
        fetch(`/api/storefront/customer-support/tickets?${qs}`, { credentials: "same-origin" }),
        fetch(`/api/storefront-customer-auth/orders?${qs}`, { credentials: "same-origin" }),
      ]);
      const tJson = (await tRes.json().catch(() => null)) as { ok?: boolean; tickets?: TicketRow[] };
      const oJson = (await oRes.json().catch(() => null)) as { ok?: boolean; orders?: OrderPick[] };
      if (tJson?.ok && tJson.tickets) setTickets(tJson.tickets);
      if (oJson?.ok && oJson.orders) setOrders(oJson.orders);
    } finally {
      setLoading(false);
    }
  }, [qs]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    setMsg(null);
    if (!subject.trim()) {
      setMsg("Subject is required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/storefront/customer-support/tickets?${qs}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          description: description.trim(),
          related_order_id: relatedOrderId && /^\d+$/.test(relatedOrderId) ? relatedOrderId : undefined,
        }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string };
      if (!res.ok || !data?.ok) {
        setMsg(data?.message ?? "Could not create ticket.");
        return;
      }
      setSubject("");
      setDescription("");
      setRelatedOrderId("");
      setMsg("Ticket submitted.");
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-lg space-y-10">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Support</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Signed in as <span className="text-foreground">{email}</span>
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/storefront/account/w/${encodeURIComponent(websiteId)}/dashboard`}>Account</Link>
        </Button>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <h2 className="text-lg font-medium text-foreground">New request</h2>
        <div className="space-y-1">
          <Label htmlFor="subj">Subject</Label>
          <Input
            id="subj"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="desc">Details</Label>
          <Textarea
            id="desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
          />
        </div>
        {orders.length > 0 ? (
          <div className="space-y-1">
            <Label htmlFor="ord">Related order (optional)</Label>
            <select
              id="ord"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={relatedOrderId}
              onChange={(e) => setRelatedOrderId(e.target.value)}
            >
              <option value="">—</option>
              {orders.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.orderNumber}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
        <Button type="button" disabled={busy} onClick={() => void submit()}>
          {busy ? "Sending…" : "Submit ticket"}
        </Button>
      </div>

      <div>
        <h2 className="text-lg font-medium text-foreground">Your tickets</h2>
        {loading ? (
          <p className="mt-2 text-sm text-muted-foreground">Loading…</p>
        ) : tickets.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No tickets yet.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm">
            {tickets.map((tk) => (
              <li key={tk.id} className="rounded border border-border px-3 py-2">
                <span className="font-mono text-xs text-muted-foreground">{tk.ticketCode}</span>
                <span className="mt-1 block text-foreground">{tk.subject}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {tk.status}
                  {tk.storefrontOrderId ? ` · Order #${tk.storefrontOrderId}` : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
