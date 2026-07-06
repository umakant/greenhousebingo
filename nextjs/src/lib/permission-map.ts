/**
 * Module-level permission ID → name cache.
 * Populated lazily (on first decode request) via warmPermissionMap().
 * Used by authz.ts to decode compact pf_permissions cookies ("1,2,3" format).
 */

let _idToName: Map<number, string> = new Map();
let _nameToId: Map<string, number> = new Map();
let _warmed = false;
let _inFlight: Promise<void> | null = null;

export function isPermissionMapWarmed(): boolean {
  return _warmed;
}

export function getPermissionName(id: number): string | undefined {
  return _idToName.get(id);
}

export function getPermissionId(name: string): number | undefined {
  return _nameToId.get(name);
}

export function getAllPermissionIds(names: string[]): number[] {
  return names.map((n) => _nameToId.get(n)).filter((id): id is number => id !== undefined);
}

/**
 * Warm the permission map from the database.
 * Safe to call multiple times — only one DB round-trip is ever made.
 * If the initial load fails, resets so the next call can retry.
 */
export function warmPermissionMap(
  loader: () => Promise<Array<{ id: bigint | number; name: string | null }>>,
): Promise<void> {
  if (_warmed) return Promise.resolve();
  if (_inFlight) return _inFlight;

  _inFlight = loader()
    .then((rows) => {
      const idToName = new Map<number, string>();
      const nameToId = new Map<string, number>();
      for (const row of rows) {
        const id = Number(row.id);
        const name = row.name ?? "";
        if (name) {
          idToName.set(id, name);
          nameToId.set(name, id);
        }
      }
      _idToName = idToName;
      _nameToId = nameToId;
      _warmed = true;
    })
    .catch(() => {
      // Reset so the next call to warmPermissionMap() will retry
      _inFlight = null;
    });

  return _inFlight;
}
