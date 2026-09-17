import assert from "node:assert/strict";
import { test } from "node:test";
import { computeGlideCone, isLzWithinGlide, findReachableLzs } from "./glideCone";

const baseInput = {
  position: { lat: 40.0, lon: -3.0 },
  altitudeAglM: 300,
  glideRatio: 6.5,
  trimSpeedMs: 11,
  windSpeedMs: 5,
  windFromDeg: 270, // wind from the west
};

test("no altitude means no reachable footprint", () => {
  const result = computeGlideCone({ ...baseInput, altitudeAglM: 0 });
  assert.equal(result.polygon.length, 0);
  assert.equal(result.maxRangeM, 0);
});

test("downwind range exceeds upwind range", () => {
  const result = computeGlideCone(baseInput);
  assert.ok(result.maxRangeM > result.minRangeM);
  // sanity: sink rate = 11/6.5 m/s, time-to-ground = 300/sink ≈ 177s.
  // No-wind range would be ≈1657m; wind-skewed min/max should bracket that
  // (min ≈ (11-5)*177*0.85 ≈ 904m, max ≈ (11+5)*177*0.85 ≈ 2411m).
  assert.ok(result.minRangeM > 800 && result.minRangeM < 1657);
  assert.ok(result.maxRangeM > 1657 && result.maxRangeM < 2600);
});

test("an LZ directly downwind and well within range is reachable", () => {
  // Wind FROM 270 (west) means it blows TOWARD the east (090).
  // Place the LZ ~1500m east of the pilot, comfortably inside the ~2500m
  // downwind range computed above.
  const lzEast = {
    id: "lz-east",
    lat: baseInput.position.lat,
    lon: baseInput.position.lon + 0.0135, // ~1150m east at this latitude
  };
  const check = isLzWithinGlide(baseInput, lzEast);
  assert.equal(check.reachable, true);
  assert.ok(check.marginM > 0);
});

test("an LZ far upwind out of range is not reachable", () => {
  const lzFarWest = {
    id: "lz-far-west",
    lat: baseInput.position.lat,
    lon: baseInput.position.lon - 0.05, // ~4250m west, upwind (headwind)
  };
  const check = isLzWithinGlide(baseInput, lzFarWest);
  assert.equal(check.reachable, false);
});

test("findReachableLzs filters and sorts by safety margin", () => {
  const candidates = [
    { id: "close-downwind", lat: baseInput.position.lat, lon: baseInput.position.lon + 0.005 },
    { id: "far-downwind", lat: baseInput.position.lat, lon: baseInput.position.lon + 0.02 },
    { id: "far-upwind", lat: baseInput.position.lat, lon: baseInput.position.lon - 0.05 },
  ];
  const reachable = findReachableLzs(baseInput, candidates);
  assert.ok(reachable.every((r) => r.id !== "far-upwind"));
  assert.ok(reachable[0].marginM >= reachable[reachable.length - 1].marginM);
});
