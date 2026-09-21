export interface AirspacePolygon {
  id: string;
  name: string;
  icaoClass: string;
  type: string;
  lowerLimitFt: number;
  upperLimitFt: number;
  geometry: { type: "Polygon"; coordinates: number[][][] };
}

export class OpenAipNotConfiguredError extends Error {
  constructor() {
    super(
      "OPENAIP_API_KEY is not set. Airspace layers are disabled until a free key from " +
        "https://www.openaip.net is added to apps/api/.env — see docs/PRODUCT_SPEC.md section 6.",
    );
    this.name = "OpenAipNotConfiguredError";
  }
}

export async function fetchAirspaceNear(
  lat: number,
  lon: number,
  radiusKm: number,
  fetchImpl: typeof fetch = fetch,
): Promise<AirspacePolygon[]> {
  const apiKey = process.env.OPENAIP_API_KEY;
  if (!apiKey) throw new OpenAipNotConfiguredError();

  const url = new URL("https://api.openaip.net/api/airspaces");
  url.searchParams.set("pos", `${lat},${lon}`);
  url.searchParams.set("dist", String(radiusKm * 1000));

  const res = await fetchImpl(url.toString(), {
    headers: { "x-openaip-api-key": apiKey },
  });
  if (!res.ok) {
    throw new Error(`OpenAIP request failed (${res.status}): ${await res.text()}`);
  }
  const body = (await res.json()) as { items: AirspacePolygon[] };
  return body.items;
}
