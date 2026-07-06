import { NextRequest } from "next/server";
import { jsonR } from "@/lib/hrm-auth";
import { prisma } from "@/lib/prisma";

function calcDepreciation(asset: any, dep: any) {
  const cost = parseFloat(asset.purchaseCost ?? "0");
  const salvage = parseFloat(dep.salvageValue ?? "0");
  const usefulLife = dep.usefulLife || 5;
  const startDate = new Date(dep.startDate);
  const now = new Date();
  const yearsElapsed = Math.max(0, (now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365));

  let annualDepreciation = 0;
  let accumulated = 0;
  let bookValue = cost;

  if (dep.method === "Declining Balance") {
    const rate = 2 / usefulLife;
    annualDepreciation = cost * rate;
    accumulated = Math.min(cost - salvage, cost * (1 - Math.pow(1 - rate, yearsElapsed)));
    bookValue = Math.max(salvage, cost - accumulated);
  } else {
    annualDepreciation = (cost - salvage) / usefulLife;
    accumulated = Math.min(cost - salvage, annualDepreciation * yearsElapsed);
    bookValue = Math.max(salvage, cost - accumulated);
  }

  return {
    annualDepreciation: parseFloat(annualDepreciation.toFixed(2)),
    accumulated: parseFloat(accumulated.toFixed(2)),
    bookValue: parseFloat(bookValue.toFixed(2)),
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const perPage = Math.max(1, parseInt(searchParams.get("per_page") ?? "10"));
    const search = searchParams.get("search") ?? "";
    const status = searchParams.get("status") ?? "";

    const where: any = {};
    if (search) where.asset = { name: { contains: search, mode: "insensitive" } };
    if (status && status !== "all") where.status = status;

    const [items, total] = await Promise.all([
      prisma.assetDepreciation.findMany({
        where,
        include: { asset: { select: { id: true, name: true, purchaseCost: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
      }),
      prisma.assetDepreciation.count({ where }),
    ]);

    const data = items.map((dep) => ({
      ...dep,
      ...calcDepreciation(dep.asset, dep),
    }));

    return jsonR({ data, total, page, per_page: perPage });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to load depreciation records" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { asset_id, method, useful_life, salvage_value, start_date, notes, status } = body;

    if (!asset_id) return jsonR({ error: "Asset is required" }, { status: 422 });
    if (!start_date) return jsonR({ error: "Start date is required" }, { status: 422 });

    const record = await prisma.assetDepreciation.create({
      data: {
        assetId: BigInt(asset_id),
        method: method ?? "Straight Line",
        usefulLife: useful_life ? parseInt(useful_life) : 5,
        salvageValue: salvage_value ? parseFloat(salvage_value) : 0,
        startDate: new Date(start_date),
        notes: notes ?? null,
        status: status ?? "active",
      },
      include: { asset: { select: { id: true, name: true, purchaseCost: true } } },
    });

    return jsonR({
      data: { ...record, ...calcDepreciation(record.asset, record) },
      message: "Depreciation record created successfully",
    }, { status: 201 });
  } catch (err) {
    console.error(err);
    return jsonR({ error: "Failed to create depreciation record" }, { status: 500 });
  }
}
