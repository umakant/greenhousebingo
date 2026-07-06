import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import {
  parseResourceBody,
  requireSuperadminResourcesAccess,
  serializeSuperadminResource,
} from "@/lib/superadmin-resources";

export const dynamic = "force-dynamic";

function parseId(raw: string): bigint | null {
  try {
    return BigInt(raw);
  } catch {
    return null;
  }
}

async function loadAddedBy(addedById: bigint | null) {
  if (!addedById) return null;
  const u = await prisma.user.findUnique({
    where: { id: addedById },
    select: { id: true, name: true, email: true },
  });
  if (!u) return null;
  return {
    id: u.id.toString(),
    name: u.name?.trim() || u.email || "User",
    email: u.email,
  };
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!requireSuperadminResourcesAccess(req)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const { id: rawId } = await ctx.params;
  const id = parseId(rawId);
  if (id == null) {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, message: "Invalid JSON." }, { status: 400 });
  }

  const existing = await prisma.superadminResource.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }

  if (body && typeof body === "object" && "isFavorite" in body && Object.keys(body).length === 1) {
    const isFavorite = (body as { isFavorite?: unknown }).isFavorite === true;
    const updated = await prisma.superadminResource.update({
      where: { id },
      data: { isFavorite },
    });
    const addedBy = await loadAddedBy(updated.addedById);
    return NextResponse.json({ ok: true, item: serializeSuperadminResource(updated, addedBy) });
  }

  const parsed = parseResourceBody(body);
  if ("error" in parsed) {
    return NextResponse.json({ ok: false, message: parsed.error }, { status: 400 });
  }

  const updated = await prisma.superadminResource.update({
    where: { id },
    data: parsed,
  });
  const addedBy = await loadAddedBy(updated.addedById);

  return NextResponse.json({ ok: true, item: serializeSuperadminResource(updated, addedBy) });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  if (!requireSuperadminResourcesAccess(req)) {
    return NextResponse.json({ ok: false, message: "Forbidden." }, { status: 403 });
  }

  const { id: rawId } = await ctx.params;
  const id = parseId(rawId);
  if (id == null) {
    return NextResponse.json({ ok: false, message: "Invalid id." }, { status: 400 });
  }

  const del = await prisma.superadminResource.deleteMany({ where: { id } });
  if (del.count === 0) {
    return NextResponse.json({ ok: false, message: "Not found." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
