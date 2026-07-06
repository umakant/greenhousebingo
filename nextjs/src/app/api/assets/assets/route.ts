import { NextRequest } from "next/server";
import { jsonR } from "@/lib/hrm-auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const perPage = Math.max(1, parseInt(searchParams.get("per_page") ?? "10"));
    const search = searchParams.get("search") ?? "";
    const categoryId = searchParams.get("category_id") ?? "";
    const locationId = searchParams.get("location_id") ?? "";

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { serialCode: { contains: search, mode: "insensitive" } },
      ];
    }
    if (categoryId && categoryId !== "all") where.categoryId = BigInt(categoryId);
    if (locationId && locationId !== "all") where.locationId = BigInt(locationId);

    const [data, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        include: {
          category: { select: { id: true, name: true } },
          location: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.asset.count({ where }),
    ]);

    return jsonR({ data, total, page, per_page: perPage });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to load assets" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name, category_id, purchase_date, supported_date, serial_code,
      quantity, unit_price, purchase_cost, warranty_period,
      location_id, description, image,
    } = body;

    if (!name?.trim()) {
      return jsonR({ error: "Asset name is required" }, { status: 422 });
    }

    const asset = await prisma.asset.create({
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
      },
      include: {
        category: { select: { id: true, name: true } },
        location: { select: { id: true, name: true } },
      },
    });

    return jsonR({ data: asset, message: "Asset created successfully" }, { status: 201 });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to create asset" }, { status: 500 });
  }
}
