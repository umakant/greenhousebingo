import { ArrowRight, Check, Sparkles } from "lucide-react";

export function CtaSection() {
  return (
    <section className="relative overflow-hidden bg-[oklch(0.28_0.08_250)] px-4 py-20 text-white sm:px-6 sm:py-24">
      {/* subtle radial glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            "radial-gradient(ellipse at top, oklch(0.55 0.18 240 / 0.4), transparent 60%)",
        }}
      />

      <div className="relative mx-auto max-w-4xl text-center">
        <h2 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
          Stop Overpaying.
          <br />
          <span className="text-brand">Start Growing.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-base text-white/70 sm:text-lg">
          Join 1,000+ service businesses who made the switch. Unlimited contacts,
          unlimited users, all features for one flat price.
        </p>

        {/* Pills */}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <span className="rounded-full bg-brand/20 px-5 py-2 text-sm font-bold text-brand ring-1 ring-brand/40">
            $97/mo flat
          </span>
          <span className="rounded-full bg-white/5 px-5 py-2 text-sm font-bold text-white ring-1 ring-white/15">
            Unlimited Everything
          </span>
          <span className="rounded-full bg-white/5 px-5 py-2 text-sm font-bold text-white ring-1 ring-white/15">
            No Per-Seat Fees
          </span>
        </div>

        {/* Checks row */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-white/80">
          {["14-day money-back guarantee", "Cancel anytime", "Setup in minutes"].map(
            (t) => (
              <div key={t} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-brand" />
                {t}
              </div>
            )
          )}
        </div>

        {/* Primary CTA row */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
          <button className="inline-flex items-center gap-2 rounded-full bg-brand px-8 py-4 text-sm font-bold text-brand-foreground shadow-lg transition-colors hover:bg-brand/90">
            Get Started — $97/mo
            <ArrowRight className="h-4 w-4" />
          </button>
          <a href="#" className="text-sm font-semibold text-white hover:underline">
            Sign In
          </a>
        </div>
        <p className="mt-3 text-xs text-white/60">
          14-day money-back guarantee · Cancel anytime
        </p>

        {/* Lifetime offer card */}
        <div className="mx-auto mt-14 max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur">
          <p className="text-xs font-bold uppercase tracking-widest text-white/60">
            Limited Time Offer
          </p>
          <p className="mt-3 text-3xl font-extrabold">
            Lifetime Access: <span className="text-brand">$1,997</span>
          </p>
          <p className="mt-2 text-sm text-white/70">
            Only 11 of 50 seats left · Never pay again
          </p>
          <button className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-brand px-6 py-3.5 text-sm font-bold text-brand-foreground shadow-lg transition-colors hover:bg-brand/90">
            <Sparkles className="h-4 w-4" />
            Claim Your Seat
          </button>
        </div>
      </div>
    </section>
  );
}
