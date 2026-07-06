import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, jsonR, unauthorized, forbidden, serverError } from "@/lib/hrm-auth";

export async function GET(req: NextRequest) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "manage-job-postings", "view-job-postings")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(searchParams.get("per_page") ?? 15)));
    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status") ?? "";
    const where: Record<string, unknown> = { createdBy: cid };
    if (search) where.title = { contains: search, mode: "insensitive" };
    if (status !== "") where.status = status;
    const [data, total] = await Promise.all([
      prisma.recJobPosting.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        include: { jobType: { select: { id: true, name: true } }, location: { select: { id: true, name: true } } },
      }),
      prisma.recJobPosting.count({ where }),
    ]);
    return jsonR({ data, total, page, per_page: perPage });
  } catch (e) { console.error(e); return serverError(); }
}

export async function POST(req: NextRequest) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "create-job-postings")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const body = await req.json();
    const code = "JP" + Date.now().toString().slice(-6);
    const postingCode = "JPC-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const rec = await prisma.recJobPosting.create({
      data: {
        code,
        postingCode,
        title: body.title ?? "",
        position: body.position ? Number(body.position) : null,
        priority: body.priority ?? "0",
        minExperience: body.min_experience ? Number(body.min_experience) : null,
        maxExperience: body.max_experience ? Number(body.max_experience) : null,
        minSalary: body.min_salary ? Number(body.min_salary) : null,
        maxSalary: body.max_salary ? Number(body.max_salary) : null,
        description: body.description ?? null,
        requirements: body.requirements ?? null,
        skills: body.skills ?? null,
        benefits: body.benefits ?? null,
        applicationDeadline: body.application_deadline ?? null,
        isPublished: body.is_published ?? false,
        isFeatured: body.is_featured ?? false,
        status: body.status ?? "0",
        jobTypeId: body.job_type_id ? BigInt(body.job_type_id) : null,
        locationId: body.location_id ? BigInt(body.location_id) : null,
        creatorId: actor.id,
        createdBy: cid,
      },
    });
    return jsonR(rec, { status: 201 });
  } catch (e) { console.error(e); return serverError(); }
}
