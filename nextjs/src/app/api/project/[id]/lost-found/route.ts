import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProjectOpsContext, logProjectActivity } from "@/lib/project-operations-api";

export const dynamic = "force-dynamic";

function serialize(row: {
  id: bigint;
  itemName: string;
  description: string | null;
  foundDate: Date | null;
  foundLocation: string | null;
  foundByUserId: bigint | null;
  status: string;
  notes: string | null;
  photoPath: string | null;
  createdAt: Date;
}, foundByName?: string) {
  return {
    id: Number(row.id),
    item_name: row.itemName,
    description: row.description,
    found_date: row.foundDate?.toISOString().slice(0, 10) ?? null,
    found_location: row.foundLocation,
    found_by_user_id: row.foundByUserId != null ? Number(row.foundByUserId) : null,
    found_by_name: foundByName ?? null,
    status: row.status,
    notes: row.notes,
    photo_path: row.photoPath,
    created_at: row.createdAt.toISOString(),
  };
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const rows = await prisma.projectLostFoundItem.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
  const userIds = rows.map((r) => r.foundByUserId).filter((u): u is bigint => u != null);
  const users = userIds.length
    ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  return NextResponse.json({
    data: rows.map((r) => {
      const u = r.foundByUserId ? userMap.get(r.foundByUserId) : undefined;
      return serialize(r, u?.name ?? u?.email ?? undefined);
    }),
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const contentType = req.headers.get("content-type") ?? "";
  let body: Record<string, unknown> = {};
  let photoPath: string | null = null;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    body = {
      item_name: form.get("item_name"),
      description: form.get("description"),
      found_date: form.get("found_date"),
      found_location: form.get("found_location"),
      found_by_user_id: form.get("found_by_user_id"),
      status: form.get("status"),
      notes: form.get("notes"),
    };
    const photo = form.get("photo");
    if (photo && photo instanceof File && photo.size > 0) {
      const buf = Buffer.from(await photo.arrayBuffer());
      const ext = path.extname(photo.name) || ".jpg";
      const stored = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`;
      const relDir = path.join("uploads", "projects", id, "lost-found");
      const absDir = path.join(process.cwd(), "public", relDir);
      await mkdir(absDir, { recursive: true });
      await writeFile(path.join(absDir, stored), buf);
      photoPath = `/${relDir.replace(/\\/g, "/")}/${stored}`;
    }
  } else {
    body = (await req.json().catch(() => null)) ?? {};
  }

  const itemName = typeof body.item_name === "string" ? body.item_name.trim() : "";
  if (!itemName) return NextResponse.json({ error: "item_name required" }, { status: 400 });

  const foundDate = body.found_date ? new Date(String(body.found_date)) : null;
  const foundById = body.found_by_user_id != null ? Number(body.found_by_user_id) : null;

  const row = await prisma.projectLostFoundItem.create({
    data: {
      projectId,
      itemName,
      description: typeof body.description === "string" ? body.description : null,
      foundDate: foundDate && !Number.isNaN(foundDate.getTime()) ? foundDate : null,
      foundLocation: typeof body.found_location === "string" ? body.found_location : null,
      foundByUserId: foundById && Number.isFinite(foundById) ? BigInt(foundById) : null,
      status: typeof body.status === "string" ? body.status : "unclaimed",
      notes: typeof body.notes === "string" ? body.notes : null,
      photoPath,
    },
  });

  await logProjectActivity(projectId, auth.actor.id, auth.actor.type ?? "user", "lost_found", `Logged lost & found item: ${itemName}`);
  return NextResponse.json({ data: serialize(row) });
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const itemId = req.nextUrl.searchParams.get("id");
  if (!itemId) return NextResponse.json({ error: "id required" }, { status: 400 });

  const row = await prisma.projectLostFoundItem.findFirst({ where: { id: BigInt(itemId), projectId } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.projectLostFoundItem.delete({ where: { id: row.id } });
  if (row.photoPath) {
    try {
      await unlink(path.join(process.cwd(), "public", row.photoPath.replace(/^\//, "")));
    } catch {
      // ignore
    }
  }
  return NextResponse.json({ ok: true });
}
