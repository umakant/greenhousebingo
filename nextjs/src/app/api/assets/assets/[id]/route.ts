import { NextRequest } from "next/server";
import { jsonR } from "@/lib/hrm-auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const asset = await prisma.asset.findUnique({
      where: { id: BigInt(id) },
      include: {
        category: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
    });
    if (!asset) return jsonR({ error: "Asset not found" }, { status: 404 });
    return jsonR({ data: asset });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to load asset" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      name, category_id, purchase_date, supported_date, serial_code,
      quantity, unit_price, purchase_cost, warranty_period,
      location_id, description, image,
    } = body;

    if (!name?.trim()) {
      return jsonR({ error: "Asset name is required" }, { status: 422 });
    }

    const asset = await prisma.asset.update({
      where: { id: BigInt(id) },
      data: {
        name: name.trim(),
        categoryId: category_id ? BigInt(category_id) : null,
        purchaseDate: purchase_date ? new Date(purchase_date) : null,
        supportedDate: supported_date ? new Date(supported_date) : null,
        serialCode: serial_code ?? null,
        quantity: quantity ? parseInt(quantity) : 1,
        unitPrice: unit_price ? parseFloat(unit_price) : null,
        purchaseCost: purchase_cost ? parseFloat(purchase_cost) : null,
        warrantyPeriod: warranty_period ?? null,
        locationId: location_id ? BigInt(location_id) : null,
        description: description ?? null,
        image: image ?? null,
        updatedAt: new Date(),
      },
      include: {
        category: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
    });

    return jsonR({ data: asset, message: "Asset updated successfully" });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to update asset" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.asset.delete({ where: { id: BigInt(id) } });
    return jsonR({ message: "Asset deleted successfully" });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to delete asset" }, { status: 500 });
  }
}
