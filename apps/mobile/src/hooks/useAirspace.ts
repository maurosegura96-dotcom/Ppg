import { useEffect, useState } from "react";
import { getApiBaseUrl } from "../config/apiConfig";

export interface AirspacePolygon {
  id: string;
  name: string;
  icaoClass: string;
  type: string;
  lowerLimitFt: number;
  upperLimitFt: number;
  geometry: { type: "Polygon"; coordinates: number[][][] };
}

type AirspaceState =
  | { status: "loading" }
  | { status: "unavailable"; message: string }
  | { status: "error"; message: string }
  | { status: "ready"; airspaces: AirspacePolygon[] };

/** Fetches airspace polygons near a point from apps/api's OpenAIP proxy.
 * Debounced by the caller passing a rounded center (see MapScreen) so
 * panning doesn't fire a request per frame. */
export function useAirspace(center: { lat: number; lon: number } | null, radiusKm = 40): AirspaceState {
  const [state, setState] = useState<AirspaceState>({ status: "loading" });

  useEffect(() => {
    if (!center) return;
    const controller = new AbortController();
    setState({ status: "loading" });

    (async () => {
      const apiBaseUrl = await getApiBaseUrl();
      try {
        const res = await fetch(
          `${apiBaseUrl}/airspace/near?lat=${center.lat}&lon=${center.lon}&radiusKm=${radiusKm}`,
          { signal: controller.signal },
        );
        if (res.status === 503) {
          const body = await res.json().catch(() => ({}));
          setState({ status: "unavailable", message: body.error ?? "OPENAIP_API_KEY no configurada" });
          return;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const body: { airspaces: AirspacePolygon[] } = await res.json();
        setState({ status: "ready", airspaces: body.airspaces });
      } catch (err: any) {
        if (err?.name === "AbortError") return;
        setState({ status: "error", message: String(err?.message ?? err) });
      }
    })();

    return () => controller.abort();
  }, [center?.lat, center?.lon, radiusKm]);

  return state;
}
