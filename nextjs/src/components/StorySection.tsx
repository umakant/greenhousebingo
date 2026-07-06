const pfIcon = "/assets/paperflight-icon.png";
const windowImg = "/assets/industry-window.jpg";
const contractor = "/assets/story-contractor.jpg";
const phone = "/assets/story-phone.jpg";

export function StorySection() {
  return (
    <section className="bg-background px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[minmax(0,704px)_minmax(0,1fr)] lg:items-center">
        {/* Collage — matches the reference: one tall box, two stacked boxes. */}
        <div className="relative">
          <div className="grid aspect-[704/535] w-full grid-cols-2 grid-rows-2 gap-3">
            <div className="row-span-2 overflow-hidden rounded-2xl">
              <img
                src={windowImg}
                alt="Service professional at work"
                width={768}
                height={1152}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-2xl">
              <img
                src={contractor}
                alt="Contractor reviewing project"
                width={768}
                height={576}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="overflow-hidden rounded-2xl">
              <img
                src={phone}
                alt="Mobile dashboard"
                width={768}
                height={576}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          {/* Center icon overlay */}
          <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="flex h-28 w-28 items-center justify-center rounded-3xl bg-card p-4 shadow-2xl ring-1 ring-border">
              <img
                src={pfIcon}
                alt="Paper Flight"
                width={96}
                height={96}
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        </div>

        {/* Copy */}
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            The Real Story Behind
            <br />
            <span className="text-brand">Paper Flight</span>
          </h2>
          <p className="mt-6 text-base leading-relaxed text-muted-foreground sm:text-lg">
            Paper Flight was created by service pros, for service pros — because we've
            lived the challenges of running a service business. Whether you're scheduling
            jobs, sending estimates, or getting paid, our all-in-one platform simplifies
            every part of the process so you can save time and grow faster.
          </p>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
            With intuitive tools built specifically for home service professionals, Paper
            Flight takes the hassle out of daily operations and helps you focus on what
            matters most: your customers and your craft.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <button className="rounded-full bg-brand px-7 py-3.5 text-sm font-bold text-brand-foreground shadow-lg transition-colors hover:bg-brand/90">
              Learn More
            </button>
            <button className="rounded-full bg-foreground px-7 py-3.5 text-sm font-bold text-background shadow-lg transition-opacity hover:opacity-90">
              Book a Demo
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
