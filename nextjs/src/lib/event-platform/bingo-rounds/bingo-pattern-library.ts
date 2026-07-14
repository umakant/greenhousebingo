import {
  LMS_EVENT_BINGO_DIFFICULTIES,
  type LmsEventBingoDifficulty,
} from "@/lib/lms-events/event-detail-content";

export type BingoPatternTemplate = { name: string; pattern: string };

export type RandomizedBingoRound = {
  name: string;
  pattern: string;
  difficulty: LmsEventBingoDifficulty;
};

/**
 * Curated bingo patterns grouped by difficulty. The randomizer draws from these
 * pools so operators can bulk-generate a balanced game schedule. Easy rounds are
 * quick single-line wins; Epic rounds are marquee finale-style games.
 */
export const BINGO_PATTERN_LIBRARY: Record<LmsEventBingoDifficulty, BingoPatternTemplate[]> = {
  Easy: [
    { name: "Traditional Bingo", pattern: "Any line — horizontal, vertical, or diagonal" },
    { name: "Four Corners", pattern: "Mark all four corner squares" },
    { name: "Postage Stamp", pattern: "2x2 block in any corner" },
    { name: "Single Line", pattern: "Any one complete horizontal line" },
    { name: "Top Row", pattern: "Complete the entire top row" },
    { name: "Bottom Row", pattern: "Complete the entire bottom row" },
    { name: "Center Cross", pattern: "Mark the free space plus its four neighbors" },
  ],
  Medium: [
    { name: "Letter X", pattern: "Both diagonals form an X" },
    { name: "Picture Frame", pattern: "Complete the outer border" },
    { name: "Double Bingo", pattern: "Two complete winning lines" },
    { name: "Letter T", pattern: "Top row plus the center column" },
    { name: "Plus Sign", pattern: "Center row and center column" },
    { name: "Diamond", pattern: "Diamond shape around the center" },
    { name: "Checkmark", pattern: "Short up-stroke and long down-stroke checkmark" },
  ],
  Hard: [
    { name: "Blackout", pattern: "Cover the entire card" },
    { name: "Lucky Leaf Pattern", pattern: "Leaf-shaped pattern on the card" },
    { name: "Crazy Garden Pattern", pattern: "Surprise pattern revealed live" },
    { name: "Six Pack", pattern: "Any 2x3 block of six squares" },
    { name: "Layer Cake", pattern: "Top row, center row, and bottom row" },
    { name: "Kite", pattern: "Diamond in a corner with a diagonal tail" },
  ],
  Epic: [
    { name: "Wild Card Finale", pattern: "Winner picks any prize on the floor" },
    { name: "Full House Blackout", pattern: "Entire card with a live bonus twist" },
    { name: "Double Blackout", pattern: "First to cover two cards" },
    { name: "Coverall Sprint", pattern: "Blackout under a live time limit" },
  ],
};

function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Pick `count` templates for a difficulty. Draws without replacement first; if
 * more rounds are requested than unique patterns exist, it wraps around and
 * appends a repeat suffix so round names stay readable.
 */
function pickTemplates(difficulty: LmsEventBingoDifficulty, count: number): BingoPatternTemplate[] {
  const pool = BINGO_PATTERN_LIBRARY[difficulty];
  if (count <= 0 || pool.length === 0) return [];
  const picked: BingoPatternTemplate[] = [];
  let shuffled = shuffle(pool);
  let cursor = 0;
  let cycle = 1;
  for (let i = 0; i < count; i += 1) {
    if (cursor >= shuffled.length) {
      shuffled = shuffle(pool);
      cursor = 0;
      cycle += 1;
    }
    const template = shuffled[cursor];
    cursor += 1;
    picked.push({
      name: cycle > 1 ? `${template.name} (${cycle})` : template.name,
      pattern: template.pattern,
    });
  }
  return picked;
}

/**
 * Build a randomized set of rounds from a per-difficulty count plan. Rounds are
 * ordered Easy → Epic so the event ramps up toward a big finale.
 */
export function randomizeBingoRounds(
  plan: Partial<Record<LmsEventBingoDifficulty, number>>,
): RandomizedBingoRound[] {
  const rounds: RandomizedBingoRound[] = [];
  for (const difficulty of LMS_EVENT_BINGO_DIFFICULTIES) {
    const count = Math.max(0, Math.floor(plan[difficulty] ?? 0));
    for (const template of pickTemplates(difficulty, count)) {
      rounds.push({ name: template.name, pattern: template.pattern, difficulty });
    }
  }
  return rounds;
}
