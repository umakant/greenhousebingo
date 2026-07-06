import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, getHrmPerms, checkPerm, getCompanyId, jsonR, unauthorized, forbidden, notFound, serverError } from "@/lib/hrm-auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "manage-recruitment-system-setup", "edit-job-locations")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const { id } = await params;
    const rec = await prisma.recJobLocation.findFirst({ where: { id: BigInt(id), createdBy: cid } });
    if (!rec) return notFound();
    const body = await req.json();
    const updated = await prisma.recJobLocation.update({ where: { id: BigInt(id) }, data: { name: body.name ?? rec.name, remoteWork: body.remote_work ?? rec.remoteWork, address: body.address ?? null, city: body.city ?? null, state: body.state ?? null, country: body.country ?? null, postalCode: body.postal_code ?? null, status: body.status ?? rec.status } });
    return jsonR(updated);
  } catch (e) { console.error(e); return serverError(); }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-recruitment", "manage-recruitment-system-setup", "delete-job-locations")) return forbidden();
  try {
    const cid = getCompanyId(actor);
    const { id } = await params;
    const rec = await prisma.recJobLocation.findFirst({ where: { id: BigInt(id), createdBy: cid } });
    if (!rec) return notFound();
    await prisma.recJobLocation.delete({ where: { id: BigInt(id) } });
    return jsonR({ success: true });
  } catch (e) { console.error(e); return serverError(); }
}
