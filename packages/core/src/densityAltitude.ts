const HPA_TO_INHG = 0.02953;
const ISA_SEA_LEVEL_PRESSURE_INHG = 29.92;
const ISA_SEA_LEVEL_TEMP_C = 15;
const ISA_LAPSE_RATE_C_PER_1000FT = 1.98;

export interface DensityAltitudeInput {
  fieldElevationFt: number;
  stationPressureHpa: number;
  outsideAirTempC: number;
}

/**
 * Standard FAA pressure-altitude + density-altitude approximation:
 * pressureAltitude corrects field elevation for non-standard station
 * pressure, then densityAltitude corrects that for non-ISA temperature.
 */
export function computeDensityAltitudeFt(input: DensityAltitudeInput): number {
  const stationPressureInHg = input.stationPressureHpa * HPA_TO_INHG;
  const pressureAltitudeFt =
    input.fieldElevationFt + (ISA_SEA_LEVEL_PRESSURE_INHG - stationPressureInHg) * 1000;

  const isaTempAtElevationC =
    ISA_SEA_LEVEL_TEMP_C - ISA_LAPSE_RATE_C_PER_1000FT * (input.fieldElevationFt / 1000);

  return pressureAltitudeFt + 120 * (input.outsideAirTempC - isaTempAtElevationC);
}
