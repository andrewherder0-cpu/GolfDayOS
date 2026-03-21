export interface GeoResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export async function geocodeAddress(query: string): Promise<GeoResult | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    console.error("[geocode] GOOGLE_MAPS_API_KEY not set");
    return null;
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${key}`;
  try {
    const res = await fetch(url);
    const data = await res.json() as {
      status: string;
      results: Array<{
        geometry: { location: { lat: number; lng: number } };
        formatted_address: string;
      }>;
    };

    if (data.status === "OK" && data.results.length > 0) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng, formattedAddress: data.results[0].formatted_address };
    }

    console.warn(`[geocode] No result for: "${query}" (status: ${data.status})`);
    return null;
  } catch (err) {
    console.error(`[geocode] Error geocoding "${query}":`, err);
    return null;
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
