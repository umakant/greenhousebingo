import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmPerms, checkPerm, forbidden, serverError, jsonR } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-resume-builder", "view-resumes")) return forbidden();

  try {
    const rows = await prisma.resumeTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, description: true, thumbnail: true },
    });
    return jsonR({ data: rows.map(r => ({ ...r, id: r.id.toString() })) });
  } catch { return serverError(); }
}
