import { WIN_WITH_BARLOW_WORKSHOPS } from "@/lib/company-themes/win-with-barlow-workshops";

export type CompanySiteCatalogItem = {
  id: string;
  type: "course" | "workshop";
  slug: string;
  title: string;
  price: number;
  currency: "USD";
  path: string;
};

/** Static catalog for Win With Barlow theme checkout validation. */
export const WIN_WITH_BARLOW_CATALOG: CompanySiteCatalogItem[] = [
  { id: "course:1", type: "course", slug: "1", title: "Advanced UX Research Methods", price: 240, currency: "USD", path: "/course/1" },
  { id: "course:2", type: "course", slug: "2", title: "Modern TypeScript for React Engineers", price: 180, currency: "USD", path: "/course/2" },
  { id: "course:3", type: "course", slug: "3", title: "Watercolor Studio: Botanicals", price: 85, currency: "USD", path: "/course/3" },
  { id: "course:4", type: "course", slug: "4", title: "Foundations of Product Strategy", price: 420, currency: "USD", path: "/course/4" },
  { id: "course:5", type: "course", slug: "5", title: "Sourdough from Scratch", price: 145, currency: "USD", path: "/course/5" },
  { id: "course:6", type: "course", slug: "6", title: "Intro to Generative AI for Builders", price: 199, currency: "USD", path: "/course/6" },
  { id: "course:7", type: "course", slug: "7", title: "Mindful Movement & Yoga", price: 28, currency: "USD", path: "/course/7" },
  { id: "course:8", type: "course", slug: "8", title: "Cinematic Photography Walk", price: 65, currency: "USD", path: "/course/8" },
  { id: "course:9", type: "course", slug: "9", title: "Financial Modeling Bootcamp", price: 320, currency: "USD", path: "/course/9" },
  {
    id: "course:dot-study-hall",
    type: "course",
    slug: "dot-study-hall",
    title: "DOT Specimen Collector Study Hall",
    price: 77,
    currency: "USD",
    path: "/course/dot-study-hall",
  },
  ...WIN_WITH_BARLOW_WORKSHOPS.map(
    (workshop): CompanySiteCatalogItem => ({
      id: workshop.catalogId,
      type: "workshop",
      slug: workshop.slug,
      title: workshop.title,
      price: workshop.price,
      currency: "USD",
      path: workshop.path,
    }),
  ),
];

const byId = new Map(WIN_WITH_BARLOW_CATALOG.map((item) => [item.id, item]));

export function getWinWithBarlowCatalogItem(id: string): CompanySiteCatalogItem | null {
  return byId.get(id) ?? null;
}

export function resolveWinWithBarlowCatalogFromPath(pathname: string): CompanySiteCatalogItem | null {
  const normalized = pathname.replace(/\/$/, "") || "/";
  return WIN_WITH_BARLOW_CATALOG.find((item) => item.path === normalized) ?? null;
}
