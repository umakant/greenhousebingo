import { NextRequest } from "next/server";
import { jsonR } from "@/lib/hrm-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const perPage = Math.max(1, parseInt(searchParams.get("per_page") ?? "10"));
    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status") ?? "";
    const type = searchParams.get("type") ?? "";

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ];
    }
    if (status && status !== "all") where.status = status;
    if (type && type !== "all") where.type = type;

    const [data, total] = await Promise.all([
      prisma.assetLocation.findMany({
        where,
        include: {
          parent: { select: { id: true, name: true } },
          _count: { select: { assets: true } },
        },
        orderBy: { name: "asc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.assetLocation.count({ where }),
    ]);

    return jsonR({ data, total, page, per_page: perPage });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to load locations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name, code, type, parent_id, address, city, state,
      country, postal_code, contact_person, contact_phone,
      contact_email, description, status,
    } = body;

    if (!name?.trim()) return jsonR({ error: "Name is required" }, { status: 422 });
    if (!code?.trim()) return jsonR({ error: "Code is required" }, { status: 422 });

    const location = await prisma.assetLocation.create({
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
      },
      include: { parent: { select: { id: true, name: true } } },
    });

    return jsonR({ data: location, message: "Location created successfully" }, { status: 201 });
  } catch (err: any) {
    console.error(err);
    if (err?.code === "P2002") {
      return jsonR({ error: "Location code must be unique" }, { status: 422 });
    }
    return jsonR({ error: "Failed to create location" }, { status: 500 });
  }
}
