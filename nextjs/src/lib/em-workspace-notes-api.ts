import { NextResponse } from "next/server";

import {
  canManageEmWorkspace,
  canReadEmWorkspace,
  prismaTableMissingResponse,
  resolveEmWorkspaceRequest,
} from "@/lib/em-workspace-api";
import { prisma } from "@/lib/prisma";

export {
  canManageEmWorkspace,
  canReadEmWorkspace,
  resolveEmWorkspaceRequest as resolveEmWorkspaceContext,
} from "@/lib/em-workspace-api";

export function serializeEmWorkspaceNote(row: {
  id: bigint;
  body: string;
  createdAt: Date;
  updatedAt: Date | null;
  createdByUserId: bigint | null;
  createdBy: { name: string | null; email: string | null } | null;
}) {
  const authorName =
    (row.createdBy?.name ?? "").trim() ||
    (row.createdBy?.email ?? "").trim() ||
    "Unknown";
  return {
    id: row.id.toString(),
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt?.toISOString() ?? null,
    createdByUserId: row.createdByUserId?.toString() ?? null,
    authorName,
  };
}

export function prismaWorkspaceNotesTableMissingResponse(e: unknown): NextResponse | null {
  return prismaTableMissingResponse(e, "Workspace notes table is missing.");
}

type EmWorkspaceNoteDelegate = (typeof prisma)["emWorkspaceNote"];

export function requireEmWorkspaceNoteDelegate():
  | { ok: true; emWorkspaceNote: EmWorkspaceNoteDelegate }
  | { ok: false; response: NextResponse } {
  const emWorkspaceNote = (prisma as unknown as { emWorkspaceNote?: EmWorkspaceNoteDelegate }).emWorkspaceNote;
  if (!emWorkspaceNote) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Prisma client missing EmWorkspaceNote. Run npx prisma generate and restart." },
        { status: 503 },
      ),
    };
  }
  return { ok: true, emWorkspaceNote };
}
