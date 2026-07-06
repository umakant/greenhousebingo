import { NextResponse, type NextRequest } from "next/server";

import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import { canManageEmWorkspace, canReadEmWorkspace, prismaTableMissingResponse, resolveEmWorkspaceRequest } from "@/lib/em-workspace-api";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function serialize(row: {
  id: bigint;
  title: string;
  fileUrl: string;
  createdAt: Date;
  uploadedBy: { name: string | null; email: string | null } | null;
}) {
  return {
    id: row.id.toString(),
    title: row.title,
    fileUrl: row.fileUrl,
    createdAt: row.createdAt.toISOString(),
    uploadedByName:
      (row.uploadedBy?.name ?? "").trim() || (row.uploadedBy?.email ?? "").trim() || "Unknown",
  };
}

export async function GET(req: NextRequest) {
  try {
    const role = req.cookies.get("pf_role")?.value;
    const perms = await getPermissionsFromRequest(req);
    if (!canReadEmWorkspace(perms, role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const ctx = await resolveEmWorkspaceRequest(req);
    if (!ctx.ok) return ctx.res;

    const db = (prisma as unknown as { emWorkspaceDocument?: { findMany: Function; count: Function } }).emWorkspaceDocument;
    if (!db) return NextResponse.json({ error: "Prisma client missing EmWorkspaceDocument." }, { status: 503 });

    try {
      const [rows, total] = await Promise.all([
        db.findMany({
          where: { organizationId: ctx.organizationId },
          orderBy: { createdAt: "desc" },
          include: { uploadedBy: { select: { name: true, email: true } } },
        }),
        db.count({ where: { organizationId: ctx.organizationId } }),
      ]);
      return NextResponse.json({ data: rows.map(serialize), total });
    } catch (e: unknown) {
      return prismaTableMissingResponse(e, "Workspace documents table is missing.") ?? NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = req.cookies.get("pf_role")?.value;
    const perms = await getPermissionsFromRequest(req);
    if (!canReadEmWorkspace(perms, role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const ctx = await resolveEmWorkspaceRequest(req);
    if (!ctx.ok) return ctx.res;

    const db = (prisma as unknown as { emWorkspaceDocument?: { create: Function } }).emWorkspaceDocument;
    if (!db) return NextResponse.json({ error: "Prisma client missing EmWorkspaceDocument." }, { status: 503 });

    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const title = String(body?.title ?? "").trim();
    const fileUrl = String(body?.fileUrl ?? "").trim();
    if (!title || !fileUrl) {
      return NextResponse.json({ error: "title and fileUrl are required." }, { status: 400 });
    }

    try {
      const row = await db.create({
        data: {
          organizationId: ctx.organizationId,
          title,
          fileUrl,
          uploadedByUserId: ctx.actor.id,
        },
        include: { uploadedBy: { select: { name: true, email: true } } },
      });
      return NextResponse.json({ data: serialize(row) }, { status: 201 });
    } catch (e: unknown) {
      return prismaTableMissingResponse(e, "Workspace documents table is missing.") ?? NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
