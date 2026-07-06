import { prisma } from "@/lib/prisma";

export function slugifyCourseTitle(input: string): string {
  const s = input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "course";
}

export async function allocateUniqueCourseSlug(
  organizationId: bigint,
  baseSlug: string,
  excludeCourseId?: bigint,
): Promise<string> {
  let slug = baseSlug || "course";
  let n = 0;
  for (;;) {
    const exists = await prisma.course.findFirst({
      where: {
        organizationId,
        slug,
        ...(excludeCourseId != null ? { NOT: { id: excludeCourseId } } : {}),
      },
      select: { id: true },
    });
    if (!exists) return slug;
    n += 1;
    slug = `${baseSlug || "course"}-${n}`;
  }
}
