import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getHrmActor, jsonR, serverError, unauthorized, forbidden, getHrmPerms, checkPerm } from "@/lib/hrm-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const actor = await getHrmActor(req);
  if (!actor) return unauthorized();
  const perms = getHrmPerms(req);
  if (!checkPerm(perms, "manage-user")) return forbidden();

  try {
    const permissions = await prisma.permission.findMany({ orderBy: [{ addOn: "asc" }, { module: "asc" }, { id: "asc" }] });
    const data = permissions.map((p) => ({
      id: p.id.toString(),
      name: p.name,
      label: p.label,
      module: p.module,
      addOn: p.addOn,
    }));
    return jsonR({ data });
  } catch { return serverError(); }
}
