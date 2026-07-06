import { NextResponse, type NextRequest } from "next/server";

import { getPermissionsFromRequest } from "@/lib/read-user-cookies";
import {
  canReadEmWorkspace,
  prismaWorkspaceNotesTableMissingResponse,
  requireEmWorkspaceNoteDelegate,
  resolveEmWorkspaceContext,
  serializeEmWorkspaceNote,
} from "@/lib/em-workspace-notes-api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const role = req.cookies.get("pf_role")?.value;
    const perms = await getPermissionsFromRequest(req);
    if (!canReadEmWorkspace(perms, role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ctx = await resolveEmWorkspaceContext(req);
    if (!ctx.ok) return ctx.res;

    const delegate = requireEmWorkspaceNoteDelegate();
    if (!delegate.ok) return delegate.response;
    const db = delegate.emWorkspaceNote;

    const { searchParams: s } = new URL(req.url);
    const page = Math.max(1, Number(s.get("page") ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(s.get("per_page") ?? 50)));
    const skip = (page - 1) * perPage;

    const where = { organizationId: ctx.organizationId };

    try {
      const [rows, total] = await Promise.all([
        db.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip,
          take: perPage,
          include: {
            createdBy: { select: { name: true, email: true } },
          },
        }),
        db.count({ where }),
      ]);

      return NextResponse.json({
        data: rows.map(serializeEmWorkspaceNote),
        total,
        page,
        per_page: perPage,
        last_page: Math.ceil(total / perPage) || 1,
      });
    } catch (e: unknown) {
      return prismaWorkspaceNotesTableMissingResponse(e) ?? NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  } catch (e: unknown) {
    console.error("[GET /api/expense-management/workspace-notes]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const role = req.cookies.get("pf_role")?.value;
    const perms = await getPermissionsFromRequest(req);
    if (!canReadEmWorkspace(perms, role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const ctx = await resolveEmWorkspaceContext(req);
    if (!ctx.ok) return ctx.res;

    const delegate = requireEmWorkspaceNoteDelegate();
    if (!delegate.ok) return delegate.response;
    const db = delegate.emWorkspaceNote;

    const body = (await req.json().catch(() => null)) as { body?: string } | null;
    const text = (body?.body ?? "").trim();
    if (!text) {
      return NextResponse.json({ error: "Note text is required." }, { status: 400 });
    }
    if (text.length > 10000) {
      return NextResponse.json({ error: "Note is too long (max 10000 characters)." }, { status: 400 });
    }

    try {
      const row = await db.create({
        data: {
          organizationId: ctx.organizationId,
          body: text,
          createdByUserId: ctx.actor.id,
        },
        include: {
          createdBy: { select: { name: true, email: true } },
        },
      });

      return NextResponse.json({ data: serializeEmWorkspaceNote(row) }, { status: 201 });
    } catch (e: unknown) {
      return prismaWorkspaceNotesTableMissingResponse(e) ?? NextResponse.json({ error: "Server error" }, { status: 500 });
    }
  } catch (e: unknown) {
    console.error("[POST /api/expense-management/workspace-notes]", e);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
