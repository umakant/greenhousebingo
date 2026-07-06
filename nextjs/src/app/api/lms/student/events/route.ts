import { LmsCourseStatus, LmsEnrollmentStatus } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

import { lmsTenantActorFromRequest } from "@/lib/lms-instructor-context";
import {
  loadLmsStudentOrganizationProfile,
  loadLmsStudentPurchases,
} from "@/lib/lms-student-section-data";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const VISIBLE: LmsCourseStatus[] = [LmsCourseStatus.PUBLISHED, LmsCourseStatus.SCHEDULED];

/** Organization catalog events + student's enrolled event-style courses. */
export async function GET(req: NextRequest) {
  const actor = await lmsTenantActorFromRequest(req);
  if (!actor) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  const view = req.nextUrl.searchParams.get("view")?.trim().toLowerCase() ?? "organization";

  if (view === "organization") {
    const [organization, courses] = await Promise.all([
      loadLmsStudentOrganizationProfile(actor.organizationId),
      prisma.course.findMany({
        where: {
          organizationId: actor.organizationId,
          status: { in: VISIBLE },
          isPublic: true,
        },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: 48,
        select: {
          id: true,
          title: true,
          slug: true,
          coverImageUrl: true,
          salePrice: true,
          saleCurrency: true,
          accessStartsAt: true,
          linkedPosProduct: { select: { price: true } },
        },
      }),
    ]);

    const items = courses.map((c) => {
      const price =
        c.linkedPosProduct?.price != null
          ? Number(c.linkedPosProduct.price)
          : c.salePrice != null
            ? Number(c.salePrice)
            : null;
      return {
        id: c.id.toString(),
        title: c.title,
        slug: c.slug,
        coverImageUrl: c.coverImageUrl,
        priceLabel: price != null ? `$${price.toFixed(0)}` : "Free",
        eventDate: c.accessStartsAt?.toISOString() ?? null,
        organizationName: organization.name,
      };
    });

    return NextResponse.json({ ok: true, organization, items });
  }

  if (view === "my") {
    const purchases = await loadLmsStudentPurchases({
      organizationId: actor.organizationId,
      studentUserId: actor.userId,
    });

    const sessions = await prisma.lmsLiveSession.findMany({
      where: {
        organizationId: actor.organizationId,
        courseId: {
          in: purchases.items.map((p) => BigInt(p.courseId)),
        },
        status: "SCHEDULED",
      },
      orderBy: [{ startsAt: "asc" }, { id: "asc" }],
      take: 100,
      include: {
        course: { select: { id: true, title: true, slug: true, coverImageUrl: true } },
        _count: { select: { attendances: true } },
      },
    });

    const now = new Date();
    let conducted = 0;
    let open = 0;
    let totalDurationSeconds = 0;

    const items = sessions.map((s) => {
      const durationSeconds = Math.max(0, Math.floor((s.endsAt.getTime() - s.startsAt.getTime()) / 1000));
      totalDurationSeconds += durationSeconds;
      const isOngoing = s.startsAt <= now && s.endsAt >= now;
      const isPast = s.endsAt < now;
      if (isPast) conducted += 1;
      else open += 1;

      const capacityPct =
        s.capacity != null && s.capacity > 0
          ? Math.min(100, Math.round((s._count.attendances / s.capacity) * 100))
          : null;

      return {
        id: s.id.toString(),
        title: s.title,
        courseId: s.courseId.toString(),
        courseTitle: s.course.title,
        coverImageUrl: s.course.coverImageUrl,
        startsAt: s.startsAt.toISOString(),
        endsAt: s.endsAt.toISOString(),
        durationSeconds,
        meetingProvider: s.meetingProvider,
        capacity: s.capacity,
        seatsUsed: s._count.attendances,
        capacityPercent: capacityPct,
        statusLabel: isOngoing ? "Ongoing" : isPast ? "Completed" : "Scheduled",
        statusTone: isOngoing ? "green" : isPast ? "blue" : "blue",
      };
    });

    const hours = Math.floor(totalDurationSeconds / 3600);
    const minutes = Math.floor((totalDurationSeconds % 3600) / 60);

    return NextResponse.json({
      ok: true,
      summary: {
        totalEvents: items.length,
        conductedEvents: conducted,
        openEvents: open,
        durationLabel: `${hours}:${String(minutes).padStart(2, "0")} Hours`,
      },
      items,
    });
  }

  return NextResponse.json({ ok: false, message: "Unknown view." }, { status: 400 });
}
