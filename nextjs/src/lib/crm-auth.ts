import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromRequest } from "@/lib/read-user-cookies";

export function getCompanyId(a: { id: bigint; type: string | null; createdBy: bigint | null }) {
  return a.type === "company" ? a.id : (a.createdBy ?? a.id);
}

export async function getCrmActor(req: NextRequest) {
  const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  if (!email) return null;
  const actor = await prisma.user.findFirst({
    where: { email },
    select: { id: true, type: true, createdBy: true },
  });
  return actor ?? null;
}

/** Decode permissions (including compact cookie IDs after warming the permission map). */
export async function getCrmPerms(req: NextRequest): Promise<string[]> {
  return getPermissionsFromRequest(req);
}

export function checkPerm(perms: string[], ...allowed: string[]) {
  if (perms.includes("*")) return true;
  return allowed.some((p) => perms.includes(p));
}

/** Safe BigInt from optional id fields (avoids throw on whitespace / bad strings). */
export function parseOptionalBigIntField(v: unknown): bigint | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s || s === "__none__") return null;
  try {
    return BigInt(s);
  } catch {
    return null;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ser(v: any): any {
  if (v === null || v === undefined) return v;
  if (typeof v === "bigint") return v.toString();
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(ser);
  if (typeof v === "object") {
    // Handle Prisma Decimal objects (they have a toFixed method)
    if (typeof v.toFixed === "function" && typeof v.toNumber === "function") {
      return v.toNumber();
    }
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v)) out[k] = ser(v[k]);
    return out;
  }
  return v;
}

export function jsonR(data: unknown, status = 200) {
  return NextResponse.json(ser(data), { status });
}

export function unauthorized() {
  return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ ok: false, message: "Forbidden" }, { status: 403 });
}

export function serverError(e: unknown) {
  const msg = e instanceof Error ? e.message : "Server error";
  return NextResponse.json({ ok: false, message: msg }, { status: 500 });
}
