import { z } from "zod";

import { EVENT_VENUE_STATUSES, VENUE_WEEKDAYS } from "@/lib/event-platform/venues/venue-types";

const businessHoursSchema = z
  .object({
    mon: z.string().trim().max(128).optional(),
    tue: z.string().trim().max(128).optional(),
    wed: z.string().trim().max(128).optional(),
    thu: z.string().trim().max(128).optional(),
    fri: z.string().trim().max(128).optional(),
    sat: z.string().trim().max(128).optional(),
    sun: z.string().trim().max(128).optional(),
  })
  .optional()
  .nullable();

function optionalCoordinateSchema(min: number, max: number, label: string) {
  return z
    .union([z.string(), z.number()])
    .optional()
    .nullable()
    .superRefine((v, ctx) => {
      if (v === null || v === undefined || v === "") return;
      const n = typeof v === "number" ? v : Number(String(v).trim());
      if (!Number.isFinite(n)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `${label} must be a valid number.` });
        return;
      }
      if (n < min || n > max) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `${label} must be between ${min} and ${max}.`,
        });
      }
    });
}

export const eventVenueCreateSchema = z.object({
  name: z.string().trim().min(1).max(255),
  phone: z.string().trim().max(64).optional().nullable(),
  website: z.string().trim().max(512).optional().nullable(),
  address: z.string().trim().max(512).optional().nullable(),
  address2: z.string().trim().max(512).optional().nullable(),
  city: z.string().trim().max(128).optional().nullable(),
  state: z.string().trim().max(64).optional().nullable(),
  zip: z.string().trim().max(32).optional().nullable(),
  latitude: optionalCoordinateSchema(-90, 90, "Latitude"),
  longitude: optionalCoordinateSchema(-180, 180, "Longitude"),
  category: z.string().trim().max(128).optional().nullable(),
  venueType: z.string().trim().max(128).optional().nullable(),
  contactFirstName: z.string().trim().max(128).optional().nullable(),
  contactLastName: z.string().trim().max(128).optional().nullable(),
  contactPhone: z.string().trim().max(64).optional().nullable(),
  contactEmail: z
    .string()
    .trim()
    .max(255)
    .optional()
    .nullable()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), { message: "Invalid email" }),
  seating: z.union([z.string(), z.number()]).optional().nullable(),
  age21Plus: z.boolean().optional(),
  drinksAlcohol: z.boolean().optional(),
  food: z.boolean().optional(),
  businessHours: businessHoursSchema,
  status: z.enum(EVENT_VENUE_STATUSES).optional(),
});

export const eventVenueUpdateSchema = eventVenueCreateSchema.partial();

export function parseCoordinate(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  if (!Number.isFinite(n)) return null;
  return n;
}

export function parseLatitude(v: unknown): number | null {
  const n = parseCoordinate(v);
  if (n == null) return null;
  if (n < -90 || n > 90) return null;
  return n;
}

export function parseLongitude(v: unknown): number | null {
  const n = parseCoordinate(v);
  if (n == null) return null;
  if (n < -180 || n > 180) return null;
  return n;
}

export function parseSeating(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  if (!Number.isFinite(n) || n < 0 || !Number.isInteger(n)) return null;
  return n;
}

export function normalizeBusinessHours(
  raw: z.infer<typeof businessHoursSchema>,
): Record<string, string> | null {
  if (!raw || typeof raw !== "object") return null;
  const out: Record<string, string> = {};
  for (const day of VENUE_WEEKDAYS) {
    const val = raw[day]?.trim();
    if (val) out[day] = val;
  }
  return Object.keys(out).length ? out : null;
}
