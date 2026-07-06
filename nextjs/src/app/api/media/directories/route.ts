import { NextResponse, type NextRequest } from "next/server";

import {
  getMediaActorFromRequest,
  requireMediaDirectoryWrite,
  requireMediaRead,
} from "@/lib/media-api-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function slugify(s: string) {
  return s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function GET(req: NextRequest) {
  const blocked = await requireMediaRead(req);
  if (blocked) return blocked;

  const { actorId, companyId } = await getMediaActorFromRequest(req);
  if (!actorId) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const ownerId = companyId ?? actorId;
  const where = { createdBy: ownerId };

  const dirs = await prisma.mediaDirectory.findMany({
    where,
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, parentId: true },
  });

  return NextResponse.json({
    ok: true,
    directories: dirs.map((d) => ({
      id: d.id.toString(),
      name: d.name,
      slug: d.slug,
      parent_id: d.parentId ? d.parentId.toString() : null,
    })),
  });
}

export async function POST(req: NextRequest) {
  const blocked = await requireMediaDirectoryWrite(req);
  if (blocked) return blocked;

  const { actorId, companyId } = await getMediaActorFromRequest(req);
  if (!actorId) return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });

  const ownerId = companyId ?? actorId;

  const body: unknown = await req.json().catch(() => null);
  const obj = (body && typeof body === "object" ? (body as Record<string, unknown>) : null) as Record<string, unknown> | null;
  const name = typeof obj?.name === "string" ? obj.name.trim() : "";
  const parentIdRaw = typeof obj?.parent_id === "string" ? obj.parent_id : null;
  if (!name) return NextResponse.json({ ok: false, message: "Name is required." }, { status: 400 });

  const slug = `${slugify(name)}-${Date.now()}`;

  const dir = await prisma.mediaDirectory.create({
    data: {
      name,
      slug,
      parentId: parentIdRaw ? BigInt(parentIdRaw) : null,
      creatorId: actorId,
      createdBy: ownerId,   // always tag to company so it appears in the company's library
      createdAt: new Date(),
    },
    select: { id: true, name: true, slug: true, parentId: true },
  });

  return NextResponse.json({
    ok: true,
    directory: {
      id: dir.id.toString(),
      name: dir.name,
      slug: dir.slug,
      parent_id: dir.parentId ? dir.parentId.toString() : null,
    },
  });
}
