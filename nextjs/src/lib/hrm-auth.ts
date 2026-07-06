import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue } from "@/lib/authz";

export function getCompanyId(a: { id: bigint; type: string | null; createdBy: bigint | null }) {
  return a.type === "company" ? a.id : (a.createdBy ?? a.id);
}

/** Users that belong to a company tenant (portal users, staff, clients, etc.). */
export function companyTenantUserWhere(companyId: bigint) {
  return {
    OR: [{ createdBy: companyId }, { creatorId: companyId }, { id: companyId }],
  };
}

export async function getHrmActor(req: NextRequest) {
  const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  if (!email) return null;
  const actor = await prisma.user.findFirst({
    where: { email },
    select: { id: true, type: true, createdBy: true },
  });
  return actor ?? null;
}

export function getHrmPerms(req: NextRequest) {
  return getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
}

export function checkPerm(perms: string[], ...allowed: string[]) {
  if (perms.includes("*")) return true;
  return allowed.some((p) => perms.includes(p));
}

/** Recursively convert BigInt values to strings for JSON serialization */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ser(v: any): any {
  if (v === null || v === undefined) return v;
  if (typeof v === "bigint") return v.toString();
  if (Array.isArray(v)) return v.map(ser);
  if (v instanceof Date) return v;
  // Prisma.Decimal serializes poorly with JSON.stringify
  if (typeof v === "object" && v.constructor?.name === "Decimal") return v.toString();
  if (typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v)) out[k] = ser(v[k]);
    return out;
  }
  return v;
}

/** Create a Next.js JSON response with BigInt-safe serialization */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function jsonR(data: any, init?: { status?: number }): NextResponse {
  return NextResponse.json(ser(data), init);
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}
export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
export function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}
export function serverError(msg?: string) {
  return NextResponse.json({ error: msg ?? "Server error" }, { status: 500 });
}
