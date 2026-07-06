import fs from "node:fs/promises";
import path from "node:path";

import { NextResponse, type NextRequest } from "next/server";

import { isSuperAdminSession } from "@/lib/authz";
import {
  generateBackupFilename,
  getBackupDir,
  listBackups,
  runPgDumpToFile,
} from "@/lib/database-backup";

function requireSuperAdmin(req: NextRequest): { ok: true } | { ok: false; res: NextResponse } {
  if (!isSuperAdminSession(req)) {
    return { ok: false, res: NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 }) };
  }
  return { ok: true };
}

export async function GET(req: NextRequest) {
  const authz = requireSuperAdmin(req);
  if (!authz.ok) return authz.res;

  try {
    const backups = await listBackups();
    return NextResponse.json({ ok: true, backups });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Failed to list backups";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authz = requireSuperAdmin(req);
  if (!authz.ok) return authz.res;

  let kind: "manual" | "auto" = "manual";
  try {
    const body = (await req.json().catch(() => ({}))) as { kind?: string };
    if (body?.kind === "auto") kind = "auto";
  } catch {
    // ignore
  }

  const dir = getBackupDir();
  await fs.mkdir(dir, { recursive: true });
  const filename = generateBackupFilename(kind);
  const outPath = path.join(dir, filename);

  try {
    await runPgDumpToFile(outPath);
    const backups = await listBackups();
    return NextResponse.json({ ok: true, filename, backups });
  } catch (e: unknown) {
    try {
      await fs.unlink(outPath).catch(() => null);
    } catch {
      // ignore
    }
    const msg = e instanceof Error ? e.message : "Backup failed";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
