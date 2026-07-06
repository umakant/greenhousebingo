import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Company owner id for the logged-in user (POS uses same `pf_email` cookie as the main app). */
export async function getPosCompanyId(): Promise<bigint | null> {
  const store = await cookies();
  const email = store.get("pf_email")?.value?.trim().toLowerCase();
  if (!email) return null;
  const actor = await prisma.user.findFirst({
    where: { email },
    select: { id: true, type: true, createdBy: true },
  });
  if (!actor?.id) return null;
  return actor.type === "company" ? actor.id : (actor.createdBy ?? actor.id);
}

export async function posAuth() {
  const store = await cookies();
  const role = store.get("pf_role")?.value;
  if (!role) return null;
  return role;
}

export function posOk(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function posErr(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status });
}

export function bigintReplacer(_: string, v: unknown) {
  if (typeof v === "bigint") return v.toString();
  if (v && typeof v === "object" && "toFixed" in v && "toNumber" in v) {
    return (v as unknown as { toNumber: () => number }).toNumber();
  }
  return v;
}

export function ser<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj, bigintReplacer));
}
