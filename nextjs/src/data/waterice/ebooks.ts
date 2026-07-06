import ebooksData from "./ebooks.data.json";

export type Category =
  | "Starter Guides"
  | "Operations"
  | "Marketing"
  | "Business Growth";

export type Format = "PDF" | "Print +$10";

export type Book = {
  slug: string;
  title: string;
  category: Category;
  price: number;
  oldPrice: number;
  pages: number;
  rating: number;
  reviews: number;
  cover: string;
  tagline: string;
  description: string;
  highlights: string[];
  chapters: string[];
  author: { name: string; role: string };
};

/**
 * Static fallback catalog. This is the single source of truth shared with the DB
 * seeder `scripts/seed-waterice-ebooks.js`. The eBook pages render from the
 * database when seeded and fall back to this list otherwise.
 */
export const BOOKS: Book[] = ebooksData as Book[];

export const getBookBySlug = (slug: string) =>
  BOOKS.find((b) => b.slug === slug);
