import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, jsonR, unauthorized, forbidden, notFound, serverError } from "@/lib/hrm-auth";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "manage-job-postings", "view-job-postings")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const { id } = await params;
    const rec = await prisma.recJobPosting.findFirst({
      where: { id: BigInt(id), createdBy: cid },
      include: {
        jobType: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
        candidates: { select: { id: true, firstName: true, lastName: true, status: true } },
        rounds: { orderBy: { sequenceNumber: "asc" } },
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
  if (!checkPerm(perms, "manage-recruitment", "edit-job-postings")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const { id } = await params;
    const rec = await prisma.recJobPosting.findFirst({ where: { id: BigInt(id), createdBy: cid } });
    if (!rec) return notFound();
    const body = await req.json();
    const updated = await prisma.recJobPosting.update({
      where: { id: BigInt(id) },
      data: {
        title: body.title ?? rec.title,
        position: body.position !== undefined ? (body.position ? Number(body.position) : null) : rec.position,
        priority: body.priority ?? rec.priority,
        minExperience: body.min_experience !== undefined ? (body.min_experience ? Number(body.min_experience) : null) : rec.minExperience,
        maxExperience: body.max_experience !== undefined ? (body.max_experience ? Number(body.max_experience) : null) : rec.maxExperience,
        minSalary: body.min_salary !== undefined ? (body.min_salary ? Number(body.min_salary) : null) : rec.minSalary,
        maxSalary: body.max_salary !== undefined ? (body.max_salary ? Number(body.max_salary) : null) : rec.maxSalary,
        description: body.description !== undefined ? body.description : rec.description,
        requirements: body.requirements !== undefined ? body.requirements : rec.requirements,
        skills: body.skills !== undefined ? body.skills : rec.skills,
        benefits: body.benefits !== undefined ? body.benefits : rec.benefits,
        applicationDeadline: body.application_deadline !== undefined ? body.application_deadline : rec.applicationDeadline,
        isPublished: body.is_published !== undefined ? body.is_published : rec.isPublished,
        isFeatured: body.is_featured !== undefined ? body.is_featured : rec.isFeatured,
        status: body.status ?? rec.status,
        jobTypeId: body.job_type_id !== undefined ? (body.job_type_id ? BigInt(body.job_type_id) : null) : rec.jobTypeId,
        locationId: body.location_id !== undefined ? (body.location_id ? BigInt(body.location_id) : null) : rec.locationId,
      },
    });
    return jsonR(updated);
  } catch (e) { console.error(e); return serverError(); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "delete-job-postings")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const { id } = await params;
    const rec = await prisma.recJobPosting.findFirst({ where: { id: BigInt(id), createdBy: cid } });
    if (!rec) return notFound();
    await prisma.recJobPosting.delete({ where: { id: BigInt(id) } });
    return jsonR({ success: true });
  } catch (e) { console.error(e); return serverError(); }
}
