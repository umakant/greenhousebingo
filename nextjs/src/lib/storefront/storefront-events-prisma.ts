import { prisma } from "@/lib/prisma";

/**
 * Raw row shape returned from the `storefront_events` Postgres table.
 *
 * The table is created at deploy time by `scripts/ensure-storefront-events-schema.js`
 * (see {@link c:\xampp_latest\htdocs\Paper-Flight-Dash\nextjs\scripts\ensure-storefront-events-schema.js})
 * and is intentionally *not* in `schema.prisma` so we can ship without a Prisma generate step.
 * All access goes through `prisma.$queryRaw` / `$executeRaw`.
 */
export type StorefrontEventRow = {
  id: bigint;
  organization_id: bigint;
  website_id: bigint | null;
  slug: string;
  title: string;
  location: string | null;
  venue: string | null;
  event_date: Date | null;
  end_date: Date | null;
  image_url: string | null;
  link_url: string | null;
  description: string | null;
  status: string;
  sort_order: number;
  is_featured: boolean;
  /** Street address (line 1) — added with structured address fields. */
  address_line: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  created_by_id: bigint | null;
  updated_by_id: bigint | null;
  created_at: Date;
  updated_at: Date | null;
};

export type StorefrontEventDto = {
  id: string;
  websiteId: string | null;
  slug: string;
  title: string;
  location: string | null;
  venue: string | null;
  eventDate: string | null;
  endDate: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  description: string | null;
  status: string;
  sortOrder: number;
  isFeatured: boolean;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string | null;
};

export function rowToDto(r: StorefrontEventRow): StorefrontEventDto {
  return {
    id: r.id.toString(),
    websiteId: r.website_id?.toString() ?? null,
    slug: r.slug,
    title: r.title,
    location: r.location,
    venue: r.venue,
    eventDate: r.event_date ? r.event_date.toISOString() : null,
    endDate: r.end_date ? r.end_date.toISOString() : null,
    imageUrl: r.image_url,
    linkUrl: r.link_url,
    description: r.description,
    status: r.status,
    sortOrder: r.sort_order,
    isFeatured: r.is_featured,
    addressLine: r.address_line,
    city: r.city,
    state: r.state,
    postalCode: r.postal_code,
    country: r.country,
    latitude: r.latitude != null ? Number(r.latitude) : null,
    longitude: r.longitude != null ? Number(r.longitude) : null,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at ? r.updated_at.toISOString() : null,
  };
}

/** Detects "relation does not exist" — emitted before the ensure script has run. */
export function isMissingEventsTableError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e ?? "");
  return /storefront_events.+(does not exist|undefined table)/i.test(msg);
}

export const STOREFRONT_EVENTS_SETUP_MESSAGE =
  "Events storage is unavailable. Run `node scripts/ensure-storefront-events-schema.js` (deploy/build.sh runs it automatically).";

export async function listEventsForOrg(
  organizationId: bigint,
  opts?: { websiteId?: bigint | null; status?: "draft" | "published" | "archived" | "all" },
): Promise<StorefrontEventRow[]> {
  const status = opts?.status ?? "all";
  if (opts?.websiteId != null) {
    if (status === "all") {
      return prisma.$queryRaw<StorefrontEventRow[]>`
        SELECT * FROM storefront_events
        WHERE organization_id = ${organizationId} AND website_id = ${opts.websiteId}
        ORDER BY sort_order ASC, event_date ASC NULLS LAST, created_at DESC
      `;
    }
    return prisma.$queryRaw<StorefrontEventRow[]>`
      SELECT * FROM storefront_events
      WHERE organization_id = ${organizationId} AND website_id = ${opts.websiteId} AND status = ${status}
      ORDER BY sort_order ASC, event_date ASC NULLS LAST, created_at DESC
    `;
  }
  if (status === "all") {
    return prisma.$queryRaw<StorefrontEventRow[]>`
      SELECT * FROM storefront_events
      WHERE organization_id = ${organizationId}
      ORDER BY sort_order ASC, event_date ASC NULLS LAST, created_at DESC
    `;
  }
  return prisma.$queryRaw<StorefrontEventRow[]>`
    SELECT * FROM storefront_events
    WHERE organization_id = ${organizationId} AND status = ${status}
    ORDER BY sort_order ASC, event_date ASC NULLS LAST, created_at DESC
  `;
}

/**
 * Returns up to `take` published, non-past events for the public Concept "Events" section.
 * Falls back to upcoming-or-undated; once everything is past, surfaces the most recent.
 */
/**
 * Returns published events for the public storefront carousel.
 *
 * Ordering is **strictly by `event_date`** (closest upcoming first) so the carousel reads as a
 * chronological tour calendar. We intentionally do NOT promote `is_featured` rows to the front —
 * the section already showcases the soonest event prominently as the first slide, and surprising
 * out-of-order entries (e.g. a "featured" date weeks away appearing before next week's stop)
 * confuses customers. Featured remains a merchandising hint elsewhere (admin filters, etc.).
 *
 * Cap is widened (24) so the slider has enough cards to scroll on the shop page.
 */
export async function listPublishedEventsForPublicSection(
  organizationId: bigint,
  websiteId: bigint | null,
  take: number,
): Promise<StorefrontEventRow[]> {
  const limit = Math.max(1, Math.min(24, take));
  try {
    if (websiteId != null) {
      const upcoming = await prisma.$queryRaw<StorefrontEventRow[]>`
        SELECT * FROM storefront_events
        WHERE organization_id = ${organizationId}
          AND (website_id = ${websiteId} OR website_id IS NULL)
          AND status = 'published'
          AND (event_date IS NULL OR event_date >= CURRENT_TIMESTAMP - INTERVAL '1 day')
        ORDER BY event_date ASC NULLS LAST, created_at DESC
        LIMIT ${limit}
      `;
      if (upcoming.length > 0) return upcoming;
      return prisma.$queryRaw<StorefrontEventRow[]>`
        SELECT * FROM storefront_events
        WHERE organization_id = ${organizationId}
          AND (website_id = ${websiteId} OR website_id IS NULL)
          AND status = 'published'
        ORDER BY event_date DESC NULLS LAST, created_at DESC
        LIMIT ${limit}
      `;
    }
    const upcoming = await prisma.$queryRaw<StorefrontEventRow[]>`
      SELECT * FROM storefront_events
      WHERE organization_id = ${organizationId}
        AND status = 'published'
        AND (event_date IS NULL OR event_date >= CURRENT_TIMESTAMP - INTERVAL '1 day')
      ORDER BY event_date ASC NULLS LAST, created_at DESC
      LIMIT ${limit}
    `;
    if (upcoming.length > 0) return upcoming;
    return prisma.$queryRaw<StorefrontEventRow[]>`
      SELECT * FROM storefront_events
      WHERE organization_id = ${organizationId} AND status = 'published'
      ORDER BY event_date DESC NULLS LAST, created_at DESC
      LIMIT ${limit}
    `;
  } catch (e) {
    if (isMissingEventsTableError(e)) return [];
    throw e;
  }
}

export async function getEventById(
  organizationId: bigint,
  id: bigint,
): Promise<StorefrontEventRow | null> {
  const rows = await prisma.$queryRaw<StorefrontEventRow[]>`
    SELECT * FROM storefront_events
    WHERE organization_id = ${organizationId} AND id = ${id}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function findEventBySlug(
  organizationId: bigint,
  slug: string,
): Promise<StorefrontEventRow | null> {
  const rows = await prisma.$queryRaw<StorefrontEventRow[]>`
    SELECT * FROM storefront_events
    WHERE organization_id = ${organizationId} AND slug = ${slug}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

/** Public resolver — published events only, scoped to the active website when set. */
export async function getPublishedEventBySlug(
  organizationId: bigint,
  websiteId: bigint | null,
  slug: string,
): Promise<StorefrontEventRow | null> {
  try {
    if (websiteId != null) {
      const rows = await prisma.$queryRaw<StorefrontEventRow[]>`
        SELECT * FROM storefront_events
        WHERE organization_id = ${organizationId}
          AND slug = ${slug}
          AND status = 'published'
          AND (website_id = ${websiteId} OR website_id IS NULL)
        LIMIT 1
      `;
      return rows[0] ?? null;
    }
    const rows = await prisma.$queryRaw<StorefrontEventRow[]>`
      SELECT * FROM storefront_events
      WHERE organization_id = ${organizationId}
        AND slug = ${slug}
        AND status = 'published'
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch (e) {
    if (isMissingEventsTableError(e)) return null;
    throw e;
  }
}

export type CreateEventInput = {
  organizationId: bigint;
  websiteId: bigint | null;
  slug: string;
  title: string;
  location: string | null;
  venue: string | null;
  eventDate: Date | null;
  endDate: Date | null;
  imageUrl: string | null;
  linkUrl: string | null;
  description: string | null;
  status: string;
  sortOrder: number;
  isFeatured: boolean;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  createdById: bigint | null;
};

export async function createEvent(input: CreateEventInput): Promise<StorefrontEventRow> {
  const rows = await prisma.$queryRaw<StorefrontEventRow[]>`
    INSERT INTO storefront_events (
      organization_id, website_id, slug, title, location, venue, event_date, end_date,
      image_url, link_url, description, status, sort_order, is_featured,
      address_line, city, state, postal_code, country, latitude, longitude,
      created_by_id, updated_by_id, updated_at
    ) VALUES (
      ${input.organizationId}, ${input.websiteId}, ${input.slug}, ${input.title},
      ${input.location}, ${input.venue}, ${input.eventDate}, ${input.endDate},
      ${input.imageUrl}, ${input.linkUrl}, ${input.description}, ${input.status},
      ${input.sortOrder}, ${input.isFeatured},
      ${input.addressLine}, ${input.city}, ${input.state}, ${input.postalCode}, ${input.country},
      ${input.latitude}, ${input.longitude},
      ${input.createdById}, ${input.createdById}, CURRENT_TIMESTAMP
    )
    RETURNING *
  `;
  return rows[0];
}

export type UpdateEventInput = Partial<Omit<CreateEventInput, "organizationId" | "createdById">> & {
  updatedById: bigint | null;
};

export async function updateEvent(
  organizationId: bigint,
  id: bigint,
  input: UpdateEventInput,
): Promise<StorefrontEventRow | null> {
  /**
   * `$queryRawUnsafe` is required for COALESCE-style partial updates (Prisma's tagged template
   * requires every column to appear; we only want to touch keys the caller provided). All
   * dynamic values pass through positional parameters — the SQL string itself is static.
   */
  const sets: string[] = [];
  const params: unknown[] = [];
  const push = (frag: string, value: unknown) => {
    params.push(value);
    sets.push(frag.replace("$$", `$${params.length}`));
  };
  if (input.websiteId !== undefined) push("website_id = $$", input.websiteId);
  if (input.slug !== undefined) push("slug = $$", input.slug);
  if (input.title !== undefined) push("title = $$", input.title);
  if (input.location !== undefined) push("location = $$", input.location);
  if (input.venue !== undefined) push("venue = $$", input.venue);
  if (input.eventDate !== undefined) push("event_date = $$", input.eventDate);
  if (input.endDate !== undefined) push("end_date = $$", input.endDate);
  if (input.imageUrl !== undefined) push("image_url = $$", input.imageUrl);
  if (input.linkUrl !== undefined) push("link_url = $$", input.linkUrl);
  if (input.description !== undefined) push("description = $$", input.description);
  if (input.status !== undefined) push("status = $$", input.status);
  if (input.sortOrder !== undefined) push("sort_order = $$", input.sortOrder);
  if (input.isFeatured !== undefined) push("is_featured = $$", input.isFeatured);
  if (input.addressLine !== undefined) push("address_line = $$", input.addressLine);
  if (input.city !== undefined) push("city = $$", input.city);
  if (input.state !== undefined) push("state = $$", input.state);
  if (input.postalCode !== undefined) push("postal_code = $$", input.postalCode);
  if (input.country !== undefined) push("country = $$", input.country);
  if (input.latitude !== undefined) push("latitude = $$", input.latitude);
  if (input.longitude !== undefined) push("longitude = $$", input.longitude);
  push("updated_by_id = $$", input.updatedById);
  sets.push("updated_at = CURRENT_TIMESTAMP");

  params.push(organizationId);
  const orgIdx = params.length;
  params.push(id);
  const idIdx = params.length;

  const sql = `UPDATE storefront_events SET ${sets.join(", ")} WHERE organization_id = $${orgIdx} AND id = $${idIdx} RETURNING *`;
  const rows = await prisma.$queryRawUnsafe<StorefrontEventRow[]>(sql, ...params);
  return rows[0] ?? null;
}

export async function deleteEvent(organizationId: bigint, id: bigint): Promise<boolean> {
  const n = await prisma.$executeRaw`
    DELETE FROM storefront_events
    WHERE organization_id = ${organizationId} AND id = ${id}
  `;
  return n > 0;
}
