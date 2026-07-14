import "server-only";

import { readEventPlatformIntegrationsSettings } from "@/lib/event-platform/event-platform-settings";
import {
  EVENT_PLANT_CARE_LEVELS,
  type EventPlantCareLevel,
  type PlantAiDetails,
} from "@/lib/event-platform/plant-catalog/plant-catalog-types";

export class PlantAiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "PlantAiError";
    this.status = status;
  }
}

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const OPENAI_MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = `You are a horticulture expert helping populate a plant inventory for a live plant-bingo event company.
Given a plant name, return concise, accurate details as strict JSON with EXACTLY these keys:
{
  "scientificName": string,        // botanical/Latin name, empty string if unknown
  "category": string,              // e.g. "Foliage", "Succulent", "Flowering", "Cactus", "Herb", "Tropical"
  "careLevel": "Easy" | "Moderate" | "Difficult",
  "light": string,                 // e.g. "Bright indirect light"
  "water": string,                 // e.g. "Water weekly when top inch is dry"
  "petSafe": boolean,              // true if non-toxic to cats and dogs
  "description": string            // 1-2 friendly sentences suitable for a customer-facing prize card
}
Only output the JSON object. Do not include markdown fences or commentary.`;

function normalizeCareLevel(value: unknown): EventPlantCareLevel {
  const s = String(value ?? "").trim().toLowerCase();
  const match = EVENT_PLANT_CARE_LEVELS.find((level) => level.toLowerCase() === s);
  if (match) return match;
  if (s.includes("hard") || s.includes("diff")) return "Difficult";
  if (s.includes("mod") || s.includes("medium")) return "Moderate";
  return "Easy";
}

function str(value: unknown, max = 500): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

/**
 * Generate plant care details for a name via the organization's configured
 * OpenAI key. Throws {@link PlantAiError} with a user-friendly message when the
 * integration is not configured or the request fails.
 */
export async function generatePlantDetails(
  organizationId: bigint,
  name: string,
): Promise<PlantAiDetails> {
  const trimmed = name.trim();
  if (!trimmed) throw new PlantAiError("Enter a plant name first.");

  const integrations = await readEventPlatformIntegrationsSettings(organizationId);
  if (!integrations.openaiEnabled || !integrations.openaiKey) {
    throw new PlantAiError(
      "OpenAI is not configured. Enable it and add an API key under Event Platform → Integrations.",
      400,
    );
  }

  let res: Response;
  try {
    res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${integrations.openaiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Plant name: ${trimmed}` },
        ],
      }),
    });
  } catch {
    throw new PlantAiError("Could not reach OpenAI. Check your connection and try again.", 502);
  }

  if (!res.ok) {
    if (res.status === 401) throw new PlantAiError("OpenAI rejected the API key. Check it in Integrations.", 400);
    if (res.status === 429) throw new PlantAiError("OpenAI rate limit reached. Try again shortly.", 429);
    throw new PlantAiError("OpenAI request failed. Try again.", 502);
  }

  const data = (await res.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: string } }>;
  } | null;
  const content = data?.choices?.[0]?.message?.content;
  if (!content) throw new PlantAiError("OpenAI returned an empty response.", 502);

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content) as Record<string, unknown>;
  } catch {
    throw new PlantAiError("Could not parse the AI response. Try again.", 502);
  }

  return {
    scientificName: str(parsed.scientificName, 255),
    category: str(parsed.category, 128),
    careLevel: normalizeCareLevel(parsed.careLevel),
    light: str(parsed.light, 255),
    water: str(parsed.water, 255),
    petSafe: parsed.petSafe === true || String(parsed.petSafe).toLowerCase() === "true",
    description: str(parsed.description, 2000),
  };
}
