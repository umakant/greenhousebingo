import { prisma } from "@/lib/prisma";

/**
 * Merge guest cart lines into the customer-scoped cart (Day 25).
 * Deletes the guest cart after successful merge.
 */
export async function mergeGuestCartIntoCustomerCart(params: {
  organizationId: bigint;
  websiteId: bigint;
  guestCartId: string;
  customerId: bigint;
}): Promise<{ cartId: string }> {
  const { organizationId, websiteId, guestCartId, customerId } = params;

  const guestCart = await prisma.storefrontCart.findFirst({
    where: { id: guestCartId, organizationId, websiteId },
    include: { lines: true },
  });

  if (!guestCart) {
    const existing = await prisma.storefrontCart.findFirst({
      where: { organizationId, websiteId, customerId },
    });
    return { cartId: existing?.id ?? guestCartId };
  }

  if (!guestCart.lines.length) {
    await prisma.storefrontCart.deleteMany({ where: { id: guestCart.id } }).catch(() => {});
    const existing = await prisma.storefrontCart.findFirst({
      where: { organizationId, websiteId, customerId },
    });
    if (existing) return { cartId: existing.id };
    const created = await prisma.storefrontCart.create({
      data: { organizationId, websiteId, customerId },
    });
    return { cartId: created.id };
  }

  let target = await prisma.storefrontCart.findFirst({
    where: { organizationId, websiteId, customerId },
    include: { lines: true },
  });

  await prisma.$transaction(async (tx) => {
    if (!target) {
      target = await tx.storefrontCart.create({
        data: { organizationId, websiteId, customerId },
        include: { lines: true },
      });
    }

    for (const line of guestCart.lines) {
      const existingLine = await tx.storefrontCartLine.findFirst({
        where: {
          cartId: target!.id,
          productId: line.productId,
          variantKey: line.variantKey,
        },
      });
      if (existingLine) {
        await tx.storefrontCartLine.update({
          where: { id: existingLine.id },
          data: {
            quantity: existingLine.quantity + line.quantity,
            unitPrice: line.unitPrice,
          },
        });
      } else {
        await tx.storefrontCartLine.create({
          data: {
            cartId: target!.id,
            productId: line.productId,
            variantKey: line.variantKey,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
          },
        });
      }
    }

    await tx.storefrontCartLine.deleteMany({ where: { cartId: guestCart.id } });
    await tx.storefrontCart.delete({ where: { id: guestCart.id } });
  });

  return { cartId: target!.id };
}
