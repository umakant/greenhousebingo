import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse, type NextRequest } from "next/server";

import { isSuperAdminSession } from "@/lib/authz";
import { getBackupDir, safeBackupFilename } from "@/lib/database-backup";

function requireSuperAdmin(req: NextRequest): { ok: true } | { ok: false; res: NextResponse } {
  if (!isSuperAdminSession(req)) {
    return { ok: false, res: NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true };
}

type RouteCtx = { params: Promise<{ name: string }> };

export async function GET(req: NextRequest, ctx: RouteCtx) {
  const authz = requireSuperAdmin(req);
  if (!authz.ok) return authz.res;

  const { name: raw } = await ctx.params;
  const safe = safeBackupFilename(decodeURIComponent(raw));
  if (!safe) {
    return NextResponse.json({ ok: false, message: "Invalid filename" }, { status: 400 });
  }

  const fp = path.join(getBackupDir(), safe);
  try {
    const buf = await fs.readFile(fp);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": "application/sql; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safe}"`,
      },
    });
  } catch {
    return NextResponse.json({ ok: false, message: "File not found" }, { status: 404 });
  }
}

export async function DELETE(req: NextRequest, ctx: RouteCtx) {
  const authz = requireSuperAdmin(req);
  if (!authz.ok) return authz.res;

  const { name: raw } = await ctx.params;
  const safe = safeBackupFilename(decodeURIComponent(raw));
  if (!safe) {
    return NextResponse.json({ ok: false, message: "Invalid filename" }, { status: 400 });
  }

  const fp = path.join(getBackupDir(), safe);
  try {
    await fs.unlink(fp);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, message: "Could not delete file" }, { status: 404 });
  }
}
