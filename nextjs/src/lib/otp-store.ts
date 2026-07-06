/**
 * In-memory OTP storage. Uses `globalThis` so the same Map is shared across all
 * API route bundles in Next.js; otherwise send-otp and verify-otp can load
 * duplicate module copies and verification always fails ("Invalid or expired OTP").
 *
 * Limitation: not shared across multiple Node workers / server instances — use a
 * shared cache (Redis) if you run cluster mode or horizontal scale without sticky sessions.
 */

type OtpEntry = { otp: string; expiresAt: number };

const GLOBAL_KEY = "__paperFlightOtpStore_v1" as const;

function getMaps(): { store: Map<string, OtpEntry>; verified: Map<string, number> } {
  const g = globalThis as typeof globalThis & {
    [GLOBAL_KEY]?: { store: Map<string, OtpEntry>; verified: Map<string, number> };
  };
  if (!g[GLOBAL_KEY]) {
    g[GLOBAL_KEY] = {
      store: new Map(),
      verified: new Map(),
    };
  }
  return g[GLOBAL_KEY];
}

function normalizeOtpInput(otp: string): string {
  return String(otp ?? "").replace(/\D/g, "");
}

export function saveOtp(key: string, otp: string, ttlMs = 10 * 60 * 1000) {
  const { store } = getMaps();
  store.set(key, { otp: normalizeOtpInput(otp), expiresAt: Date.now() + ttlMs });
}

export function verifyOtp(key: string, otp: string): boolean {
  const { store } = getMaps();
  const entry = store.get(key);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return false;
  }
  const want = normalizeOtpInput(otp);
  if (!want || want !== entry.otp) return false;
  store.delete(key);
  return true;
}

export function markOtpChannelVerified(key: string, ttlMs = 30 * 60 * 1000) {
  const { verified } = getMaps();
  verified.set(key, Date.now() + ttlMs);
}

/** Returns true if this channel was verified recently; does not remove. */
export function isOtpChannelVerified(key: string): boolean {
  const { verified } = getMaps();
  const exp = verified.get(key);
  if (!exp || Date.now() > exp) {
    verified.delete(key);
    return false;
  }
  return true;
}

/** Use after successful employee create so verifications can't be replayed. */
export function consumeOtpChannelVerified(key: string): void {
  const { verified } = getMaps();
  verified.delete(key);
}

export function generateOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
