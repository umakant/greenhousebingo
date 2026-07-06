import crypto from "node:crypto";

type EmailVerificationEntry = {
  userId: bigint;
  email: string;
  expiresAt: number;
};

const GLOBAL_KEY = "__emailVerificationTokens_v1" as const;

function getStore(): Map<string, EmailVerificationEntry> {
  const g = globalThis as typeof globalThis & {
    [GLOBAL_KEY]?: Map<string, EmailVerificationEntry>;
  };
  if (!g[GLOBAL_KEY]) g[GLOBAL_KEY] = new Map();
  return g[GLOBAL_KEY];
}

export function createEmailVerificationToken(
  userId: bigint,
  email: string,
  ttlMs = 24 * 60 * 60 * 1000,
): string {
  const token = crypto.randomBytes(32).toString("hex");
  getStore().set(token, {
    userId,
    email: email.trim().toLowerCase(),
    expiresAt: Date.now() + ttlMs,
  });
  return token;
}

export function consumeEmailVerificationToken(token: string): { userId: bigint; email: string } | null {
  const t = token.trim();
  if (!t) return null;
  const store = getStore();
  const entry = store.get(t);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(t);
    return null;
  }
  store.delete(t);
  return { userId: entry.userId, email: entry.email };
}
