import { z } from "zod";

import { EVENT_VENDOR_STATUSES } from "@/lib/event-platform/vendors/vendor-types";

export const eventVendorCreateSchema = z.object({
  vendorName: z.string().trim().min(1).max(255),
  companyName: z.string().trim().max(255).optional().nullable(),
  contactName: z.string().trim().max(255).optional().nullable(),
  email: z
    .string()
    .trim()
    .max(255)
    .optional()
    .nullable()
    .refine((v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), { message: "Invalid email" }),
  phone: z.string().trim().max(64).optional().nullable(),
  website: z.string().trim().max(512).optional().nullable(),
  businessType: z.string().trim().max(128).optional().nullable(),
  status: z.enum(EVENT_VENDOR_STATUSES).optional(),
  defaultCommissionRate: z.union([z.string(), z.number()]).optional().nullable(),
  overrideCommissionRate: z.union([z.string(), z.number()]).optional().nullable(),
  payoutMethod: z.string().trim().max(64).optional().nullable(),
  taxId: z.string().trim().max(64).optional().nullable(),
  addressLine1: z.string().trim().max(255).optional().nullable(),
  addressLine2: z.string().trim().max(255).optional().nullable(),
  city: z.string().trim().max(128).optional().nullable(),
  state: z.string().trim().max(64).optional().nullable(),
  postalCode: z.string().trim().max(32).optional().nullable(),
  country: z.string().trim().max(64).optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
});

export const eventVendorUpdateSchema = eventVendorCreateSchema.partial();

export function parseCommissionRate(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v));
  if (!Number.isFinite(n) || n < 0 || n > 100) return null;
  return n;
}
