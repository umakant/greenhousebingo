import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue } from "@/lib/authz";
import { syncProjectToGantt } from "@/lib/gantt-project-sync";

export const dynamic = "force-dynamic";

function getCompanyId(a: { id: bigint; type: string | null; createdBy: bigint | null }) {
  return a.type === "company" ? a.id : (a.createdBy ?? a.id);
}

export async function POST(req: NextRequest) {
  try {
    const perms = getPermissionsFromCookieValue(req.cookies.get("pf_permissions")?.value);
    const canCreate =
      perms.includes("*") ||
      perms.includes("create-project") ||
      perms.includes("manage-project") ||
      perms.includes("manage-project-dashboard");
    if (!canCreate) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
    if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const actor = await prisma.user.findFirst({
      where: { email },
      select: { id: true, type: true, createdBy: true },
    });
    if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const companyId = getCompanyId(actor);
    const body = await req.json().catch(() => null);
    if (!body?.name) return NextResponse.json({ error: "name is required" }, { status: 400 });

    const project = await prisma.project.create({
      data: {
        name: String(body.name).trim(),
        description: body.description ? String(body.description).trim() : null,
        budget: body.budget != null && body.budget !== "" ? Number(body.budget) : null,
        startDate: body.start_date ? new Date(body.start_date) : null,
        endDate: body.end_date ? new Date(body.end_date) : null,
        status: body.status ?? "Not Started",
        creatorId: actor.id,
        createdBy: companyId,
      },
    });

    if (Array.isArray(body.member_ids) && body.member_ids.length) {
      await prisma.projectUser.createMany({
        data: body.member_ids.map((uid: number) => ({ projectId: project.id, userId: BigInt(uid) })),
        skipDuplicates: true,
      });
    }
    if (Array.isArray(body.client_ids) && body.client_ids.length) {
      await prisma.projectClient.createMany({
        data: body.client_ids.map((cid: number) => ({ projectId: project.id, clientId: BigInt(cid) })),
        skipDuplicates: true,
      });
    }

    await syncProjectToGantt(project);

    return NextResponse.json({ ok: true, id: Number(project.id) });
  } catch (e) {
    console.error("[api/project/store] POST", e);
    const message = e instanceof Error ? e.message : "Failed to create project";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
