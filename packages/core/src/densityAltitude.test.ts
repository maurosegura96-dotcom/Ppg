import assert from "node:assert/strict";
import { test } from "node:test";
import { computeDensityAltitudeFt } from "./densityAltitude";

test("standard sea-level ISA conditions yield ~0 density altitude", () => {
  const da = computeDensityAltitudeFt({
    fieldElevationFt: 0,
    stationPressureHpa: 1013.25,
    outsideAirTempC: 15,
  });
  assert.ok(Math.abs(da) < 5);
});

test("hot day at 5000ft field elevation with standard pressure yields ~8000ft density altitude", () => {
  // Classic FAA ground-school example: 5000ft field, 30C, standard pressure -> ~7988ft DA.
  const da = computeDensityAltitudeFt({
    fieldElevationFt: 5000,
    stationPressureHpa: 1013.25,
    outsideAirTempC: 30,
  });
  assert.ok(da > 7800 && da < 8200);
});

test("colder than standard temperature reduces density altitude below field elevation", () => {
  const da = computeDensityAltitudeFt({
    fieldElevationFt: 2000,
    stationPressureHpa: 1013.25,
    outsideAirTempC: -5,
  });
  assert.ok(da < 2000);
});
