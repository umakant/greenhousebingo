import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProjectOpsContext, logProjectActivity } from "@/lib/project-operations-api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const notes = await prisma.projectNote.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
  });
  const userIds = notes.map((n) => n.userId);
  const users = userIds.length
    ? await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true },
      })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  return NextResponse.json({
    data: notes.map((n) => {
      const u = userMap.get(n.userId);
      return {
        id: Number(n.id),
        content: n.content,
        author: u?.name ?? u?.email ?? "User",
        created_at: n.createdAt.toISOString(),
      };
    }),
  });
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const projectId = BigInt(id);
  const auth = await getProjectOpsContext(req, projectId);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (!auth.canManage) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!content) return NextResponse.json({ error: "content required" }, { status: 400 });

  const note = await prisma.projectNote.create({
    data: {
      projectId,
      userId: auth.actor.id,
      content,
    },
  });

  const preview = content.length > 80 ? `${content.slice(0, 80)}…` : content;
  await logProjectActivity(projectId, auth.actor.id, auth.actor.type ?? "user", "note_add", `Added note: '${preview}'`);

  return NextResponse.json({
    data: {
      id: Number(note.id),
      content: note.content,
      author: auth.actor.name ?? auth.actor.email ?? "User",
      created_at: note.createdAt.toISOString(),
    },
  });
}
