import { NextRequest } from "next/server";
import { jsonR } from "@/lib/hrm-auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const location = await prisma.assetLocation.findUnique({
      where: { id: BigInt(id) },
      include: { parent: { select: { id: true, name: true } } },
    });
    if (!location) return jsonR({ error: "Location not found" }, { status: 404 });
    return jsonR({ data: location });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to load location" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      name, code, type, parent_id, address, city, state,
      country, postal_code, contact_person, contact_phone,
      contact_email, description, status,
    } = body;

    if (!name?.trim()) return jsonR({ error: "Name is required" }, { status: 422 });
    if (!code?.trim()) return jsonR({ error: "Code is required" }, { status: 422 });

    const location = await prisma.assetLocation.update({
      where: { id: BigInt(id) },
      data: {
        name: name.trim(),
        code: code.trim(),
        type: type ?? "Building",
        parentId: parent_id ? BigInt(parent_id) : null,
        address: address ?? null,
        city: city ?? null,
        state: state ?? null,
        country: country ?? null,
        postalCode: postal_code ?? null,
        contactPerson: contact_person ?? null,
        contactPhone: contact_phone ?? null,
        contactEmail: contact_email ?? null,
        description: description ?? null,
        status: status ?? "active",
        updatedAt: new Date(),
      },
      include: { parent: { select: { id: true, name: true } } },
    });

    return jsonR({ data: location, message: "Location updated successfully" });
  } catch (err: any) {
    console.error(err);
    if (err?.code === "P2002") {
      return jsonR({ error: "Location code must be unique" }, { status: 422 });
    }
    return jsonR({ error: "Failed to update location" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.assetLocation.delete({ where: { id: BigInt(id) } });
    return jsonR({ message: "Location deleted successfully" });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to delete location" }, { status: 500 });
  }
}
