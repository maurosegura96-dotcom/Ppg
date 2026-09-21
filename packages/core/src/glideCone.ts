import { type LatLon, bearingDeg, destinationPoint, haversineDistanceM } from "./geo";

export interface GlideConeInput {
  position: LatLon;
  altitudeAglM: number;
  glideRatio: number; // best L/D of the wing, e.g. 6.5
  trimSpeedMs: number; // airspeed flown during the glide
  windSpeedMs: number;
  windFromDeg: number; // meteorological convention: direction wind is coming FROM
  safetyMarginPct?: number; // reserve knocked off the theoretical range, default 0.15
  bearingResolutionDeg?: number; // polygon sampling density, default 5
}

export interface GlideConePolygonPoint extends LatLon {
  bearingDeg: number;
  rangeM: number;
}

export interface GlideConeResult {
  sinkRateMs: number;
  timeToGroundS: number;
  polygon: GlideConePolygonPoint[];
  /** Minimum and maximum reachable range across all bearings, in meters. */
  minRangeM: number;
  maxRangeM: number;
}

/**
 * Simplified wind-drift model: assumes the pilot flies a heading equal to the
 * desired ground track (no wind-correction-angle crab), which matches how
 * glide rings are drawn in most EFB tools and is a reasonable approximation
 * given typical PPG airspeed-to-wind ratios (trim speed >> crosswind component
 * in the conditions this app green-lights for flight).
 */
function groundspeedForBearing(
  bearing: number,
  trimSpeedMs: number,
  windSpeedMs: number,
  windFromDeg: number,
): number {
  const windToDeg = (windFromDeg + 180) % 360;
  const angleDiffRad = ((bearing - windToDeg + 540) % 360 - 180) * (Math.PI / 180);
  const tailwindComponent = windSpeedMs * Math.cos(angleDiffRad);
  return Math.max(trimSpeedMs + tailwindComponent, 0);
}

/**
 * Computes the reachable-on-glide footprint after a simulated engine-out
 * (flameout), as a polygon around the pilot's current position, accounting
 * for wind drift skewing the cone downwind.
 */
export function computeGlideCone(input: GlideConeInput): GlideConeResult {
  const {
    position,
    altitudeAglM,
    glideRatio,
    trimSpeedMs,
    windSpeedMs,
    windFromDeg,
    safetyMarginPct = 0.15,
    bearingResolutionDeg = 5,
  } = input;

  if (altitudeAglM <= 0) {
    return { sinkRateMs: 0, timeToGroundS: 0, polygon: [], minRangeM: 0, maxRangeM: 0 };
  }

  const sinkRateMs = trimSpeedMs / glideRatio;
  const timeToGroundS = altitudeAglM / sinkRateMs;

  const polygon: GlideConePolygonPoint[] = [];
  let minRangeM = Infinity;
  let maxRangeM = 0;

  for (let bearing = 0; bearing < 360; bearing += bearingResolutionDeg) {
    const groundspeed = groundspeedForBearing(bearing, trimSpeedMs, windSpeedMs, windFromDeg);
    const rangeM = groundspeed * timeToGroundS * (1 - safetyMarginPct);
    minRangeM = Math.min(minRangeM, rangeM);
    maxRangeM = Math.max(maxRangeM, rangeM);
    const dest = destinationPoint(position, bearing, rangeM);
    polygon.push({ ...dest, bearingDeg: bearing, rangeM });
  }

  return { sinkRateMs, timeToGroundS, polygon, minRangeM, maxRangeM };
}

/**
 * Fast check for "is this candidate LZ inside my glide footprint right now",
 * without building the full polygon: compares the actual distance/bearing to
 * the theoretical range achievable on that same bearing.
 */
export function isLzWithinGlide(
  input: GlideConeInput,
  lz: LatLon,
): { reachable: boolean; distanceM: number; rangeAtBearingM: number; marginM: number } {
  const distanceM = haversineDistanceM(input.position, lz);
  const bearing = bearingDeg(input.position, lz);

  if (input.altitudeAglM <= 0) {
    return { reachable: false, distanceM, rangeAtBearingM: 0, marginM: -distanceM };
  }

  const sinkRateMs = input.trimSpeedMs / input.glideRatio;
  const timeToGroundS = input.altitudeAglM / sinkRateMs;
  const groundspeed = groundspeedForBearing(
    bearing,
    input.trimSpeedMs,
    input.windSpeedMs,
    input.windFromDeg,
  );
  const rangeAtBearingM = groundspeed * timeToGroundS * (1 - (input.safetyMarginPct ?? 0.15));

  return {
    reachable: rangeAtBearingM >= distanceM,
    distanceM,
    rangeAtBearingM,
    marginM: rangeAtBearingM - distanceM,
  };
}

/**
 * Given a set of candidate emergency LZs, returns the ones currently
 * reachable on glide, sorted by largest safety margin first.
 */
export function findReachableLzs(
  input: GlideConeInput,
  candidates: Array<{ id: string } & LatLon>,
): Array<{ id: string; distanceM: number; marginM: number }> {
  return candidates
    .map((lz) => {
      const result = isLzWithinGlide(input, lz);
      return { id: lz.id, distanceM: result.distanceM, marginM: result.marginM };
    })
    .filter((r) => r.marginM >= 0)
    .sort((a, b) => b.marginM - a.marginM);
}
