import { useState } from "react";
import { ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
const father = "/assets/testimonial-father.jpg";
const mother = "/assets/testimonial-mother.jpg";
const family = "/assets/testimonial-family.jpg";

type Testimonial = {
  image: string;
  quote: string;
  name: string;
  role: string;
};

const testimonials: Testimonial[] = [
  {
    image: father,
    quote:
      "Paper Flight gave me time back with my family. Quotes go out in minutes, not days.",
    name: "Marcus T.",
    role: "Service Pro",
  },
  {
    image: mother,
    quote:
      "As a single mom, trust is everything. I love that we'll be working with vetted pros and there's no hassle. Paper Flight has my back.",
    name: "Stephanie R.",
    role: "Homeowner",
  },
  {
    image: family,
    quote:
      "We finally have one platform that runs the whole business. Game changer for our family company.",
    name: "The Rivera Family",
    role: "Homeowners",
  },
];

export function TestimonialsSection() {
  const [active, setActive] = useState(1);
  const total = testimonials.length;

  const prev = () => setActive((a) => (a - 1 + total) % total);
  const next = () => setActive((a) => (a + 1) % total);

  return (
    <section className="bg-background py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-6 text-center">
        <h2 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
          Why your neighbors love Paper Flight
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Smart service pros and homeowners helped us reinvent the system from the ground up.
        </p>

        {/* Carousel */}
        <div className="relative mt-14">
          <div className="flex items-center justify-center gap-6">
            {testimonials.map((t, i) => {
              const isActive = i === active;
              return (
                <div
                  key={i}
                  className={`relative shrink-0 overflow-hidden rounded-2xl transition-all duration-500 ${
                    isActive
                      ? "h-[360px] w-full max-w-[860px] opacity-100 sm:h-[420px] lg:h-[480px]"
                      : "hidden h-[420px] w-[260px] opacity-50 blur-sm lg:block"
                  }`}
                >
                  <img
                    src={t.image}
                    alt={t.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  {isActive && (
                    <>
                      <div className="absolute left-5 top-5 grid h-9 w-9 place-items-center rounded-full bg-brand text-brand-foreground shadow">
                        <MessageCircle className="h-4 w-4" fill="currentColor" />
                      </div>
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent p-8 text-left">
                        <p className="max-w-xl text-base font-medium text-white sm:text-lg">
                          "{t.quote}"
                        </p>
                        <p className="mt-4 text-sm font-semibold text-white">{t.name}</p>
                        <p className="text-xs text-white/80">{t.role}</p>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Controls */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              onClick={prev}
              aria-label="Previous testimonial"
              className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              {testimonials.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  aria-label={`Go to testimonial ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    i === active ? "w-6 bg-foreground" : "w-2 bg-border"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={next}
              aria-label="Next testimonial"
              className="grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-foreground transition-colors hover:bg-muted"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
