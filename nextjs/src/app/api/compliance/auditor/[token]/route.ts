import { NextResponse, type NextRequest } from "next/server";

import { resolveAuditorToken } from "@/lib/compliance/compliance-auditor-access";
import {
  serializeAudit,
  serializeControl,
  serializeDocument,
  serializeEvidence,
  serializePolicy,
} from "@/lib/compliance/compliance-service";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ token: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  const { token } = await ctx.params;
  const session = await resolveAuditorToken(token);
  if (!session) return NextResponse.json({ ok: false, message: "Invalid or expired auditor access." }, { status: 403 });

  const orgId = session.organizationId;
  const [evidenceCount, controlCount, policyCount, documentCount, audit] = await Promise.all([
    prisma.complianceEvidence.count({ where: { organizationId: orgId, auditorVisible: true } }),
    prisma.complianceControl.count({ where: { organizationId: orgId } }),
    prisma.compliancePolicy.count({ where: { organizationId: orgId, status: "published" } }),
    prisma.complianceDocument.count({ where: { organizationId: orgId, auditorVisible: true } }),
    session.auditId
      ? prisma.complianceAudit.findFirst({
          where: { id: session.auditId, organizationId: orgId },
          include: { framework: { select: { id: true, code: true, name: true } } },
        })
      : Promise.resolve(null),
  ]);

  return NextResponse.json({
    ok: true,
    session: {
      auditorName: session.auditorName,
      organizationName: session.organizationName,
      audit: audit ? serializeAudit(audit) : null,
    },
    counts: { evidence: evidenceCount, controls: controlCount, policies: policyCount, documents: documentCount },
    permissions: {
      canViewEvidence: true,
      canViewControls: true,
      canViewPolicies: true,
      canViewDocuments: true,
      canRequestEvidence: true,
      canComment: true,
      canExport: true,
      canEditCompany: false,
      canViewOtherTenants: false,
    },
  });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  const { token } = await ctx.params;
  const session = await resolveAuditorToken(token);
  if (!session) return NextResponse.json({ ok: false, message: "Invalid or expired auditor access." }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const action = String(body.action ?? "").trim();

  if (action === "comment") {
    const entityType = String(body.entityType ?? "").trim();
    const entityId = Number(body.entityId);
    const commentBody = String(body.body ?? "").trim();
    if (!entityType || !Number.isFinite(entityId) || !commentBody) {
      return NextResponse.json({ ok: false, message: "Invalid comment." }, { status: 400 });
    }
    const comment = await prisma.complianceComment.create({
      data: {
        organizationId: session.organizationId,
        entityType,
        entityId: BigInt(entityId),
        body: commentBody,
        authorName: session.auditorName,
      },
    });
    return NextResponse.json({
      ok: true,
      comment: { id: Number(comment.id), body: comment.body, createdAt: comment.createdAt.toISOString() },
    });
  }

  if (action === "request_evidence") {
    if (!session.auditId) {
      return NextResponse.json({ ok: false, message: "No audit linked to this invite." }, { status: 400 });
    }
    const audit = await prisma.complianceAudit.findFirst({
      where: { id: session.auditId, organizationId: session.organizationId },
    });
    if (!audit) return NextResponse.json({ ok: false, message: "Audit not found." }, { status: 404 });

    const meta = (audit.metadata ?? {}) as {
      requests?: Array<{ id: string; title: string; status: string; requestedAt?: string; notes?: string }>;
    };
    const requests = meta.requests ?? [];
    requests.push({
      id: `${Date.now()}`,
      title: String(body.title ?? "Auditor evidence request").trim(),
      status: "open",
      requestedAt: new Date().toISOString(),
      notes: `Requested by ${session.auditorName}: ${String(body.notes ?? "").trim()}`,
    });

    await prisma.complianceAudit.update({
      where: { id: audit.id },
      data: { metadata: { ...meta, requests }, updatedAt: new Date() },
    });

    return NextResponse.json({ ok: true, message: "Evidence request submitted." });
  }

  if (action === "export") {
    const [evidence, documents, controls, policies] = await Promise.all([
      prisma.complianceEvidence.findMany({
        where: { organizationId: session.organizationId, auditorVisible: true },
        take: 200,
      }),
      prisma.complianceDocument.findMany({
        where: { organizationId: session.organizationId, auditorVisible: true },
        take: 200,
      }),
      prisma.complianceControl.findMany({
        where: { organizationId: session.organizationId },
        take: 200,
        include: { framework: { select: { id: true, code: true, name: true } } },
      }),
      prisma.compliancePolicy.findMany({
        where: { organizationId: session.organizationId, status: "published" },
        take: 100,
      }),
    ]);

    return NextResponse.json({
      ok: true,
      package: {
        exportedAt: new Date().toISOString(),
        exportedBy: session.auditorName,
        evidence: evidence.map(serializeEvidence),
        documents: documents.map(serializeDocument),
        controls: controls.map((c) => serializeControl(c)),
        policies: policies.map(serializePolicy),
      },
    });
  }

  if (action === "list") {
    const resource = String(body.resource ?? "evidence").trim();
    const orgId = session.organizationId;

    if (resource === "evidence") {
      const rows = await prisma.complianceEvidence.findMany({
        where: { organizationId: orgId, auditorVisible: true },
        include: { control: { select: { id: true, controlCode: true, title: true } } },
        orderBy: { updatedAt: "desc" },
        take: 200,
      });
      return NextResponse.json({ ok: true, items: rows.map(serializeEvidence) });
    }
    if (resource === "controls") {
      const rows = await prisma.complianceControl.findMany({
        where: { organizationId: orgId },
        include: { framework: { select: { id: true, code: true, name: true } } },
        orderBy: { controlCode: "asc" },
        take: 200,
      });
      return NextResponse.json({ ok: true, items: rows.map((r) => serializeControl(r)) });
    }
    if (resource === "policies") {
      const rows = await prisma.compliancePolicy.findMany({
        where: { organizationId: orgId, status: "published" },
        orderBy: { title: "asc" },
        take: 200,
      });
      return NextResponse.json({ ok: true, items: rows.map(serializePolicy) });
    }
    if (resource === "documents") {
      const rows = await prisma.complianceDocument.findMany({
        where: { organizationId: orgId, auditorVisible: true },
        orderBy: { title: "asc" },
        take: 200,
      });
      return NextResponse.json({ ok: true, items: rows.map(serializeDocument) });
    }

    return NextResponse.json({ ok: false, message: "Unknown resource." }, { status: 400 });
  }

  return NextResponse.json({ ok: false, message: "Unknown action." }, { status: 400 });
}
