import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue } from "@/lib/authz";

export const dynamic = "force-dynamic";

function getCompanyId(a: { id: bigint; type: string | null; createdBy: bigint | null }) {
  return a.type === "company" ? a.id : (a.createdBy ?? a.id);
}

async function getActor(req: NextRequest) {
  const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  if (!email) return null;
  return prisma.user.findFirst({ where: { email }, select: { id: true, type: true, createdBy: true } });
}

export async function GET(req: NextRequest) {
  try {
    if (!req.cookies.get("pf_role")?.value) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const actor = await getActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const companyId = getCompanyId(actor);

    const url = new URL(req.url);
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1") || 1);
    const perPage = Math.min(100, Math.max(1, parseInt(url.searchParams.get("per_page") ?? "20") || 20));
    const projectId = url.searchParams.get("project_id");
    const stageId = url.searchParams.get("stage_id");
    const priority = url.searchParams.get("priority");
    const search = (url.searchParams.get("search") ?? "").trim();

    const where: Record<string, unknown> = { createdBy: companyId };
    if (projectId) where.projectId = BigInt(projectId);
    if (stageId) where.stageId = BigInt(stageId);
    if (priority) where.priority = priority;
    if (search) where.title = { contains: search, mode: "insensitive" };

    const [total, bugs] = await Promise.all([
      prisma.projectBug.count({ where }),
      prisma.projectBug.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          stage: { select: { id: true, name: true, color: true } },
          _count: { select: { comments: true } },
        },
      }),
    ]);

    const assignedUserIds = [...new Set(bugs.flatMap((b) => {
      if (!b.assignedTo) return [];
      return (Array.isArray(b.assignedTo) ? b.assignedTo : []).map(Number).filter(Boolean);
    }))];
    const users = assignedUserIds.length
      ? await prisma.user.findMany({ where: { id: { in: assignedUserIds.map(BigInt) } }, select: { id: true, name: true } })
      : [];
    const userMap = Object.fromEntries(users.map((u) => [Number(u.id), u.name]));

    const data = bugs.map((b) => {
      const assignedTo: number[] = Array.isArray(b.assignedTo) ? (b.assignedTo as number[]).map(Number) : [];
      return {
        id: Number(b.id),
        project_id: Number(b.projectId),
        title: b.title,
        priority: b.priority,
        assigned_to: assignedTo,
        assigned_users: assignedTo.map((uid) => ({ id: uid, name: userMap[uid] ?? "Unknown" })),
        stage_id: b.stageId ? Number(b.stageId) : null,
        stage: b.stage ? { id: Number(b.stage.id), name: b.stage.name, color: b.stage.color } : null,
        description: b.description,
        comment_count: b._count.comments,
        created_at: b.createdAt.toISOString(),
      };
    });

    return NextResponse.json({ data, total, current_page: page, last_page: Math.max(1, Math.ceil(total / perPage)), per_page: perPage });
  } catch (e) {
    console.error("[api/project/bugs] GET", e);
    const message = e instanceof Error ? e.message : "Failed to load bugs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function canCreateBug(perms: string[]) {
  return (
    perms.includes("*") ||
    perms.includes("manage-project") ||
    perms.includes("manage-project-dashboard") ||
    perms.includes("create-project-bug")
  );
}

export async function POST(req: NextRequest) {
  try {
    const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
    if (!canCreateBug(perms)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const actor = await getActor(req);
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const companyId = getCompanyId(actor);
    const body = await req.json().catch(() => null);
    if (!body?.project_id || !body?.title) {
      return NextResponse.json({ error: "project_id and title required" }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: { id: BigInt(body.project_id), createdBy: companyId },
      select: { id: true },
    });
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const bug = await prisma.projectBug.create({
      data: {
        projectId: BigInt(body.project_id),
        title: String(body.title).trim(),
        priority: ["High", "Medium", "Low"].includes(body.priority) ? body.priority : "Medium",
        assignedTo: Array.isArray(body.assigned_to) ? body.assigned_to.map(Number) : [],
        stageId: body.stage_id ? BigInt(body.stage_id) : null,
        description: body.description ? String(body.description).trim() : null,
        creatorId: actor.id,
        createdBy: companyId,
      },
    });
    return NextResponse.json({ ok: true, id: Number(bug.id) });
  } catch (e) {
    console.error("[api/project/bugs] POST", e);
    const message = e instanceof Error ? e.message : "Failed to create bug";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
