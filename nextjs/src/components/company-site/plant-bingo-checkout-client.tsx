"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Leaf, Loader2, Minus, Plus, Sparkles, Ticket } from "lucide-react";

import {
  WaterIceStripeCardForm,
  type WaterIceStripeConfirmRef,
} from "@/components/waterice/waterice-stripe-card-form";
import { formatPhone, normalizeMobileForStorage } from "@/lib/phone";
import { cn } from "@/lib/utils";

type Props = {
  companySlug: string;
  eventSlug: string;
  siteBase?: string;
};

type EventDetail = {
  title: string;
  slug: string;
  price: number;
  extraCardPrice: number;
  cardFeePercent: number;
  cardsIncluded: number;
  left: number;
  soldOut: boolean;
  dayName: string;
  month: string;
  day: string;
  time: string;
  endTime: string;
  venue: string;
  city: string;
  state: string;
};

type PublicPlant = {
  id: string;
  name: string;
  category: string | null;
  variety: string | null;
  description: string | null;
  imageUrl: string | null;
  quantityRemaining: number;
};

type IssuedTicket = {
  registrationId: string;
  qrToken: string;
  seatNumber: number;
};

type Step = "tickets" | "free" | "winning" | "details" | "pay" | "success";

const STEPS: Array<{ id: Step; label: string }> = [
  { id: "tickets", label: "Tickets" },
  { id: "free", label: "Free plants" },
  { id: "winning", label: "Winning plants" },
  { id: "details", label: "Your details" },
  { id: "pay", label: "Pay" },
];

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

function computeTotals(tickets: number, extras: number, price: number, extraPrice: number, feePct: number) {
  const ticketsSubtotal = Math.round(tickets * price * 100) / 100;
  const cardsSubtotal = Math.round(extras * extraPrice * 100) / 100;
  const subtotal = Math.round((ticketsSubtotal + cardsSubtotal) * 100) / 100;
  const fee = Math.round(subtotal * (feePct / 100) * 100) / 100;
  const total = Math.round((subtotal + fee) * 100) / 100;
  return { ticketsSubtotal, cardsSubtotal, subtotal, fee, total };
}

export function PlantBingoCheckoutClient({
  companySlug,
  eventSlug,
  siteBase: siteBaseProp,
}: Props) {
  const searchParams = useSearchParams();
  const siteBase = siteBaseProp ?? `/sites/${encodeURIComponent(companySlug)}`;
  const eventUrl = `${siteBase}/events/${encodeURIComponent(eventSlug)}`;

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [plants, setPlants] = useState<PublicPlant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initialTickets = Math.max(1, Math.min(20, Number.parseInt(searchParams?.get("tickets") ?? "1", 10) || 1));
  const initialExtras = Math.max(0, Math.min(100, Number.parseInt(searchParams?.get("extras") ?? "0", 10) || 0));

  const [tickets, setTickets] = useState(initialTickets);
  const [extras, setExtras] = useState(initialExtras);
  const [takeHomeIds, setTakeHomeIds] = useState<string[]>([]);
  const [winningIds, setWinningIds] = useState<string[]>([]);
  const [step, setStep] = useState<Step>("tickets");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  const [pay, setPay] = useState<{
    clientSecret: string;
    publishableKey: string;
    paymentIntentId: string;
  } | null>(null);
  const [mockPayment, setMockPayment] = useState(false);
  const [cardReady, setCardReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [issuedTickets, setIssuedTickets] = useState<IssuedTicket[]>([]);
  const [ticketUrl, setTicketUrl] = useState<string | null>(null);
  const confirmRef = useRef<null | (() => Promise<{ ok: boolean; error?: string; paymentIntentId?: string }>)>(
    null,
  ) as WaterIceStripeConfirmRef;

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      fetch(`/api/company-sites/${encodeURIComponent(companySlug)}/events/${encodeURIComponent(eventSlug)}`, {
        cache: "no-store",
      }).then((r) => r.json()),
      fetch(
        `/api/company-sites/${encodeURIComponent(companySlug)}/events/${encodeURIComponent(eventSlug)}/plants`,
        { cache: "no-store" },
      ).then((r) => r.json()),
    ])
      .then(([eventData, plantsData]) => {
        if (!active) return;
        if (!eventData?.ok || !eventData.event) {
          setError(eventData?.message ?? "Could not load event.");
          return;
        }
        setEvent(eventData.event as EventDetail);
        setPlants((plantsData?.plants ?? []) as PublicPlant[]);
        const left = Number(eventData.event.left ?? 0);
        if (left > 0 && initialTickets > left) setTickets(left);
      })
      .catch(() => {
        if (active) setError("Could not load checkout.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only load once per event
  }, [companySlug, eventSlug]);

  // Keep take-home selections length aligned with ticket count.
  useEffect(() => {
    setTakeHomeIds((prev) => {
      if (prev.length === tickets) return prev;
      if (prev.length > tickets) return prev.slice(0, tickets);
      return [...prev, ...Array.from({ length: tickets - prev.length }, () => "")];
    });
  }, [tickets]);

  const totals = useMemo(() => {
    if (!event) return { ticketsSubtotal: 0, cardsSubtotal: 0, subtotal: 0, fee: 0, total: 0 };
    return computeTotals(tickets, extras, event.price, event.extraCardPrice, event.cardFeePercent);
  }, [event, tickets, extras]);

  const takeHomeFilled = takeHomeIds.filter(Boolean).length === tickets && takeHomeIds.every(Boolean);

  const plantById = useMemo(() => new Map(plants.map((p) => [p.id, p])), [plants]);

  const canSelectTakeHome = useCallback(
    (plantId: string, slotIndex: number) => {
      const plant = plantById.get(plantId);
      if (!plant) return false;
      const already = takeHomeIds.filter((id, i) => id === plantId && i !== slotIndex).length;
      return already < plant.quantityRemaining;
    },
    [plantById, takeHomeIds],
  );

  function setTakeHomeSlot(index: number, plantId: string) {
    setTakeHomeIds((prev) => {
      const next = [...prev];
      next[index] = plantId;
      return next;
    });
  }

  function toggleWinning(plantId: string) {
    setWinningIds((prev) => {
      if (prev.includes(plantId)) return prev.filter((id) => id !== plantId);
      if (prev.length >= 5) return prev;
      return [...prev, plantId];
    });
  }

  function moveWinning(index: number, dir: -1 | 1) {
    setWinningIds((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function startPayment() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/company-sites/${encodeURIComponent(companySlug)}/events/${encodeURIComponent(eventSlug)}/checkout/intent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customerEmail: email.trim(),
            tickets,
            extraCards: extras,
          }),
        },
      );
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        mockPayment?: boolean;
        clientSecret?: string;
        publishableKey?: string;
        paymentIntentId?: string;
      } | null;
      if (!res.ok || !data?.ok) {
        setError(data?.message ?? "Could not start payment.");
        return;
      }
      if (data.mockPayment || !data.clientSecret || !data.publishableKey || !data.paymentIntentId) {
        setMockPayment(true);
        setPay(null);
        setStep("pay");
        return;
      }
      setMockPayment(false);
      setPay({
        clientSecret: data.clientSecret,
        publishableKey: data.publishableKey,
        paymentIntentId: data.paymentIntentId,
      });
      setStep("pay");
    } finally {
      setSubmitting(false);
    }
  }

  async function finalize(paymentIntentId?: string) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/company-sites/${encodeURIComponent(companySlug)}/events/${encodeURIComponent(eventSlug)}/checkout`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentIntentId,
            customer: {
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              email: email.trim(),
              phone: normalizeMobileForStorage(phone) ?? undefined,
            },
            tickets,
            extraCards: extras,
            takeHomePlantIds: takeHomeIds,
            winningPlantIds: winningIds,
          }),
        },
      );
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        message?: string;
        reference?: string;
        tickets?: IssuedTicket[];
        ticketUrl?: string;
      } | null;
      if (!res.ok || !data?.ok) {
        setError(data?.message ?? "Checkout failed.");
        return;
      }
      setReference(data.reference ?? null);
      setIssuedTickets(data.tickets ?? []);
      setTicketUrl(data.ticketUrl ?? null);
      setStep("success");
    } finally {
      setSubmitting(false);
    }
  }

  async function payNow() {
    if (mockPayment) {
      await finalize();
      return;
    }
    if (!pay || !confirmRef.current) {
      setError("Payment form is not ready.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await confirmRef.current();
      if (!result.ok) {
        setError(result.error ?? "Payment failed.");
        return;
      }
      await finalize(result.paymentIntentId ?? pay.paymentIntentId);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="flex items-center justify-center px-4 py-20 text-sm text-[#3d5a40]">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading checkout…
      </main>
    );
  }

  if (!event) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <p className="text-[#3d5a40]">{error ?? "Event not found."}</p>
        <Link href={siteBase || "/"} className="mt-4 inline-block font-semibold text-[#1f4d2a] underline">
          Back to events
        </Link>
      </main>
    );
  }

  if (event.soldOut || event.left <= 0) {
    return (
      <main className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-serif text-3xl font-bold text-[#1f4d2a]">Sold out</h1>
        <p className="mt-2 text-[#3d5a40]">This event has no tickets remaining.</p>
        <Link href={eventUrl} className="mt-6 inline-block font-semibold text-[#1f4d2a] underline">
          Back to event
        </Link>
      </main>
    );
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step);

  return (
    <main className="min-h-[70vh] bg-[#f4f7f0] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link href={eventUrl} className="text-sm font-semibold text-[#3d5a40] hover:text-[#1f4d2a]">
            ← {event.title}
          </Link>
          <h1 className="mt-2 font-serif text-3xl font-bold text-[#1f4d2a] sm:text-4xl">Checkout</h1>
          <p className="mt-1 text-sm text-[#3d5a40]">
            {event.dayName}, {event.month} {event.day} · {event.time} – {event.endTime} · {event.venue}
          </p>
        </div>

        {step !== "success" ? (
          <ol className="mb-8 flex flex-wrap gap-2">
            {STEPS.map((s, i) => (
              <li
                key={s.id}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide",
                  i === stepIndex
                    ? "bg-[#1f4d2a] text-[#f4f7f0]"
                    : i < stepIndex
                      ? "bg-[#c8e0c0] text-[#1f4d2a]"
                      : "bg-white text-[#6b7c6e] border border-[#d5e2d4]",
                )}
              >
                {i + 1}. {s.label}
              </li>
            ))}
          </ol>
        ) : null}

        {error ? (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-3xl border border-[#d5e2d4] bg-white p-6 shadow-sm">
            {step === "tickets" ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-[#1f4d2a]">How many tickets?</h2>
                  <p className="mt-1 text-sm text-[#3d5a40]">
                    Each ticket includes {event.cardsIncluded} bingo cards and one free take-home plant.
                  </p>
                </div>
                <QtyRow
                  label="Tickets"
                  hint={`${event.left} remaining`}
                  value={tickets}
                  min={1}
                  max={Math.min(20, event.left)}
                  onChange={setTickets}
                />
                <QtyRow
                  label="Extra Bingo cards"
                  hint={`${money(event.extraCardPrice)} each`}
                  value={extras}
                  min={0}
                  max={100}
                  onChange={setExtras}
                />
                <NavButtons
                  onBack={null}
                  nextLabel="Choose free plants"
                  onNext={() => setStep("free")}
                />
              </div>
            ) : null}

            {step === "free" ? (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-[#1f4d2a]">Pick your free plants</h2>
                  <p className="mt-1 text-sm text-[#3d5a40]">
                    Choose {tickets} guaranteed take-home plant{tickets === 1 ? "" : "s"} — one per ticket.
                  </p>
                </div>
                {plants.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-[#d5e2d4] bg-[#f4f7f0] px-4 py-8 text-center text-sm text-[#3d5a40]">
                    No plants are available for this event yet. Please check back soon or contact the host.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {takeHomeIds.map((selectedId, index) => (
                      <div key={index} className="space-y-2">
                        <p className="text-sm font-semibold text-[#1f4d2a]">
                          Ticket {index + 1} — free plant
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {plants.map((plant) => {
                            const selected = selectedId === plant.id;
                            const disabled = !selected && !canSelectTakeHome(plant.id, index);
                            return (
                              <button
                                key={plant.id}
                                type="button"
                                disabled={disabled}
                                onClick={() => setTakeHomeSlot(index, plant.id)}
                                className={cn(
                                  "flex items-start gap-3 rounded-xl border p-3 text-left transition",
                                  selected
                                    ? "border-[#1f4d2a] bg-[#e8f3e4] ring-2 ring-[#1f4d2a]/20"
                                    : "border-[#d5e2d4] bg-white hover:border-[#1f4d2a]/40",
                                  disabled && "opacity-40",
                                )}
                              >
                                <PlantThumb plant={plant} />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-[#1f4d2a]">{plant.name}</span>
                                    {selected ? <Check className="h-4 w-4 text-[#1f4d2a]" /> : null}
                                  </div>
                                  <p className="text-xs text-[#6b7c6e]">
                                    {plant.category || "Plant"} · {plant.quantityRemaining} left
                                  </p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <NavButtons
                  onBack={() => setStep("tickets")}
                  nextLabel="Winning preferences"
                  onNext={() => setStep("winning")}
                  nextDisabled={!takeHomeFilled || plants.length === 0}
                />
              </div>
            ) : null}

            {step === "winning" ? (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-[#1f4d2a]">Winning plant preferences</h2>
                  <p className="mt-1 text-sm text-[#3d5a40]">
                    Optional — pick up to 5 plants you&apos;d love to win during bingo rounds (ranked).
                  </p>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {plants.map((plant) => {
                    const rank = winningIds.indexOf(plant.id);
                    const selected = rank >= 0;
                    return (
                      <button
                        key={plant.id}
                        type="button"
                        onClick={() => toggleWinning(plant.id)}
                        className={cn(
                          "flex items-start gap-3 rounded-xl border p-3 text-left transition",
                          selected
                            ? "border-amber-500 bg-amber-50 ring-2 ring-amber-500/20"
                            : "border-[#d5e2d4] bg-white hover:border-amber-400/50",
                        )}
                      >
                        <PlantThumb plant={plant} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#1f4d2a]">{plant.name}</span>
                            {selected ? (
                              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                                #{rank + 1}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-xs text-[#6b7c6e]">{plant.category || "Plant"}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {winningIds.length > 0 ? (
                  <div className="rounded-xl border border-[#d5e2d4] bg-[#f4f7f0] p-3">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#3d5a40]">
                      Your ranking
                    </p>
                    <ol className="space-y-1.5">
                      {winningIds.map((id, i) => (
                        <li key={id} className="flex items-center gap-2 text-sm">
                          <span className="w-6 font-bold text-[#1f4d2a]">#{i + 1}</span>
                          <span className="flex-1">{plantById.get(id)?.name ?? id}</span>
                          <button
                            type="button"
                            className="rounded border px-2 py-0.5 text-xs"
                            onClick={() => moveWinning(i, -1)}
                            disabled={i === 0}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="rounded border px-2 py-0.5 text-xs"
                            onClick={() => moveWinning(i, 1)}
                            disabled={i === winningIds.length - 1}
                          >
                            ↓
                          </button>
                        </li>
                      ))}
                    </ol>
                  </div>
                ) : null}
                <NavButtons
                  onBack={() => setStep("free")}
                  nextLabel="Your details"
                  onNext={() => setStep("details")}
                  secondaryLabel="Skip"
                  onSecondary={() => {
                    setWinningIds([]);
                    setStep("details");
                  }}
                />
              </div>
            ) : null}

            {step === "details" ? (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-[#1f4d2a]">Your details</h2>
                  <p className="mt-1 text-sm text-[#3d5a40]">We&apos;ll email your tickets and QR codes here.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="First name">
                    <input
                      className="w-full rounded-lg border border-[#d5e2d4] px-3 py-2"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      autoComplete="given-name"
                    />
                  </Field>
                  <Field label="Last name">
                    <input
                      className="w-full rounded-lg border border-[#d5e2d4] px-3 py-2"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      autoComplete="family-name"
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      type="email"
                      className="w-full rounded-lg border border-[#d5e2d4] px-3 py-2"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </Field>
                  <Field label="Phone (optional)">
                    <input
                      className="w-full rounded-lg border border-[#d5e2d4] px-3 py-2"
                      value={phone}
                      onChange={(e) => setPhone(formatPhone(e.target.value))}
                      autoComplete="tel"
                      placeholder="(000) 000-0000"
                    />
                  </Field>
                </div>
                <NavButtons
                  onBack={() => setStep("winning")}
                  nextLabel="Continue to payment"
                  onNext={() => void startPayment()}
                  nextDisabled={
                    submitting || !firstName.trim() || !lastName.trim() || !email.trim().includes("@")
                  }
                  nextLoading={submitting}
                />
              </div>
            ) : null}

            {step === "pay" ? (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-[#1f4d2a]">Payment</h2>
                  <p className="mt-1 text-sm text-[#3d5a40]">
                    Total due: <strong>{money(totals.total)}</strong>
                  </p>
                </div>
                {mockPayment ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    Test mode — card payments aren&apos;t configured, so this checkout will complete without
                    charging a card.
                  </div>
                ) : pay ? (
                  <WaterIceStripeCardForm
                    clientSecret={pay.clientSecret}
                    publishableKey={pay.publishableKey}
                    email={email.trim()}
                    confirmRef={confirmRef}
                    onReadyChange={setCardReady}
                  />
                ) : null}
                <NavButtons
                  onBack={() => setStep("details")}
                  nextLabel={`Pay ${money(totals.total)}`}
                  onNext={() => void payNow()}
                  nextDisabled={submitting || (!mockPayment && !cardReady)}
                  nextLoading={submitting}
                />
              </div>
            ) : null}

            {step === "success" ? (
              <div className="space-y-5 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#1f4d2a] text-white">
                  <Check className="h-8 w-8" />
                </div>
                <h2 className="text-2xl font-bold text-[#1f4d2a]">You&apos;re all set!</h2>
                <p className="text-sm text-[#3d5a40]">
                  Reference <strong>{reference}</strong> · {issuedTickets.length} ticket
                  {issuedTickets.length === 1 ? "" : "s"} confirmed.
                </p>
                <div className="rounded-xl border border-[#d5e2d4] bg-[#f4f7f0] p-4 text-left text-sm">
                  <p className="font-semibold text-[#1f4d2a]">Free plants</p>
                  <ul className="mt-1 list-inside list-disc text-[#3d5a40]">
                    {takeHomeIds.map((id, i) => (
                      <li key={`${id}-${i}`}>{plantById.get(id)?.name ?? id}</li>
                    ))}
                  </ul>
                  {winningIds.length > 0 ? (
                    <>
                      <p className="mt-3 font-semibold text-[#1f4d2a]">Winning preferences</p>
                      <ol className="mt-1 list-inside list-decimal text-[#3d5a40]">
                        {winningIds.map((id) => (
                          <li key={id}>{plantById.get(id)?.name ?? id}</li>
                        ))}
                      </ol>
                    </>
                  ) : null}
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  {ticketUrl ? (
                    <Link
                      href={ticketUrl}
                      className="inline-flex items-center gap-2 rounded-full bg-[#1f4d2a] px-5 py-2.5 text-sm font-bold text-white"
                    >
                      <Ticket className="h-4 w-4" /> View tickets
                    </Link>
                  ) : null}
                  <Link
                    href={eventUrl}
                    className="inline-flex items-center gap-2 rounded-full border border-[#1f4d2a] px-5 py-2.5 text-sm font-bold text-[#1f4d2a]"
                  >
                    Back to event
                  </Link>
                </div>
              </div>
            ) : null}
          </div>

          <aside className="h-fit rounded-3xl border border-[#d5e2d4] bg-white p-5 shadow-sm lg:sticky lg:top-24">
            <p className="text-xs font-bold uppercase tracking-widest text-[#6b7c6e]">Order summary</p>
            <p className="mt-2 font-serif text-xl font-bold text-[#1f4d2a]">{event.title}</p>
            <dl className="mt-4 space-y-2 text-sm">
              <Row label={`${tickets} ticket${tickets === 1 ? "" : "s"}`} value={money(totals.ticketsSubtotal)} />
              {extras > 0 ? (
                <Row
                  label={`${extras} extra card${extras === 1 ? "" : "s"}`}
                  value={money(totals.cardsSubtotal)}
                />
              ) : null}
              <Row label={`Card fee (${event.cardFeePercent}%)`} value={money(totals.fee)} />
              <div className="border-t border-[#d5e2d4] pt-2">
                <Row label="Total" value={money(totals.total)} bold />
              </div>
            </dl>
            {takeHomeFilled ? (
              <div className="mt-4 rounded-xl bg-[#e8f3e4] p-3 text-xs text-[#1f4d2a]">
                <p className="flex items-center gap-1 font-bold">
                  <Leaf className="h-3.5 w-3.5" /> Free plants selected
                </p>
                <ul className="mt-1 list-inside list-disc">
                  {takeHomeIds.map((id, i) => (
                    <li key={`${id}-${i}`}>{plantById.get(id)?.name ?? "—"}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {winningIds.length > 0 ? (
              <div className="mt-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">
                <p className="flex items-center gap-1 font-bold">
                  <Sparkles className="h-3.5 w-3.5" /> Winning prefs
                </p>
                <ol className="mt-1 list-inside list-decimal">
                  {winningIds.map((id) => (
                    <li key={id}>{plantById.get(id)?.name ?? "—"}</li>
                  ))}
                </ol>
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}

function PlantThumb({ plant }: { plant: PublicPlant }) {
  if (plant.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={plant.imageUrl}
        alt=""
        className="h-12 w-12 shrink-0 rounded-lg object-cover"
      />
    );
  }
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[#e8f3e4] text-[#1f4d2a]">
      <Leaf className="h-5 w-5" />
    </div>
  );
}

function QtyRow(props: {
  label: string;
  hint: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-[#d5e2d4] px-4 py-3">
      <div>
        <p className="font-semibold text-[#1f4d2a]">{props.label}</p>
        <p className="text-xs text-[#6b7c6e]">{props.hint}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-full border border-[#d5e2d4]"
          onClick={() => props.onChange(Math.max(props.min, props.value - 1))}
          disabled={props.value <= props.min}
        >
          <Minus className="h-4 w-4" />
        </button>
        <span className="w-8 text-center text-lg font-bold tabular-nums text-[#1f4d2a]">{props.value}</span>
        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-full border border-[#d5e2d4]"
          onClick={() => props.onChange(Math.min(props.max, props.value + 1))}
          disabled={props.value >= props.max}
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5 text-sm">
      <span className="font-semibold text-[#1f4d2a]">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-3", bold && "text-base font-bold text-[#1f4d2a]")}>
      <dt className={bold ? undefined : "text-[#3d5a40]"}>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}

function NavButtons(props: {
  onBack: (() => void) | null;
  onNext: () => void;
  nextLabel: string;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#d5e2d4] pt-5">
      {props.onBack ? (
        <button
          type="button"
          onClick={props.onBack}
          className="rounded-full px-4 py-2 text-sm font-semibold text-[#3d5a40] hover:bg-[#f4f7f0]"
        >
          Back
        </button>
      ) : (
        <span />
      )}
      <div className="flex flex-wrap gap-2">
        {props.onSecondary && props.secondaryLabel ? (
          <button
            type="button"
            onClick={props.onSecondary}
            className="rounded-full border border-[#d5e2d4] px-4 py-2 text-sm font-semibold text-[#3d5a40]"
          >
            {props.secondaryLabel}
          </button>
        ) : null}
        <button
          type="button"
          disabled={props.nextDisabled || props.nextLoading}
          onClick={props.onNext}
          className="inline-flex items-center gap-2 rounded-full bg-[#1f4d2a] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          {props.nextLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {props.nextLabel}
        </button>
      </div>
    </div>
  );
}
