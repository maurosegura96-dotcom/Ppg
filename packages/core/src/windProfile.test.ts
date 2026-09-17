import assert from "node:assert/strict";
import { test } from "node:test";
import { interpolateWindLayers } from "./windProfile";

test("interpolates speed linearly at the midpoint between two known samples", () => {
  const result = interpolateWindLayers(
    [
      { altitudeAglM: 0, speedKt: 4, directionDeg: 200 },
      { altitudeAglM: 1000, speedKt: 20, directionDeg: 200 },
    ],
    [500],
  );
  assert.equal(result[0].speedKt, 12);
});

test("wraps direction the short way across the 360/0 boundary", () => {
  const result = interpolateWindLayers(
    [
      { altitudeAglM: 0, speedKt: 10, directionDeg: 350 },
      { altitudeAglM: 1000, speedKt: 10, directionDeg: 10 },
    ],
    [500],
  );
  assert.equal(result[0].directionDeg, 0);
});

test("clamps to the nearest sample outside the observed altitude range", () => {
  const result = interpolateWindLayers(
    [
      { altitudeAglM: 100, speedKt: 8, directionDeg: 210 },
      { altitudeAglM: 900, speedKt: 18, directionDeg: 230 },
    ],
    [0, 100, 1000],
  );
  assert.equal(result[0].speedKt, 8); // below range -> clamp to lowest sample
  assert.equal(result[1].speedKt, 8); // exact match
  assert.equal(result[2].speedKt, 18); // above range -> clamp to highest sample
});

test("produces one output layer per requested altitude, in the requested order", () => {
  const result = interpolateWindLayers(
    [
      { altitudeAglM: 0, speedKt: 5, directionDeg: 180 },
      { altitudeAglM: 2000, speedKt: 25, directionDeg: 220 },
    ],
    [1000, 100, 300, 500],
  );
  assert.deepEqual(
    result.map((r) => r.altitudeAglM),
    [1000, 100, 300, 500],
  );
});
