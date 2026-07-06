import "server-only";

import { prisma } from "@/lib/prisma";

/**
 * Editable content for the Water Ice Express landing (home) page.
 * Persisted as a JSON `Setting` row (key below) so superadmins can change copy + images.
 */

export const WATERICE_LANDING_SETTING_KEY = "waterice_landing_config";

export type HeroSlide = {
  image: string;
  kicker: string;
  title: string;
  subtitle: string;
};

export type LandingCta = {
  label: string;
  href: string;
};

export type WaterIceLandingConfig = {
  heroSlides: HeroSlide[];
  heroCtaLabel: string;
  heroCtaHref: string;
  welcome: {
    heading: string;
    body: string;
  };
  feature: {
    kicker: string;
    heading: string;
    body: string;
    image: string;
    primaryCta: LandingCta;
    secondaryCta: LandingCta;
  };
};

export const DEFAULT_WATERICE_LANDING: WaterIceLandingConfig = {
  heroSlides: [
    {
      image: "/waterice/slide-cherry.jpg",
      kicker: "Flavor of the Day",
      title: "Cool Down with Cherry Classic",
      subtitle:
        "Hand-crafted Philly Water Ice made with real fruit. Refreshing, vibrant, and EXPRESS Delivery.",
    },
    {
      image: "/waterice/slide-mango.jpg",
      kicker: "Tropical Limited Edition",
      title: "Escape with Tropical Mango",
      subtitle: "Ripe Alphonso mango blended into a smooth, icy treat. Sunshine in every spoonful.",
    },
    {
      image: "/waterice/slide-blue.jpg",
      kicker: "Fan Favorite",
      title: "Dive into Blue Raspberry",
      subtitle:
        "Tangy, sweet, and impossibly blue — our most-loved flavor for parties and pool days.",
    },
  ],
  heroCtaLabel: "Explore More",
  heroCtaHref: "/shop/flavors",
  welcome: {
    heading: "Welcome Motivated Entrepreneurs!",
    body:
      "Water Ice Express guides, educates, and supports individuals and businesses entering and expanding in the water ice industry which is emerging as a highly promising sector with minimal start-up costs in today's market. With our team of experts, we promise to provide you with the resources to change your life forever.",
  },
  feature: {
    kicker: "Cool. Fast. Delicious.",
    heading: "Philly Water Ice, EXPRESS Delivery.",
    body:
      "From birthdays to block parties, Water Ice Express brings hand-crafted, real-fruit flavors right to your door. Join a membership or book us for your next event.",
    image: "/waterice/hero-water-ice-express-delivery.jpg",
    primaryCta: { label: "Explore Services", href: "/services" },
    secondaryCta: { label: "Book an Event", href: "/events" },
  },
};

function str(v: unknown, fallback: string): string {
  return typeof v === "string" && v.trim() ? v : fallback;
}

function normalizeCta(v: unknown, fallback: LandingCta): LandingCta {
  const o = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  return { label: str(o.label, fallback.label), href: str(o.href, fallback.href) };
}

function normalizeSlide(v: unknown, fallback: HeroSlide): HeroSlide {
  const o = v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  return {
    image: str(o.image, fallback.image),
    kicker: str(o.kicker, fallback.kicker),
    title: str(o.title, fallback.title),
    subtitle: str(o.subtitle, fallback.subtitle),
  };
}

/** Merge a stored partial config with defaults so the page always has complete content. */
export function normalizeLandingConfig(input: unknown): WaterIceLandingConfig {
  const d = DEFAULT_WATERICE_LANDING;
  const o = input && typeof input === "object" && !Array.isArray(input) ? (input as Record<string, unknown>) : {};

  const slidesRaw = Array.isArray(o.heroSlides) ? o.heroSlides : [];
  const heroSlides =
    slidesRaw.length > 0
      ? slidesRaw
          .map((s) => normalizeSlide(s, d.heroSlides[0]))
          .filter((s) => s.image || s.title)
      : d.heroSlides;

  const welcomeRaw = o.welcome && typeof o.welcome === "object" ? (o.welcome as Record<string, unknown>) : {};
  const featureRaw = o.feature && typeof o.feature === "object" ? (o.feature as Record<string, unknown>) : {};

  return {
    heroSlides: heroSlides.length > 0 ? heroSlides : d.heroSlides,
    heroCtaLabel: str(o.heroCtaLabel, d.heroCtaLabel),
    heroCtaHref: str(o.heroCtaHref, d.heroCtaHref),
    welcome: {
      heading: str(welcomeRaw.heading, d.welcome.heading),
      body: str(welcomeRaw.body, d.welcome.body),
    },
    feature: {
      kicker: str(featureRaw.kicker, d.feature.kicker),
      heading: str(featureRaw.heading, d.feature.heading),
      body: str(featureRaw.body, d.feature.body),
      image: str(featureRaw.image, d.feature.image),
      primaryCta: normalizeCta(featureRaw.primaryCta, d.feature.primaryCta),
      secondaryCta: normalizeCta(featureRaw.secondaryCta, d.feature.secondaryCta),
    },
  };
}

/** Read the stored landing config (merged with defaults). Falls back to defaults on any error. */
export async function getWaterIceLandingConfig(): Promise<WaterIceLandingConfig> {
  try {
    const row = await prisma.setting.findFirst({
      where: { key: WATERICE_LANDING_SETTING_KEY },
      orderBy: { id: "asc" },
      select: { value: true },
    });
    if (!row?.value) return DEFAULT_WATERICE_LANDING;
    const parsed = JSON.parse(row.value) as unknown;
    return normalizeLandingConfig(parsed);
  } catch {
    return DEFAULT_WATERICE_LANDING;
  }
}
