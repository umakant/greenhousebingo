import { NextResponse, type NextRequest } from "next/server";

import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import type { EmActor } from "@/lib/em-tenant";
import {
  canManageEmWorkspace,
  canReadEmWorkspace,
  prismaWorkspaceNotesTableMissingResponse,
  requireEmWorkspaceNoteDelegate,
  resolveEmWorkspaceContext,
  serializeEmWorkspaceNote,
} from "@/lib/em-workspace-notes-api";

export const dynamic = "force-dynamic";

function canEditNote(
  perms: string[],
  role: string | undefined,
  actor: EmActor,
  createdByUserId: bigint | null,
): boolean {
  if (canManageEmWorkspace(perms, role, actor)) return true;
  return createdByUserId != null && createdByUserId === actor.id;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const role = req.cookies.get("pf_role")?.value;
    const perms = await getPermissionsFromRequest(req);
    if (!canReadEmWorkspace(perms, role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ctx = await resolveEmWorkspaceContext(req);
    if (!ctx.ok) return ctx.res;

    const { id: idRaw } = await params;
    if (!/^\d+$/.test(idRaw)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const id = BigInt(idRaw);

    const delegate = requireEmWorkspaceNoteDelegate();
    if (!delegate.ok) return delegate.response;
    const db = delegate.emWorkspaceNote;

    const body = (await req.json().catch(() => null)) as { body?: string } | null;
    const text = body?.body !== undefined ? String(body.body).trim() : "";
    if (!text) {
      return NextResponse.json({ error: "Note text is required." }, { status: 400 });
    }
    if (text.length > 10000) {
      return NextResponse.json({ error: "Note is too long (max 10000 characters)." }, { status: 400 });
    }

    try {
      const existing = await db.findFirst({
        where: { id, organizationId: ctx.organizationId },
      });
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (!canEditNote(perms, role, ctx.actor, existing.createdByUserId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const row = await db.update({
        where: { id },
        data: { body: text, updatedAt: new Date() },
        include: { createdBy: { select: { name: true, email: true } } },
      });

      return NextResponse.json({ data: serializeEmWorkspaceNote(row) });
    } catch (e: unknown) {
      return prismaWorkspaceNotesTableMissingResponse(e) ?? NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  } catch (e: unknown) {
    console.error("[PATCH /api/expense-management/workspace-notes/[id]]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const role = req.cookies.get("pf_role")?.value;
    const perms = await getPermissionsFromRequest(req);
    if (!canReadEmWorkspace(perms, role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ctx = await resolveEmWorkspaceContext(req);
    if (!ctx.ok) return ctx.res;

    const { id: idRaw } = await params;
    if (!/^\d+$/.test(idRaw)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const id = BigInt(idRaw);

    const delegate = requireEmWorkspaceNoteDelegate();
    if (!delegate.ok) return delegate.response;
    const db = delegate.emWorkspaceNote;

    try {
      const existing = await db.findFirst({
        where: { id, organizationId: ctx.organizationId },
      });
      if (!existing) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      if (!canEditNote(perms, role, ctx.actor, existing.createdByUserId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      await db.delete({ where: { id } });
      return NextResponse.json({ ok: true });
    } catch (e: unknown) {
      return prismaWorkspaceNotesTableMissingResponse(e) ?? NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  } catch (e: unknown) {
    console.error("[DELETE /api/expense-management/workspace-notes/[id]]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
