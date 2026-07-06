import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getActor(req: NextRequest) {
  const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  if (!email) return null;
  return prisma.user.findFirst({ where: { email }, select: { id: true, name: true } });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const comments = await prisma.bugComment.findMany({ where: { bugId: BigInt(id) }, orderBy: { createdAt: "asc" } });
  const userIds = [...new Set(comments.map((c) => c.userId))];
  const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [];
  const userMap = Object.fromEntries(users.map((u) => [Number(u.id), u.name]));
  return NextResponse.json(comments.map((c) => ({
    id: Number(c.id), bug_id: Number(c.bugId), comment: c.comment,
    user_id: Number(c.userId), user_name: userMap[Number(c.userId)] ?? "Unknown",
    created_at: c.createdAt.toISOString(),
  })));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!req.cookies.get("pf_role")?.value) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = await getActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.comment) return NextResponse.json({ error: "comment required" }, { status: 400 });
  const comment = await prisma.bugComment.create({
    data: { bugId: BigInt(id), comment: String(body.comment).trim(), userId: actor.id },
  });
  return NextResponse.json({ ok: true, id: Number(comment.id), comment: comment.comment, user_name: actor.name, created_at: comment.createdAt.toISOString() });
}

export async function DELETE(req: NextRequest) {
  if (!req.cookies.get("pf_role")?.value) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const url = new URL(req.url);
  const commentId = url.searchParams.get("comment_id");
  if (!commentId) return NextResponse.json({ error: "comment_id required" }, { status: 400 });
  await prisma.bugComment.delete({ where: { id: BigInt(commentId) } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
