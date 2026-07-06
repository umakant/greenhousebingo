import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, jsonR, unauthorized, forbidden, notFound, serverError } from "@/lib/hrm-auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "manage-candidates", "view-candidates")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const { id } = await params;
    const rec = await prisma.recCandidate.findFirst({
      where: { id: BigInt(id), createdBy: cid },
      include: {
        job: { select: { id: true, title: true } },
        source: { select: { id: true, name: true } },
        interviews: { include: { round: true, interviewType: true } },
        assessments: true,
        offers: true,
      },
    });
    if (!rec) return notFound();
    return jsonR(rec);
  } catch (e) { console.error(e); return serverError(); }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "edit-candidates")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const { id } = await params;
    const rec = await prisma.recCandidate.findFirst({ where: { id: BigInt(id), createdBy: cid } });
    if (!rec) return notFound();
    const body = await req.json();
    const updated = await prisma.recCandidate.update({
      where: { id: BigInt(id) },
      data: {
        firstName: body.first_name ?? rec.firstName,
        lastName: body.last_name ?? rec.lastName,
        email: body.email ?? rec.email,
        phone: body.phone !== undefined ? body.phone : rec.phone,
        gender: body.gender !== undefined ? body.gender : rec.gender,
        country: body.country !== undefined ? body.country : rec.country,
        state: body.state !== undefined ? body.state : rec.state,
        city: body.city !== undefined ? body.city : rec.city,
        currentCompany: body.current_company !== undefined ? body.current_company : rec.currentCompany,
        currentPosition: body.current_position !== undefined ? body.current_position : rec.currentPosition,
        experienceYears: body.experience_years !== undefined ? (body.experience_years ? Number(body.experience_years) : null) : rec.experienceYears,
        currentSalary: body.current_salary !== undefined ? (body.current_salary ? Number(body.current_salary) : null) : rec.currentSalary,
        expectedSalary: body.expected_salary !== undefined ? (body.expected_salary ? Number(body.expected_salary) : null) : rec.expectedSalary,
        noticePeriod: body.notice_period !== undefined ? body.notice_period : rec.noticePeriod,
        skills: body.skills !== undefined ? body.skills : rec.skills,
        education: body.education !== undefined ? body.education : rec.education,
        portfolioUrl: body.portfolio_url !== undefined ? body.portfolio_url : rec.portfolioUrl,
        linkedinUrl: body.linkedin_url !== undefined ? body.linkedin_url : rec.linkedinUrl,
        status: body.status ?? rec.status,
        jobId: body.job_id !== undefined ? (body.job_id ? BigInt(body.job_id) : null) : rec.jobId,
        sourceId: body.source_id !== undefined ? (body.source_id ? BigInt(body.source_id) : null) : rec.sourceId,
      },
    });
    return jsonR(updated);
  } catch (e) { console.error(e); return serverError(); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "delete-candidates")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const { id } = await params;
    const rec = await prisma.recCandidate.findFirst({ where: { id: BigInt(id), createdBy: cid } });
    if (!rec) return notFound();
    await prisma.recCandidate.delete({ where: { id: BigInt(id) } });
    return jsonR({ success: true });
  } catch (e) { console.error(e); return serverError(); }
}
