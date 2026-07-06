import { useState } from "react";
import { ChevronDown } from "lucide-react";

const tiers = [
  { price: 237, providers: 60, contacts: 10000 },
  { price: 277, providers: 75, contacts: 15000 },
  { price: 317, providers: 90, contacts: 20000 },
  { price: 357, providers: 110, contacts: 25000 },
  { price: 397, providers: 130, contacts: 30000 },
  { price: 437, providers: 150, contacts: 40000 },
  { price: 477, providers: 175, contacts: 50000 },
  { price: 517, providers: 200, contacts: 65000 },
  { price: 557, providers: 230, contacts: 80000 },
  { price: 597, providers: 260, contacts: 100000 },
];

export function PriceCalculator() {
  const [idx, setIdx] = useState(0);
  const [open, setOpen] = useState(false);
  const tier = tiers[idx];

  return (
    <div id="larger-plans" className="mt-20">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="group mx-auto flex w-full max-w-2xl items-center justify-between gap-4 rounded-2xl border border-border bg-card px-6 py-5 text-left transition-colors hover:bg-muted/40"
      >
        <span>
          <span className="block text-2xl font-bold text-foreground sm:text-3xl">
            See Larger Plans
          </span>
          <span className="mt-1 block text-sm text-muted-foreground">
            Calculate your price — slide for pricing.
          </span>
        </span>
        <ChevronDown
          className={`h-6 w-6 shrink-0 text-brand transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className={`grid transition-all duration-300 ease-out ${
          open ? "mt-6 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="rounded-3xl border border-border bg-card p-8 sm:p-12">
            <p className="text-center text-sm font-semibold text-foreground">Premium</p>

        <p className="mt-2 flex items-baseline justify-center gap-1">
          <span className="text-6xl font-bold tracking-tight text-foreground tabular-nums">
            {tier.price} USD
          </span>
          <span className="text-sm text-muted-foreground">/mo</span>
        </p>

        <div className="mt-10 mx-auto max-w-2xl">
          <input
            type="range"
            min={0}
            max={tiers.length - 1}
            step={1}
            value={idx}
            onChange={(e) => setIdx(Number(e.target.value))}
            className="w-full accent-brand cursor-pointer"
            aria-label="Pricing tier slider"
          />
          <div className="mt-2 flex justify-between text-xs text-muted-foreground">
            <span>{tiers[0].price}</span>
            <span>{tiers[tiers.length - 1].price}</span>
          </div>
        </div>

        <dl className="mt-10 grid grid-cols-3 gap-6 text-center sm:gap-10">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Providers or GB</dt>
            <dd className="mt-1 text-2xl font-bold text-foreground tabular-nums">{tier.providers}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Contacts</dt>
            <dd className="mt-1 text-2xl font-bold text-foreground tabular-nums">
              {tier.contacts.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">Includes</dt>
            <dd className="mt-1 text-sm font-semibold text-foreground">Everything in Premium</dd>
          </div>
        </dl>

        <div className="mt-10 text-center">
          <button className="rounded-full bg-brand px-8 py-3 text-sm font-bold uppercase tracking-wide text-brand-foreground transition-all hover:brightness-110">
            Choose
          </button>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}
