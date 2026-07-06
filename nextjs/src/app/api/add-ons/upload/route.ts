import { NextResponse, type NextRequest } from "next/server";
import crypto from "node:crypto";
import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";

import { getPermissionsFromCookieValue, hasPermission } from "@/lib/authz";
import { t } from "@/lib/admin-t";


function requirePerm(req: NextRequest) {
  const role = req.cookies.get("pf_role")?.value;
  if (!role) return NextResponse.json({ ok: false, message: t("Unauthorized") }, { status: 401 });
  if (role !== "superadmin") return NextResponse.json({ ok: false, message: t("Forbidden") }, { status: 403 });

  const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
  if (!hasPermission(perms, "manage-add-on") && !perms.includes("*")) {
    return NextResponse.json({ ok: false, message: t("Forbidden") }, { status: 403 });
  }
  return null;
}

function safeExt(name: string) {
  const ext = path.extname(name ?? "").toLowerCase();
  return ext;
}

export async function POST(req: NextRequest) {
  const blocked = requirePerm(req);
  if (blocked) return blocked;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ ok: false, message: t("Invalid form data.") }, { status: 400 });

  const entries = form.getAll("files[]");
  const files = entries.filter((v): v is File => typeof v === "object" && v !== null && "arrayBuffer" in (v as any));
  if (files.length === 0) return NextResponse.json({ ok: false, message: t("No files selected.") }, { status: 400 });

  const outDir = path.join(process.cwd(), "public", "uploads", "add-ons-zips");
  await mkdir(outDir, { recursive: true });

  const saved: Array<{ original_name: string; file_name: string; size: number }> = [];

  for (const f of files) {
    const original = String(f.name ?? "upload.zip");
    const ext = safeExt(original);
    if (ext !== ".zip") {
      return NextResponse.json({ ok: false, message: t("Only .zip files are allowed.") }, { status: 400 });
    }
    const size = Number((f as any).size ?? 0);
    if (size <= 0) {
      return NextResponse.json({ ok: false, message: t("Empty file is not allowed.") }, { status: 400 });
    }
    // Basic safety limit (100MB).
    if (size > 100 * 1024 * 1024) {
      return NextResponse.json({ ok: false, message: t("File is too large (max 100MB).") }, { status: 400 });
    }

    const buf = Buffer.from(await f.arrayBuffer());
    const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}.zip`;
    await writeFile(path.join(outDir, name), buf);
    saved.push({ original_name: original, file_name: name, size });
  }

  return NextResponse.json({ ok: true, files: saved });
}

