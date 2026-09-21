import {
  computeDensityAltitudeFt,
  computeFlyabilityScore,
  computeWindShearIndex,
  interpolateWindLayers,
  type WeatherSnapshot,
  type PilotProfile,
} from "@aeroparamotor/core";
import { fetchOpenMeteoModel, modelsForRegion, toWeatherModelLabel } from "./openMeteoClient.js";

const STANDARD_ALTITUDE_LAYERS_M = [100, 300, 500, 1000];
const M_TO_FT = 3.28084;

function inferRegion(lat: number, lon: number): "US" | "MX" {
  // Coarse bounding-box split; good enough to pick a model set. Refine with a
  // real country-polygon lookup once the airspace/geospatial DB is in place.
  return lat >= 24.5 ? "US" : "MX";
}

export async function buildWeatherSnapshots(
  lat: number,
  lon: number,
  pilot: Pick<PilotProfile, "experienceLevel" | "windTolerance">,
): Promise<WeatherSnapshot[]> {
  const region = inferRegion(lat, lon);
  const models = modelsForRegion(region);

  const settled = await Promise.allSettled(models.map((m) => fetchOpenMeteoModel(lat, lon, m)));

  const snapshots: WeatherSnapshot[] = [];
  for (let i = 0; i < settled.length; i++) {
    const outcome = settled[i];
    if (outcome.status === "rejected") continue; // one model failing shouldn't take down the others
    const sample = outcome.value;

    const windLayers = interpolateWindLayers(sample.rawWindPoints, STANDARD_ALTITUDE_LAYERS_M);
    const windShearIndex = computeWindShearIndex(windLayers);
    const fieldElevationFt = sample.elevationM * M_TO_FT;
    const densityAltitudeFt = computeDensityAltitudeFt({
      fieldElevationFt,
      stationPressureHpa: sample.pressureHpa,
      outsideAirTempC: sample.temperatureC,
    });
    // No direct turbulence forecast in the free Open-Meteo tier; approximate
    // from convective potential (CAPE) and mechanical shear until a dedicated
    // turbulence product (e.g. GTG-style) is wired in behind a paid model.
    const turbulenceIndex = Math.min(sample.capeJkg / 300 + windShearIndex / 2, 10);

    const flyability = computeFlyabilityScore({
      surfaceWind: sample.surfaceWind,
      windLayers,
      densityAltitudeFt,
      fieldElevationFt,
      capeJkg: sample.capeJkg,
      turbulenceIndex,
      pilot,
    });

    snapshots.push({
      id: `${toWeatherModelLabel(models[i]).toLowerCase()}-${lat}-${lon}-${sample.timestampUtc}`,
      lat,
      lon,
      timestampUtc: sample.timestampUtc,
      model: toWeatherModelLabel(models[i]),
      surfaceWind: sample.surfaceWind,
      windLayers,
      windShearIndex,
      temperatureC: sample.temperatureC,
      dewpointC: sample.temperatureC - (100 - sample.relativeHumidityPct) / 5,
      relativeHumidityPct: sample.relativeHumidityPct,
      pressureHpa: sample.pressureHpa,
      densityAltitudeFt,
      capeJkg: sample.capeJkg,
      thermalGradientCPer1000ft: 0, // requires multi-level temperature profile — TODO once profile fetch is added
      turbulenceIndex,
      flyability,
    });
  }

  return snapshots;
}
