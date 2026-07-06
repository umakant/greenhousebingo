import type { Course, CourseCategory, InstructorProfile, PosProduct, User } from "@prisma/client";

export type LmsCourseSerializeInput = Course & {
  category: Pick<CourseCategory, "id" | "name" | "slug"> | null;
  linkedPosProduct: Pick<PosProduct, "id" | "name" | "price" | "sku" | "slug"> | null;
  instructors: Array<{
    id: bigint;
    instructorProfileId: bigint;
    role: string | null;
    isPrimary: boolean;
    instructorProfile: Pick<InstructorProfile, "id" | "displayName"> & {
      user: Pick<User, "id" | "name" | "email"> | null;
    };
  }>;
  _count: { enrollments: number };
};

export function serializeLmsCourse(c: LmsCourseSerializeInput) {
  return {
    id: c.id.toString(),
    organizationId: c.organizationId.toString(),
    categoryId: c.categoryId?.toString() ?? null,
    category: c.category
      ? { id: c.category.id.toString(), name: c.category.name, slug: c.category.slug }
      : null,
    title: c.title,
    slug: c.slug,
    description: c.description,
    deliveryType: c.deliveryType,
    isPublic: c.isPublic,
    capacity: c.capacity,
    accessStartsAt: c.accessStartsAt?.toISOString() ?? null,
    accessEndsAt: c.accessEndsAt?.toISOString() ?? null,
    status: c.status,
    coverImageUrl: c.coverImageUrl,
    videoEmbedUrl: c.videoEmbedUrl,
    pdfDocumentUrl: c.pdfDocumentUrl,
    salePrice: c.salePrice != null ? c.salePrice.toString() : null,
    saleCurrency: c.saleCurrency,
    linkedPosProductId: c.linkedPosProductId?.toString() ?? null,
    linkedPosProduct: c.linkedPosProduct
      ? {
          id: c.linkedPosProduct.id.toString(),
          name: c.linkedPosProduct.name,
          sku: c.linkedPosProduct.sku,
          slug: c.linkedPosProduct.slug,
          price: c.linkedPosProduct.price != null ? c.linkedPosProduct.price.toString() : null,
        }
      : null,
    enrollmentCount: c._count.enrollments,
    instructors: c.instructors.map((l) => ({
      id: l.id.toString(),
      instructorProfileId: l.instructorProfileId.toString(),
      role: l.role,
      isPrimary: l.isPrimary,
      profile: {
        displayName: l.instructorProfile.displayName,
        user: l.instructorProfile.user
          ? {
              id: l.instructorProfile.user.id.toString(),
              name: l.instructorProfile.user.name,
              email: l.instructorProfile.user.email,
            }
          : null,
      },
    })),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt?.toISOString() ?? null,
  };
}
