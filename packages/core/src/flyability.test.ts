import assert from "node:assert/strict";
import { test } from "node:test";
import { computeFlyabilityScore, computeWindShearIndex } from "./flyability";

const advancedPilot = {
  experienceLevel: "advanced" as const,
  windTolerance: { maxSustainedWindKt: 15, maxGustKt: 20, maxCrosswindComponentKt: 10 },
};

const studentPilot = {
  experienceLevel: "student" as const,
  windTolerance: { maxSustainedWindKt: 15, maxGustKt: 20, maxCrosswindComponentKt: 10 },
};

test("calm, stable morning conditions score green", () => {
  const result = computeFlyabilityScore({
    surfaceWind: { speedKt: 4, gustKt: 5 },
    windLayers: [
      { altitudeAglM: 0, speedKt: 4, directionDeg: 200 },
      { altitudeAglM: 300, speedKt: 6, directionDeg: 210 },
      { altitudeAglM: 1000, speedKt: 9, directionDeg: 220 },
    ],
    densityAltitudeFt: 1200,
    fieldElevationFt: 1000,
    capeJkg: 50,
    turbulenceIndex: 1,
    pilot: advancedPilot,
  });
  assert.equal(result.level, "green");
  assert.ok(result.score >= 75);
});

test("wind exceeding the pilot's hard gust limit forces red regardless of score", () => {
  const result = computeFlyabilityScore({
    surfaceWind: { speedKt: 12, gustKt: 25 },
    windLayers: [{ altitudeAglM: 0, speedKt: 12, directionDeg: 200 }],
    densityAltitudeFt: 1200,
    fieldElevationFt: 1000,
    capeJkg: 100,
    turbulenceIndex: 2,
    pilot: advancedPilot,
  });
  assert.equal(result.level, "red");
});

test("the same weather is stricter (more likely red/yellow) for a student than an advanced pilot", () => {
  const weather = {
    surfaceWind: { speedKt: 11, gustKt: 14 },
    windLayers: [{ altitudeAglM: 0, speedKt: 11, directionDeg: 200 }],
    densityAltitudeFt: 1200,
    fieldElevationFt: 1000,
    capeJkg: 100,
    turbulenceIndex: 2,
  };
  const advancedResult = computeFlyabilityScore({ ...weather, pilot: advancedPilot });
  const studentResult = computeFlyabilityScore({ ...weather, pilot: studentPilot });
  assert.ok(studentResult.score < advancedResult.score);
});

test("wind shear index picks the steepest gradient between adjacent layers", () => {
  const shear = computeWindShearIndex([
    { altitudeAglM: 0, speedKt: 5, directionDeg: 200 },
    { altitudeAglM: 100, speedKt: 20, directionDeg: 210 }, // steep: 15kt/100m
    { altitudeAglM: 500, speedKt: 22, directionDeg: 215 },
  ]);
  assert.equal(shear, 15);
});

test("high density altitude excess and low CAPE-driven turbulence degrade an otherwise light-wind day", () => {
  const result = computeFlyabilityScore({
    surfaceWind: { speedKt: 5, gustKt: 6 },
    windLayers: [{ altitudeAglM: 0, speedKt: 5, directionDeg: 200 }],
    densityAltitudeFt: 8000,
    fieldElevationFt: 3000, // 5000ft density altitude excess -> above the 3000ft penalty cap
    capeJkg: 1500,
    turbulenceIndex: 6,
    pilot: advancedPilot,
  });
  assert.ok(result.score < 75);
});
