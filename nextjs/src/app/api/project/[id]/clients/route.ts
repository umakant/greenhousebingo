import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function getActor(req: NextRequest) {
  const email = (req.cookies.get("pf_email")?.value ?? "").trim().toLowerCase();
  if (!email) return null;
  return prisma.user.findFirst({ where: { email }, select: { id: true, type: true, createdBy: true } });
}

function getCompanyId(a: { id: bigint; type: string | null; createdBy: bigint | null }) {
  return a.type === "company" ? a.id : (a.createdBy ?? a.id);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!req.cookies.get("pf_role")?.value) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const clients = await prisma.projectClient.findMany({ where: { projectId: BigInt(id) } });
  const userIds = clients.map((c) => c.clientId);
  const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } }) : [];
  return NextResponse.json(users.map((u) => ({ id: Number(u.id), name: u.name, email: u.email })));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!req.cookies.get("pf_role")?.value) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const actor = await getActor(req);
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const companyId = getCompanyId(actor);
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.client_id) return NextResponse.json({ error: "client_id required" }, { status: 400 });

  const user = await prisma.user.findFirst({ where: { id: BigInt(body.client_id), createdBy: companyId } });
  if (!user) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  await prisma.projectClient.upsert({
    where: { projectId_clientId: { projectId: BigInt(id), clientId: BigInt(body.client_id) } },
    create: { projectId: BigInt(id), clientId: BigInt(body.client_id) },
    update: {},
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!req.cookies.get("pf_role")?.value) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const url = new URL(req.url);
  const clientId = url.searchParams.get("client_id");
  if (!clientId) return NextResponse.json({ error: "client_id required" }, { status: 400 });
  await prisma.projectClient.deleteMany({ where: { projectId: BigInt(id), clientId: BigInt(clientId) } });
  return NextResponse.json({ ok: true });
}
