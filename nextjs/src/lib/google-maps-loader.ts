const ENV_GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ?? "";

/** Prefer Settings → System Settings key; fall back to NEXT_PUBLIC_GOOGLE_PLACES_API_KEY. */
export function resolveGoogleMapsApiKey(settingsKey?: string | null): string {
  const fromSettings = (settingsKey ?? "").trim();
  if (fromSettings) return fromSettings;
  return ENV_GOOGLE_MAPS_API_KEY.trim();
}

const MAPS_SCRIPT_ID = "pf-google-maps-script";

function hasPlacesLibrary(): boolean {
  return Boolean(typeof window !== "undefined" && window.google?.maps?.places?.Autocomplete);
}

async function ensureGoogleLibraries(
  libraries: string[],
  apiKey: string,
): Promise<void> {
  const g = window.google?.maps;
  if (!g) return;

  const unique = [...new Set(libraries.filter(Boolean))];
  for (const lib of unique) {
    if (lib === "places" && !hasPlacesLibrary()) {
      if (typeof g.importLibrary === "function") {
        await g.importLibrary("places");
      }
      if (!hasPlacesLibrary() && apiKey) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`;
          script.async = true;
          script.defer = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Google Places script failed to load"));
          document.head.appendChild(script);
        });
      }
    }
  }
}

function appendLibrariesToScriptUrl(baseUrl: string, libraries: string[]): string {
  if (!libraries.length) return baseUrl;
  const libs = [...new Set(libraries)].join(",");
  const joiner = baseUrl.includes("?") ? "&" : "?";
  if (baseUrl.includes("libraries=")) return baseUrl;
  return `${baseUrl}${joiner}libraries=${encodeURIComponent(libs)}`;
}

/**
 * Load the Google Maps JavaScript API. Reuses an existing script tag when present.
 * @param settingsKey - `googleMapsApiKey` from app settings (Settings page).
 * @param libraries - Optional libraries, e.g. `["places"]` for autocomplete.
 */
export function loadGoogleMapsApi(
  settingsKey?: string | null,
  libraries: string[] = [],
): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Google Maps can only load in the browser."));
      return;
    }

    const apiKey = resolveGoogleMapsApiKey(settingsKey);
    if (!apiKey) {
      reject(new Error("No Google Maps API key"));
      return;
    }

    const finish = async () => {
      try {
        await ensureGoogleLibraries(libraries, apiKey);
        if (libraries.includes("places") && !hasPlacesLibrary()) {
          reject(new Error("Google Places library failed to load"));
          return;
        }
        resolve();
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Google Maps library failed to load"));
      }
    };

    if (window.google?.maps) {
      void finish();
      return;
    }

    const existing =
      document.getElementById(MAPS_SCRIPT_ID) ??
      document.querySelector<HTMLScriptElement>('script[src^="https://maps.googleapis.com/maps/api/js"]');

    if (existing) {
      const done = () => {
        void finish();
      };
      if (window.google?.maps) {
        done();
        return;
      }
      existing.addEventListener("load", done);
      existing.addEventListener("error", () => reject(new Error("Google Maps script failed to load")));
      queueMicrotask(() => {
        if (window.google?.maps) done();
      });
      return;
    }

    const script = document.createElement("script");
    script.id = MAPS_SCRIPT_ID;
    const base = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}`;
    script.src = appendLibrariesToScriptUrl(base, libraries);
    script.async = true;
    script.defer = true;
    script.onload = () => {
      void finish();
    };
    script.onerror = () => reject(new Error("Google Maps script failed to load"));
    document.head.appendChild(script);
  });
}
