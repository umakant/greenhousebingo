export function RsvpButtonContent() {
  return (
    <div className="flex items-center justify-between gap-4" data-pf-events-rsvp-inner="1">
      <div>
        <p
          data-pf-events-rsvp-eyebrow="1"
          className="text-[10px] font-semibold uppercase tracking-[0.3em] text-white/80"
        >
          Don&apos;t miss out
        </p>
        <p
          data-pf-events-rsvp-title="1"
          className="mt-1 text-xl font-bold uppercase tracking-[0.18em] text-white"
        >
          RSVP Now
        </p>
        <p data-pf-events-rsvp-sub="1" className="mt-1 text-xs text-white/85">
          Secure your spot — limited availability
        </p>
      </div>
      <span
        data-pf-events-rsvp-arrow="1"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-orange-500 transition group-hover:translate-x-1"
      >
        →
      </span>
    </div>
  );
}
