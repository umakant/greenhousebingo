import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPermissionsFromCookieValue } from "@/lib/authz";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getCompanyId(actor: { id: bigint; type: string | null; createdBy: bigint | null }): bigint {
  if (actor.type === "company") return actor.id;
  return actor.createdBy ?? actor.id;
}

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const store = await req.cookies;
    const role = store.get("pf_role")?.value;
    if (!role) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const perms = getPermissionsFromCookieValue(store.get("pf_permissions")?.value);
    const canList =
      perms.includes("*") ||
      perms.includes("manage-project") ||
      perms.includes("manage-project-dashboard");
    if (!canList) {
      return NextResponse.json({
        data: [],
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0,
      });
    }

    const actorEmail = normalizeEmail(store.get("pf_email")?.value ?? "");
    if (!actorEmail) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const actor = await prisma.user.findFirst({
      where: { email: actorEmail },
      select: { id: true, type: true, createdBy: true },
    });
    if (!actor?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const companyId = getCompanyId(actor);
    const url = new URL(req.url);
    const board = url.searchParams.get("board") === "1";
    const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
    const maxPer = board ? 500 : 100;
    const perPage = Math.min(
      maxPer,
      Math.max(1, parseInt(url.searchParams.get("per_page") ?? (board ? "500" : "10"), 10) || 10),
    );
    const sort = url.searchParams.get("sort") ?? "createdAt";
    const direction = url.searchParams.get("direction") === "desc" ? "desc" : "asc";
    const search = (url.searchParams.get("search") ?? "").trim();
    const statusFilter = (url.searchParams.get("status") ?? "").trim();
    const dateFilter = (url.searchParams.get("date") ?? "").trim();

    const where: {
      createdBy: bigint;
      name?: { contains: string; mode: "insensitive" };
      status?: string;
      startDate?: { lte: Date };
      endDate?: { gte: Date };
    } = {
      createdBy: companyId,
    };
    if (search) {
      where.name = { contains: search, mode: "insensitive" };
    }
    if (statusFilter && ["Ongoing", "Finished", "Onhold", "Not Started"].includes(statusFilter)) {
      where.status = statusFilter;
    }
    if (dateFilter) {
      const d = new Date(dateFilter);
      if (!isNaN(d.getTime())) {
        where.startDate = { lte: d };
        (where as Record<string, unknown>).OR = [
          { endDate: null },
          { endDate: { gte: d } },
        ];
      }
    }

    const sortKeys = ["name", "budget", "startDate", "endDate", "status", "createdAt"] as const;
    const sortKey = sortKeys.includes(sort as (typeof sortKeys)[number]) ? sort : "createdAt";
    const orderBy = { [sortKey]: direction } as { createdAt: "asc" | "desc" };

    const [total, rows] = await Promise.all([
      prisma.project.count({ where }),
      prisma.project.findMany({
        where,
        orderBy,
        skip: (page - 1) * perPage,
        take: perPage,
        select: {
          id: true,
          name: true,
          description: true,
          budget: true,
          startDate: true,
          endDate: true,
          status: true,
          createdBy: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    // Fetch member counts from project_users and gantt_project_staff for all returned projects
    type MemberCountRow = { project_id: bigint; cnt: bigint };
    const projectIds = rows.map((r) => r.id);
    let memberCounts: MemberCountRow[] = [];
    let ganttStaffCounts: MemberCountRow[] = [];
    if (projectIds.length > 0) {
      [memberCounts, ganttStaffCounts] = await Promise.all([
        prisma.$queryRaw<MemberCountRow[]>`
          SELECT project_id, COUNT(*) AS cnt
          FROM project_users
          WHERE project_id = ANY(${projectIds}::bigint[])
          GROUP BY project_id
        `,
        prisma.$queryRaw<MemberCountRow[]>`
          SELECT gp.project_ref_id AS project_id, COUNT(DISTINCT gs.staff_id) AS cnt
          FROM gantt_project_staff gs
          JOIN gantt_projects gp ON gp.id = gs.project_id
          WHERE gp.project_ref_id = ANY(${projectIds}::bigint[])
            AND gs.label != '__deleted__'
          GROUP BY gp.project_ref_id
        `,
      ]);
    }
    const memberCountMap = new Map<string, number>(
      memberCounts.map((mc) => [String(mc.project_id), Number(mc.cnt)])
    );
    const ganttStaffMap = new Map<string, number>(
      ganttStaffCounts.map((mc) => [String(mc.project_id), Number(mc.cnt)])
    );

    type BoardExtras = {
      venue: string | null;
      location: string | null;
      agents_count: number;
      medics_count: number;
      security_count: number;
      pre_progress: number;
      project_progress: number;
      post_progress: number;
    };

    const boardExtras = new Map<string, BoardExtras>();

    if (board && projectIds.length > 0) {
      const ganttProjects = await prisma.ganttProject.findMany({
        where: { projectRefId: { in: projectIds } },
        select: { id: true, projectRefId: true, progress: true },
      });
      const ganttIdToRef = new Map(
        ganttProjects.map((g) => [g.id, g.projectRefId ? String(g.projectRefId) : null]),
      );
      const ganttIds = ganttProjects.map((g) => g.id);

      const [locations, staffRows, taskRows] = await Promise.all([
        ganttIds.length
          ? prisma.ganttProjectLocation.findMany({
              where: { projectId: { in: ganttIds } },
              orderBy: { createdAt: "asc" },
              select: { projectId: true, name: true },
            })
          : Promise.resolve([]),
        ganttIds.length
          ? prisma.ganttProjectStaff.findMany({
              where: { projectId: { in: ganttIds }, label: { not: "__deleted__" } },
              select: { projectId: true, label: true },
            })
          : Promise.resolve([]),
        prisma.projectTask.findMany({
          where: { projectId: { in: projectIds } },
          select: { projectId: true, stage: { select: { complete: true } } },
        }),
      ]);

      const venueByRef = new Map<string, string>();
      const locationByRef = new Map<string, string>();
      for (const loc of locations) {
        const ref = ganttIdToRef.get(loc.projectId);
        if (!ref || venueByRef.has(ref)) continue;
        const parts = loc.name.split(",").map((p) => p.trim()).filter(Boolean);
        venueByRef.set(ref, parts[0] ?? loc.name);
        if (parts.length > 1) locationByRef.set(ref, parts.slice(1).join(", "));
      }

      const roleCounts = new Map<string, { agents: number; medics: number; security: number }>();
      for (const row of staffRows) {
        const ref = ganttIdToRef.get(row.projectId);
        if (!ref) continue;
        const bucket = roleCounts.get(ref) ?? { agents: 0, medics: 0, security: 0 };
        const label = row.label.toLowerCase();
        if (label.includes("medic")) bucket.medics += 1;
        else if (label.includes("security")) bucket.security += 1;
        else if (label.includes("agent") || label.trim() === "") bucket.agents += 1;
        else bucket.agents += 1;
        roleCounts.set(ref, bucket);
      }

      const taskStats = new Map<string, { total: number; completed: number }>();
      for (const t of taskRows) {
        const key = String(t.projectId);
        const cur = taskStats.get(key) ?? { total: 0, completed: 0 };
        cur.total += 1;
        if (t.stage?.complete) cur.completed += 1;
        taskStats.set(key, cur);
      }

      const ganttProgress = new Map(
        ganttProjects
          .filter((g) => g.projectRefId)
          .map((g) => [String(g.projectRefId), g.progress ?? 0]),
      );

      for (const r of rows) {
        const key = String(r.id);
        const stats = taskStats.get(key);
        const taskPct =
          stats && stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
        const ganttPct = ganttProgress.get(key) ?? 0;
        const projectPct = Math.max(taskPct, ganttPct);
        const status = (r.status ?? "Not Started").toLowerCase();

        let pre = 0;
        let projectProgress = 0;
        let post = 0;
        if (status === "not started") pre = 50;
        else if (status === "ongoing") {
          pre = 100;
          projectProgress = projectPct;
        } else if (status === "onhold" || status === "on hold") {
          pre = 75;
          projectProgress = projectPct;
        } else if (status === "finished") {
          pre = 100;
          projectProgress = 100;
          post = 100;
        }

        const roles = roleCounts.get(key) ?? { agents: 0, medics: 0, security: 0 };
        const totalStaff = ganttStaffMap.get(key) ?? 0;
        if (roles.agents === 0 && roles.medics === 0 && roles.security === 0 && totalStaff > 0) {
          roles.agents = totalStaff;
        }

        boardExtras.set(key, {
          venue: venueByRef.get(key) ?? null,
          location: locationByRef.get(key) ?? null,
          agents_count: roles.agents,
          medics_count: roles.medics,
          security_count: roles.security,
          pre_progress: pre,
          project_progress: projectProgress,
          post_progress: post,
        });
      }
    }

    const data = rows.map((r) => {
      const key = String(r.id);
      const base = {
      id: Number(r.id),
      name: r.name,
      description: r.description ?? null,
      budget: r.budget != null ? Number(r.budget) : null,
      start_date: r.startDate?.toISOString().slice(0, 10) ?? null,
      end_date: r.endDate?.toISOString().slice(0, 10) ?? null,
      status: r.status ?? null,
      created_by: r.createdBy != null ? Number(r.createdBy) : null,
      created_at: r.createdAt?.toISOString() ?? null,
      updated_at: r.updatedAt?.toISOString() ?? null,
        users_count: (memberCountMap.get(key) ?? 0) + (ganttStaffMap.get(key) ?? 0),
      };
      if (!board) return base;
      const extras = boardExtras.get(key);
      return {
        ...base,
        venue: extras?.venue ?? null,
        location: extras?.location ?? null,
        agents_count: extras?.agents_count ?? 0,
        medics_count: extras?.medics_count ?? 0,
        security_count: extras?.security_count ?? 0,
        pre_progress: extras?.pre_progress ?? 0,
        project_progress: extras?.project_progress ?? 0,
        post_progress: extras?.post_progress ?? 0,
      };
    });

    return NextResponse.json({
      data,
      current_page: page,
      last_page: Math.ceil(total / perPage) || 1,
      per_page: perPage,
      total,
    });
  } catch (e) {
    console.error("Project list error:", e);
    return NextResponse.json(
      { data: [], current_page: 1, last_page: 1, per_page: 10, total: 0 },
      { status: 200 }
    );
  }
}
