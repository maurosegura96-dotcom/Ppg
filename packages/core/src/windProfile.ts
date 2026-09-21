import type { WindLayer } from "./types/weatherSnapshot";

export interface RawWindPoint {
  altitudeAglM: number;
  speedKt: number;
  directionDeg: number; // meteorological convention: direction wind is coming FROM
}

function circularInterpolateDeg(a: number, b: number, t: number): number {
  // Interpolate along the shorter arc so e.g. 350° -> 10° crosses through 0°,
  // not the long way through 180°.
  let diff = ((b - a + 540) % 360) - 180;
  return (a + diff * t + 360) % 360;
}

/**
 * Providers like Open-Meteo expose wind at fixed heights (10/80/120/180m) and
 * at pressure levels (already converted upstream to AGL meters here), not at
 * the exact 100/300/500/1000m AGL bands this app standardizes on. This
 * linearly interpolates speed and circularly interpolates direction between
 * the two bracketing raw samples for each requested altitude, clamping to the
 * nearest sample when a target altitude falls outside the observed range.
 */
export function interpolateWindLayers(
  rawPoints: RawWindPoint[],
  targetAltitudesM: number[],
): WindLayer[] {
  if (rawPoints.length === 0) {
    return targetAltitudesM.map((altitudeAglM) => ({ altitudeAglM, speedKt: 0, directionDeg: 0 }));
  }

  const sorted = [...rawPoints].sort((a, b) => a.altitudeAglM - b.altitudeAglM);

  return targetAltitudesM.map((altitudeAglM) => {
    if (altitudeAglM <= sorted[0].altitudeAglM) {
      const p = sorted[0];
      return { altitudeAglM, speedKt: p.speedKt, directionDeg: p.directionDeg };
    }
    const last = sorted[sorted.length - 1];
    if (altitudeAglM >= last.altitudeAglM) {
      return { altitudeAglM, speedKt: last.speedKt, directionDeg: last.directionDeg };
    }

    let lower = sorted[0];
    let upper = sorted[sorted.length - 1];
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].altitudeAglM <= altitudeAglM && sorted[i + 1].altitudeAglM >= altitudeAglM) {
        lower = sorted[i];
        upper = sorted[i + 1];
        break;
      }
    }

    const span = upper.altitudeAglM - lower.altitudeAglM;
    const t = span === 0 ? 0 : (altitudeAglM - lower.altitudeAglM) / span;

    return {
      altitudeAglM,
      speedKt: lower.speedKt + (upper.speedKt - lower.speedKt) * t,
      directionDeg: circularInterpolateDeg(lower.directionDeg, upper.directionDeg, t),
    };
  });
}
