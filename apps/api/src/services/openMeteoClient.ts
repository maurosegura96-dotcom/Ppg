import type { RawWindPoint } from "@aeroparamotor/core";

// Pressure levels Open-Meteo exposes wind + geopotential height for. Their
// actual AGL altitude varies with surface pressure/elevation, which is why we
// read back the geopotential height per level instead of assuming fixed
// meters (925hPa is "roughly" 750m AGL, but that varies with weather).
const PRESSURE_LEVELS_HPA = [925, 850, 700] as const;
const FIXED_HEIGHTS_M = [10, 80, 120, 180] as const;

export type OpenMeteoModel =
  | "ecmwf_ifs025"
  | "gfs_seamless"
  | "gfs_hrrr"
  | "icon_seamless";

/** Maps an Open-Meteo model id to this app's WeatherModel label. */
export function toWeatherModelLabel(model: OpenMeteoModel): "ECMWF" | "GFS" | "HRRR" | "ICON" {
  switch (model) {
    case "ecmwf_ifs025":
      return "ECMWF";
    case "gfs_hrrr":
      return "HRRR";
    case "icon_seamless":
      return "ICON";
    case "gfs_seamless":
    default:
      return "GFS";
  }
}

/** Model set recommended per region — see docs/PRODUCT_SPEC.md for coverage rationale. */
export function modelsForRegion(region: "US" | "MX"): OpenMeteoModel[] {
  return region === "US"
    ? ["ecmwf_ifs025", "gfs_hrrr", "gfs_seamless"]
    : ["ecmwf_ifs025", "gfs_seamless", "icon_seamless"];
}

interface OpenMeteoHourlyResponse {
  elevation: number;
  hourly: {
    time: string[];
    temperature_2m: number[];
    relative_humidity_2m: number[];
    surface_pressure: number[];
    cape: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    wind_gusts_10m: number[];
    [key: string]: string[] | number[];
  };
}

export interface OpenMeteoParsedSample {
  timestampUtc: string;
  elevationM: number;
  temperatureC: number;
  relativeHumidityPct: number;
  pressureHpa: number;
  capeJkg: number;
  surfaceWind: { speedKt: number; directionDeg: number; gustKt: number };
  rawWindPoints: RawWindPoint[]; // fixed heights + pressure-level heights, in AGL meters
}

const MS_TO_KT = 1.94384;

function buildHourlyParams(): string {
  const heightVars = FIXED_HEIGHTS_M.flatMap((h) => [`wind_speed_${h}m`, `wind_direction_${h}m`]);
  const pressureVars = PRESSURE_LEVELS_HPA.flatMap((p) => [
    `wind_speed_${p}hPa`,
    `wind_direction_${p}hPa`,
    `geopotential_height_${p}hPa`,
  ]);
  return [
    "temperature_2m",
    "relative_humidity_2m",
    "surface_pressure",
    "cape",
    "wind_speed_10m",
    "wind_direction_10m",
    "wind_gusts_10m",
    ...heightVars,
    ...pressureVars,
  ].join(",");
}

export async function fetchOpenMeteoModel(
  lat: number,
  lon: number,
  model: OpenMeteoModel,
  fetchImpl: typeof fetch = fetch,
): Promise<OpenMeteoParsedSample> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", lat.toFixed(4));
  url.searchParams.set("longitude", lon.toFixed(4));
  url.searchParams.set("hourly", buildHourlyParams());
  url.searchParams.set("wind_speed_unit", "ms");
  url.searchParams.set("models", model);
  url.searchParams.set("forecast_days", "1");

  const res = await fetchImpl(url.toString());
  if (!res.ok) {
    throw new Error(`Open-Meteo request failed (${res.status}) for model ${model}: ${await res.text()}`);
  }
  const body = (await res.json()) as OpenMeteoHourlyResponse;
  const h = body.hourly;

  // Open-Meteo's hourly series starts at 00:00 UTC of the request day, not "now" —
  // pick the sample closest to the current hour.
  const nowMs = Date.now();
  const idx = h.time.reduce((closest, t, i) => {
    const diff = Math.abs(new Date(`${t}Z`).getTime() - nowMs);
    const closestDiff = Math.abs(new Date(`${h.time[closest]}Z`).getTime() - nowMs);
    return diff < closestDiff ? i : closest;
  }, 0);
  const elevationM = body.elevation;

  const rawWindPoints: RawWindPoint[] = FIXED_HEIGHTS_M.map((height) => ({
    altitudeAglM: height,
    speedKt: Number(h[`wind_speed_${height}m`][idx]) * MS_TO_KT,
    directionDeg: Number(h[`wind_direction_${height}m`][idx]),
  }));

  for (const level of PRESSURE_LEVELS_HPA) {
    const geopotentialM = Number(h[`geopotential_height_${level}hPa`][idx]);
    const altitudeAglM = geopotentialM - elevationM;
    if (altitudeAglM <= 0) continue; // level is below ground at this location; skip
    rawWindPoints.push({
      altitudeAglM,
      speedKt: Number(h[`wind_speed_${level}hPa`][idx]) * MS_TO_KT,
      directionDeg: Number(h[`wind_direction_${level}hPa`][idx]),
    });
  }

  return {
    timestampUtc: h.time[idx],
    elevationM,
    temperatureC: h.temperature_2m[idx],
    relativeHumidityPct: h.relative_humidity_2m[idx],
    pressureHpa: h.surface_pressure[idx],
    capeJkg: h.cape[idx],
    surfaceWind: {
      speedKt: Number(h.wind_speed_10m[idx]) * MS_TO_KT,
      directionDeg: Number(h.wind_direction_10m[idx]),
      gustKt: Number(h.wind_gusts_10m[idx]) * MS_TO_KT,
    },
    rawWindPoints,
  };
}
