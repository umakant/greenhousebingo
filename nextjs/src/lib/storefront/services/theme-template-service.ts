import { prisma } from "@/lib/prisma";

/** Global marketplace preset: static HTML export (see `extract-shopify-theme` synthesis). Idempotent. */
export async function ensureConceptHtmlThemeTemplateSeeded(): Promise<void> {
  const existing = await prisma.themeTemplate.findFirst({
    where: { organizationId: null, slug: "concept-tech-html" },
    select: { id: true },
  });
  if (existing) return;
  await prisma.themeTemplate.create({
    data: {
      organizationId: null,
      name: "Concept — Tech (HTML export)",
      slug: "concept-tech-html",
      description:
        "Static HTML export (index.html + assets). On publish, Paper Flight builds a shared storefront shell (CSS + nav) plus Liquid pages for home, products, collections, search, CMS pages, blog stubs, and account links. Cart and checkout stay on the native storefront UI.",
      status: "active",
      previewUrl: "/storefront/theme-previews/rt-material.svg",
      metadata: {
        kind: "shopify_zip",
        packageFile: "/storefront/theme-packages/concept-theme.zip",
        vendor: "Concept / HTML export",
      },
    },
  });
}

/**
 * Theme presets: `organizationId` null = global marketplace template;
 * non-null = tenant-owned clone or custom preset.
 * @param includeArchived When true (e.g. superadmin managing presets), include archived rows so they can be re-activated.
 */
export async function listThemeTemplatesForOrg(
  organizationId: bigint | null,
  opts?: { includeArchived?: boolean },
) {
  const statusWhere = opts?.includeArchived ? {} : { status: { not: "archived" as const } };

  if (organizationId == null) {
    return prisma.themeTemplate.findMany({
      where: { organizationId: null, ...statusWhere },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        status: true,
        previewUrl: true,
        metadata: true,
        updatedAt: true,
        createdAt: true,
      },
    });
  }
  return prisma.themeTemplate.findMany({
    where: {
      OR: [{ organizationId: null }, { organizationId }],
      ...statusWhere,
    },
    orderBy: { name: "asc" },
    select: {
      id: true,
      organizationId: true,
      name: true,
      slug: true,
      description: true,
      status: true,
      previewUrl: true,
      metadata: true,
      updatedAt: true,
      createdAt: true,
    },
  });
}

export async function getThemeTemplateBySlugForOrg(slug: string, organizationId: bigint | null) {
  if (organizationId == null) {
    return prisma.themeTemplate.findFirst({
      where: { slug, organizationId: null },
    });
  }
  return prisma.themeTemplate.findFirst({
    where: {
      slug,
      OR: [{ organizationId: null }, { organizationId }],
    },
  });
}
