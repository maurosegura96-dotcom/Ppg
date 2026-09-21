import type { FlyabilityScore, WindLayer } from "./types/weatherSnapshot";
import type { ExperienceLevel, WindTolerance } from "./types/pilotProfile";

export interface FlyabilityInput {
  surfaceWind: { speedKt: number; gustKt: number };
  windLayers: WindLayer[]; // used to compute shear between adjacent layers
  densityAltitudeFt: number;
  fieldElevationFt: number;
  capeJkg: number;
  turbulenceIndex: number; // 0-10, normalized upstream from model output
  pilot: {
    experienceLevel: ExperienceLevel;
    windTolerance: WindTolerance;
  };
}

// Novices get a safety margin baked into their effective tolerance; instructors
// fly closer to the wing's real limits.
const EXPERIENCE_TOLERANCE_FACTOR: Record<ExperienceLevel, number> = {
  student: 0.6,
  novice: 0.75,
  intermediate: 0.9,
  advanced: 1.0,
  instructor: 1.1,
};

function clampedRatioPenalty(value: number, limit: number, weight: number): number {
  if (limit <= 0) return value > 0 ? weight : 0;
  const ratio = value / limit;
  return Math.min(Math.max(ratio, 0), 1.5) * weight;
}

export function computeWindShearIndex(windLayers: WindLayer[]): number {
  const sorted = [...windLayers].sort((a, b) => a.altitudeAglM - b.altitudeAglM);
  let maxShearPer100m = 0;
  for (let i = 1; i < sorted.length; i++) {
    const dAlt = sorted[i].altitudeAglM - sorted[i - 1].altitudeAglM;
    if (dAlt <= 0) continue;
    const dSpeed = Math.abs(sorted[i].speedKt - sorted[i - 1].speedKt);
    maxShearPer100m = Math.max(maxShearPer100m, (dSpeed / dAlt) * 100);
  }
  return maxShearPer100m;
}

export function computeFlyabilityScore(input: FlyabilityInput): FlyabilityScore {
  const experienceFactor = EXPERIENCE_TOLERANCE_FACTOR[input.pilot.experienceLevel];
  const effectiveMaxSustainedKt = input.pilot.windTolerance.maxSustainedWindKt * experienceFactor;
  const effectiveMaxGustKt = input.pilot.windTolerance.maxGustKt * experienceFactor;

  const windShearIndex = computeWindShearIndex(input.windLayers);
  const gustSpreadKt = Math.max(input.surfaceWind.gustKt - input.surfaceWind.speedKt, 0);
  // Density altitude reduces wing/prop performance; penalize the excess over field elevation.
  const densityAltitudeExcessFt = Math.max(input.densityAltitudeFt - input.fieldElevationFt, 0);

  const factors: FlyabilityScore["contributingFactors"] = [
    {
      factor: "surface_wind",
      weight: 30,
      value: input.surfaceWind.speedKt,
      penalty: clampedRatioPenalty(input.surfaceWind.speedKt, effectiveMaxSustainedKt, 30),
    },
    {
      factor: "gust_factor",
      weight: 20,
      value: gustSpreadKt,
      // >8kt spread over sustained wind is the classic PPG go/no-go red flag.
      penalty: clampedRatioPenalty(gustSpreadKt, 8, 20),
    },
    {
      factor: "wind_shear",
      weight: 15,
      value: windShearIndex,
      // >4kt/100m shear between layers signals rotor/mechanical turbulence risk.
      penalty: clampedRatioPenalty(windShearIndex, 4, 15),
    },
    {
      factor: "turbulence",
      weight: 15,
      value: input.turbulenceIndex,
      penalty: clampedRatioPenalty(input.turbulenceIndex, 5, 15),
    },
    {
      factor: "density_altitude",
      weight: 10,
      value: densityAltitudeExcessFt,
      penalty: clampedRatioPenalty(densityAltitudeExcessFt, 3000, 10),
    },
    {
      factor: "pilot_experience_margin",
      weight: 10,
      value: experienceFactor,
      penalty: (1 - experienceFactor) * 10,
    },
  ];

  const totalPenalty = factors.reduce((sum, f) => sum + f.penalty, 0);
  const score = Math.max(0, Math.round(100 - totalPenalty));

  const hardFail =
    input.surfaceWind.gustKt > input.pilot.windTolerance.maxGustKt ||
    input.surfaceWind.speedKt > input.pilot.windTolerance.maxSustainedWindKt;

  const level: FlyabilityScore["level"] = hardFail
    ? "red"
    : score >= 75
      ? "green"
      : score >= 50
        ? "yellow"
        : "red";

  return {
    level,
    score,
    contributingFactors: factors,
    bestWindowsLocalTime: [],
  };
}
