/** Delimiter between threaded replies stored in `StTicket.description`. */
export const LMS_TICKET_REPLY_DELIMITER = "\n\n---\n\n";

export type LmsTicketThreadEntry = {
  at: string;
  author: string;
  role: "student" | "instructor" | "staff";
  body: string;
};

const ENTRY_RE =
  /^\[([^\]]+)\]\s+(.+?)\s+\((student|instructor|staff)\):\n([\s\S]*)$/m;

export function formatLmsTicketReplyEntry(entry: {
  at: Date;
  author: string;
  role: LmsTicketThreadEntry["role"];
  body: string;
}): string {
  return `[${entry.at.toISOString()}] ${entry.author} (${entry.role}):\n${entry.body.trim()}`;
}

export function appendLmsTicketReply(
  existing: string | null | undefined,
  entry: Parameters<typeof formatLmsTicketReplyEntry>[0],
): string {
  const block = formatLmsTicketReplyEntry(entry);
  const base = existing?.trim();
  return base ? `${base}${LMS_TICKET_REPLY_DELIMITER}${block}` : block;
}

export function parseLmsTicketThread(description: string | null | undefined): LmsTicketThreadEntry[] {
  if (!description?.trim()) return [];
  const parts = description.split(LMS_TICKET_REPLY_DELIMITER);
  const out: LmsTicketThreadEntry[] = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const m = trimmed.match(ENTRY_RE);
    if (m) {
      out.push({
        at: m[1],
        author: m[2].trim(),
        role: m[3] as LmsTicketThreadEntry["role"],
        body: m[4].trim(),
      });
    } else {
      out.push({
        at: "",
        author: "Original",
        role: "student",
        body: trimmed,
      });
    }
  }
  return out;
}
