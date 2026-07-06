import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, jsonR, unauthorized, forbidden, serverError } from "@/lib/hrm-auth";

export async function GET(req: NextRequest) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "manage-candidates", "view-candidates")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const perPage = Math.min(100, Math.max(1, Number(searchParams.get("per_page") ?? 15)));
    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status") ?? "";
    const jobId = searchParams.get("job_id") ?? "";
    const where: Record<string, unknown> = { createdBy: cid };
    if (search) where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
    if (status !== "") where.status = status;
    if (jobId) where.jobId = BigInt(jobId);
    const [data, total] = await Promise.all([
      prisma.recCandidate.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          job: { select: { id: true, title: true } },
          source: { select: { id: true, name: true } },
        },
      }),
      prisma.recCandidate.count({ where }),
    ]);
    return jsonR({ data, total, page, per_page: perPage });
  } catch (e) { console.error(e); return serverError(); }
}

export async function POST(req: NextRequest) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "create-candidates")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const body = await req.json();
    const trackingId = "CND-" + Math.random().toString(36).substring(2, 8).toUpperCase();
    const rec = await prisma.recCandidate.create({
      data: {
        trackingId,
        firstName: body.first_name ?? "",
        lastName: body.last_name ?? "",
        email: body.email ?? "",
        phone: body.phone ?? null,
        gender: body.gender ?? null,
        country: body.country ?? null,
        state: body.state ?? null,
        city: body.city ?? null,
        currentCompany: body.current_company ?? null,
        currentPosition: body.current_position ?? null,
        experienceYears: body.experience_years ? Number(body.experience_years) : null,
        currentSalary: body.current_salary ? Number(body.current_salary) : null,
        expectedSalary: body.expected_salary ? Number(body.expected_salary) : null,
        noticePeriod: body.notice_period ?? null,
        skills: body.skills ?? null,
        education: body.education ?? null,
        portfolioUrl: body.portfolio_url ?? null,
        linkedinUrl: body.linkedin_url ?? null,
        status: body.status ?? "0",
        applicationDate: body.application_date ? new Date(body.application_date) : new Date(),
        jobId: body.job_id ? BigInt(body.job_id) : null,
        sourceId: body.source_id ? BigInt(body.source_id) : null,
        creatorId: actor.id,
        createdBy: cid,
      },
    });
    return jsonR(rec, { status: 201 });
  } catch (e) { console.error(e); return serverError(); }
}
