/** Built-in lat/lng for common US cities (keyed "city|st"). */
const CITY_COORDS: Record<string, [number, number]> = {
  "jacksonville|fl": [-81.66, 30.33],
  "tampa|fl": [-82.46, 27.95],
  "orlando|fl": [-81.38, 28.54],
  "miami|fl": [-80.19, 25.76],
  "tallahassee|fl": [-84.28, 30.44],
  "fort lauderdale|fl": [-80.14, 26.12],
  "atlanta|ga": [-84.39, 33.75],
  "savannah|ga": [-81.1, 32.08],
  "charlotte|nc": [-80.84, 35.23],
  "raleigh|nc": [-78.64, 35.78],
  "nashville|tn": [-86.78, 36.16],
  "memphis|tn": [-90.05, 35.15],
  "knoxville|tn": [-83.92, 35.96],
  "philadelphia|pa": [-75.16, 39.95],
  "pittsburgh|pa": [-79.99, 40.44],
  "boston|ma": [-71.06, 42.36],
  "new york|ny": [-74.01, 40.71],
  "buffalo|ny": [-78.88, 42.89],
  "chicago|il": [-87.63, 41.88],
  "detroit|mi": [-83.05, 42.33],
  "columbus|oh": [-82.99, 39.96],
  "cleveland|oh": [-81.69, 41.5],
  "cincinnati|oh": [-84.51, 39.1],
  "indianapolis|in": [-86.16, 39.77],
  "milwaukee|wi": [-87.91, 43.04],
  "minneapolis|mn": [-93.27, 44.98],
  "st louis|mo": [-90.2, 38.63],
  "kansas city|mo": [-94.58, 39.1],
  "omaha|ne": [-95.94, 41.26],
  "denver|co": [-104.99, 39.74],
  "dallas|tx": [-96.8, 32.78],
  "houston|tx": [-95.37, 29.76],
  "austin|tx": [-97.74, 30.27],
  "san antonio|tx": [-98.49, 29.42],
  "el paso|tx": [-106.49, 31.76],
  "phoenix|az": [-112.07, 33.45],
  "tucson|az": [-110.93, 32.22],
  "las vegas|nv": [-115.14, 36.17],
  "salt lake city|ut": [-111.89, 40.76],
  "albuquerque|nm": [-106.65, 35.08],
  "los angeles|ca": [-118.24, 34.05],
  "san diego|ca": [-117.16, 32.72],
  "san francisco|ca": [-122.42, 37.77],
  "sacramento|ca": [-121.49, 38.58],
  "seattle|wa": [-122.33, 47.61],
  "portland|or": [-122.68, 45.52],
  "new orleans|la": [-90.07, 29.95],
  "birmingham|al": [-86.8, 33.52],
  "washington|dc": [-77.04, 38.91],
  "baltimore|md": [-76.61, 39.29],
  "richmond|va": [-77.44, 37.54],
  "louisville|ky": [-85.76, 38.25],
  "oklahoma city|ok": [-97.52, 35.47],
  "boise|id": [-116.2, 43.62],
};

export function cityCoordKey(city: string, state: string): string {
  return `${city.trim().toLowerCase()}|${state.trim().toLowerCase()}`;
}

export function coordsForCity(city: string, state: string): { lat: number; lng: number } | null {
  const hit = CITY_COORDS[cityCoordKey(city, state)];
  if (!hit) return null;
  return { lat: hit[1], lng: hit[0] };
}

/** Spread markers that share the same city so they remain clickable. */
export function offsetDuplicatePosition(
  lat: number,
  lng: number,
  index: number,
  total: number,
): { lat: number; lng: number } {
  if (total <= 1) return { lat, lng };
  const angle = (2 * Math.PI * index) / total;
  const radius = 0.22;
  return {
    lat: lat + radius * Math.sin(angle),
    lng: lng + (radius * Math.cos(angle)) / Math.cos((lat * Math.PI) / 180),
  };
}
