"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";

export type HeroSlide = {
  src: string;
  alt?: string;
  kicker: string;
  title: string;
  subtitle: string;
};

const DEFAULT_SLIDES: HeroSlide[] = [
  {
    src: "/waterice/slide-cherry.jpg",
    alt: "Cherry water ice",
    kicker: "Flavor of the Day",
    title: "Cool Down with Cherry Classic",
    subtitle:
      "Hand-crafted Philly Water Ice made with real fruit. Refreshing, vibrant, and EXPRESS Delivery.",
  },
  {
    src: "/waterice/slide-mango.jpg",
    alt: "Mango water ice",
    kicker: "Tropical Limited Edition",
    title: "Escape with Tropical Mango",
    subtitle: "Ripe Alphonso mango blended into a smooth, icy treat. Sunshine in every spoonful.",
  },
  {
    src: "/waterice/slide-blue.jpg",
    alt: "Blue raspberry water ice",
    kicker: "Fan Favorite",
    title: "Dive into Blue Raspberry",
    subtitle:
      "Tangy, sweet, and impossibly blue — our most-loved flavor for parties and pool days.",
  },
];

export function HeroSlider({
  slides: slidesProp,
  ctaLabel = "Explore More",
  ctaHref = "/shop/flavors",
}: {
  slides?: HeroSlide[];
  ctaLabel?: string;
  ctaHref?: string;
} = {}) {
  const slides = slidesProp && slidesProp.length > 0 ? slidesProp : DEFAULT_SLIDES;
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), 5500);
    return () => clearInterval(id);
  }, []);

  const go = (dir: number) => setIndex((i) => (i + dir + slides.length) % slides.length);

  return (
    <section className="w-full bg-background px-3">
      <div className="relative aspect-[4/5] sm:aspect-[16/9] md:aspect-[21/9] w-full overflow-hidden rounded-[1.25rem] shadow-2xl sm:rounded-[2rem] md:rounded-[2.5rem]">
        <div
          className="flex h-full w-full transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {slides.map((s, i) => (
            <div key={`${s.src}-${i}`} className="relative h-full w-full flex-shrink-0">
              <img
                src={s.src}
                alt={s.alt}
                width={1600}
                height={896}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 sm:px-6">
                <span className="inline-block rounded-full bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold sm:px-5 sm:py-2 sm:text-sm">
                  {s.kicker}
                </span>
                <h1 className="mt-3 font-display text-2xl font-extrabold text-white max-w-4xl leading-tight drop-shadow sm:mt-6 sm:text-4xl md:text-6xl lg:text-7xl">
                  {s.title}
                </h1>
                <p className="mt-2 max-w-2xl text-white/90 text-sm leading-relaxed line-clamp-3 sm:mt-6 sm:text-base sm:line-clamp-none md:text-lg">
                  {s.subtitle}
                </p>
                <Link
                  href={ctaHref}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold pl-5 pr-2 py-1.5 transition hover:opacity-95 sm:mt-8 sm:gap-3 sm:pl-7 sm:py-2 sm:text-base"
                >
                  {ctaLabel}
                  <span className="grid place-items-center w-8 h-8 rounded-full bg-white/95 text-primary sm:w-9 sm:h-9">
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </Link>
              </div>
            </div>
          ))}
        </div>

        <button
          aria-label="Previous slide"
          onClick={() => go(-1)}
          className="absolute left-2 top-1/2 -translate-y-1/2 grid place-items-center w-9 h-9 rounded-full bg-black/30 text-white transition hover:bg-black/50 sm:left-8 sm:w-12 sm:h-12"
        >
          <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        <button
          aria-label="Next slide"
          onClick={() => go(1)}
          className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center w-9 h-9 rounded-full bg-black/30 text-white transition hover:bg-black/50 sm:right-8 sm:w-12 sm:h-12"
        >
          <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 sm:bottom-6">
          {slides.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${
                i === index ? "w-8 bg-white" : "w-2 bg-white/50"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
