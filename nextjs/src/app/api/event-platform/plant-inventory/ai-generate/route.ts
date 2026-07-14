import { NextRequest, NextResponse } from "next/server";

import {
  isEventPlatformApiError,
  requireEventPlatformApi,
} from "@/lib/event-platform/event-platform-api-auth";
import { generatePlantDetails, PlantAiError } from "@/lib/event-platform/plant-catalog/plant-ai";
import { plantAiGenerateSchema } from "@/lib/event-platform/plant-catalog/plant-catalog-schemas";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const actor = await requireEventPlatformApi(req, "plantCatalog.manage");
  if (isEventPlatformApiError(actor)) return actor;
  try {
    const body = await req.json().catch(() => null);
    const parsed = plantAiGenerateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, message: parsed.error.issues[0]?.message ?? "Invalid input." },
        { status: 400 },
      );
    }

    const details = await generatePlantDetails(actor.organizationId, parsed.data.name);
    return NextResponse.json({ ok: true, details });
  } catch (e: unknown) {
    if (e instanceof PlantAiError) {
      return NextResponse.json({ ok: false, message: e.message }, { status: e.status });
    }
    const message = e instanceof Error ? e.message : "Generation failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
