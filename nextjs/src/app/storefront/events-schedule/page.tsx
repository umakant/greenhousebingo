import type { Metadata } from "next";
import { cookies } from "next/headers";

import CalendarApp from "@/components/calendar/calendar-app";
import { StorefrontMerchantShell } from "@/components/storefront/storefront-merchant-shell";
import AuthenticatedLayout from "@/layouts/authenticated-layout";
import {
  type CalendarEvent,
  mapStorefrontEventDtoToCalendarEvent,
} from "@/lib/calendar-data";
import { requireStorefrontPageAccess } from "@/lib/require-storefront-page";
import {
  listEventsForOrg,
  rowToDto,
} from "@/lib/storefront/storefront-events-prisma";
import {
  loadStorefrontActorUser,
  resolveStorefrontOrganizationId,
} from "@/lib/storefront/org-resolution";

export const metadata: Metadata = {
  title: "Events Schedule",
  description: "Appointments calendar with events, RSVP and maps.",
};

/** Force dynamic so the calendar always reflects the latest published events the admin sees. */
export const dynamic = "force-dynamic";

/**
 * Storefront → Events Schedule. Apple-style appointments calendar dashboard backed by the same
 * `storefront_events` table the rest of the platform uses (admin CRUD + storefront carousel +
 * `/events` public schedule).
 *
 * Auth: same gate as the events list — `requireStorefrontPageAccess(..., "events-schedule")` so
 * the sidebar permission and audit trail line up. Org context is derived from the `pf_user_id`
 * cookie (mirrors `requireStorefrontOrganization` minus the NextRequest dependency, since this
 * runs in a Server Component, not a route handler).
 *
 * Dashboard shell: `<AuthenticatedLayout>` + `<StorefrontMerchantShell currentSection="events-schedule">`
 * keeps the same sidebar/top-nav as the events list and surfaces the breadcrumb chain
 * "Storefronts → Events → Schedule" so the back-link to the events list stays one click away.
 */
export default async function StorefrontEventsSchedulePage({
  searchParams,
}: {
  searchParams?: Promise<{ organizationId?: string }>;
}) {
  const u = await requireStorefrontPageAccess("/storefront/events-schedule", "events-schedule");

  const events = await loadCalendarEventsForCurrentActor(searchParams);

  return (
    <AuthenticatedLayout
      user={{
        name: u.name,
        email: u.email,
        roles: u.roles,
        permissions: u.permissions,
        activatedPackages: u.activatedPackages,
      }}
      breadcrumbs={[
        { label: "Storefronts", url: "/storefront/overview" },
        { label: "Events", url: "/storefront/events" },
        { label: "Schedule" },
      ]}
      pageTitle="Events Schedule"
    >
      <StorefrontMerchantShell currentSection="events-schedule" permissions={u.permissions}>
        <div className="space-y-4 p-4 sm:p-6">
          <CalendarApp events={events} />
        </div>
      </StorefrontMerchantShell>
    </AuthenticatedLayout>
  );
}

/**
 * Resolve the current actor's tenant org from cookies, then return *published* events mapped to
 * the calendar shape. We restrict to `published` for the schedule view because the calendar is
 * the live dashboard summary — drafts and archived rows belong on the admin list, not the
 * scheduler. Returns `[]` whenever the org can't be resolved (superadmin without `?organizationId`,
 * unknown user, etc.) so the calendar still renders with its empty state instead of crashing.
 */
async function loadCalendarEventsForCurrentActor(
  searchParams?: Promise<{ organizationId?: string }>,
): Promise<CalendarEvent[]> {
  const sp = searchParams ? await searchParams : undefined;
  const cookieStore = await cookies();
  const uidRaw = cookieStore.get("pf_user_id")?.value?.trim();
  if (!uidRaw) return [];

  let userId: bigint;
  try {
    userId = BigInt(uidRaw);
  } catch {
    return [];
  }

  const user = await loadStorefrontActorUser(userId);
  if (!user) return [];

  const t = (user.type ?? "").trim().toLowerCase();
  const isSuperadmin = t === "superadmin" || t === "super admin";

  let organizationId = resolveStorefrontOrganizationId(user);
  const qOrg = sp?.organizationId?.trim();
  if (isSuperadmin && qOrg && /^\d+$/.test(qOrg)) {
    try {
      organizationId = BigInt(qOrg);
    } catch {
      /* keep the cookie-derived value */
    }
  }
  if (organizationId == null) return [];

  try {
    const rows = await listEventsForOrg(organizationId, { status: "published" });
    return rows
      .map((r) => rowToDto(r))
      .map((dto) => mapStorefrontEventDtoToCalendarEvent(dto))
      .filter((e): e is CalendarEvent => e !== null);
  } catch (e) {
    console.warn("[storefront/events-schedule] listEventsForOrg failed:", e);
    return [];
  }
}
