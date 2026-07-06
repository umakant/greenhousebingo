import { prisma } from "@/lib/prisma";

/** Display label for the user who created an expense line. */
export function formatEmSubmitterName(name: string | null | undefined, email: string | null | undefined): string {
  const n = (name ?? "").trim();
  if (n) return n;
  const e = (email ?? "").trim();
  return e || "—";
}

export async function loadEmSubmitterNameByUserId(userIds: Array<bigint | null | undefined>): Promise<Map<string, string>> {
  const unique = [...new Set(userIds.filter((id): id is bigint => id != null))];
  const out = new Map<string, string>();
  if (!unique.length) return out;

  const users = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, name: true, email: true },
  });

  for (const u of users) {
    out.set(u.id.toString(), formatEmSubmitterName(u.name, u.email));
  }
  return out;
}

export function emSubmitterNameForLine(
  createdByUserId: bigint | null | undefined,
  nameByUserId: Map<string, string>,
): string {
  if (createdByUserId == null) return "—";
  return nameByUserId.get(createdByUserId.toString()) ?? "—";
}
