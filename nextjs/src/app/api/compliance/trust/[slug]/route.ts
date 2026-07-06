import { NextResponse, type NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ slug: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { slug } = await ctx.params;
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });

  const row = await prisma.complianceTrustCenter.findFirst({
    where: { publicSlug: normalized, published: true },
    include: { organization: { select: { name: true } } },
  });
  if (!row) return NextResponse.json({ ok: false, message: "Trust center not published." }, { status: 404 });

  const orgId = row.organizationId;
  const [frameworks, monitors, documents] = await Promise.all([
    prisma.complianceFramework.findMany({
      where: { organizationId: orgId, status: "active" },
      select: { code: true, name: true, progressPct: true, auditReadyPct: true },
      take: 20,
    }),
    prisma.complianceMonitor.findMany({
      where: { organizationId: orgId, status: "active" },
      select: { name: true, category: true, lastRunAt: true },
      take: 20,
    }),
    prisma.complianceDocument.findMany({
      where: { organizationId: orgId, status: "active" },
      select: { id: true, title: true, docType: true, fileUrl: true },
      take: 50,
    }),
  ]);

  return NextResponse.json({
    ok: true,
    organizationName: row.organization.name,
    sections: row.sections,
    compliance: {
      frameworks: frameworks.map((f) => ({
        code: f.code,
        name: f.name,
        progressPct: f.progressPct,
        auditReadyPct: f.auditReadyPct,
      })),
    },
    monitoring: monitors.map((m) => ({
      name: m.name,
      category: m.category,
      lastRunAt: m.lastRunAt?.toISOString() ?? null,
    })),
    documents: documents.map((d) => ({
      id: Number(d.id),
      title: d.title,
      docType: d.docType,
      accessLevel: "request_access",
      fileUrl: null,
    })),
  });
}
