export type WeatherModel = "ECMWF" | "GFS" | "ICON-D2" | "HRRR";

export type FlyabilityLevel = "green" | "yellow" | "red";

export interface WindLayer {
  altitudeAglM: number; // 0 (surface), 100, 300, 500, 1000...
  speedKt: number;
  directionDeg: number; // direction wind is coming FROM
  gustKt?: number;
}

export interface FlyabilityScore {
  level: FlyabilityLevel;
  score: number; // 0-100
  contributingFactors: Array<{
    factor:
      | "surface_wind"
      | "gust_factor"
      | "wind_shear"
      | "thermal_activity"
      | "density_altitude"
      | "turbulence"
      | "pilot_experience_margin";
    weight: number;
    value: number;
    penalty: number;
  }>;
  bestWindowsLocalTime: Array<{ startsAt: string; endsAt: string }>;
}

export interface WeatherSnapshot {
  id: string;
  siteId?: string;
  lat: number;
  lon: number;
  timestampUtc: string;
  model: WeatherModel;
  surfaceWind: {
    speedKt: number;
    gustKt: number;
    directionDeg: number;
  };
  windLayers: WindLayer[]; // includes 100/300/500/1000m AGL
  windShearIndex: number; // computed delta between adjacent layers
  temperatureC: number;
  dewpointC: number;
  relativeHumidityPct: number;
  pressureHpa: number;
  densityAltitudeFt: number;
  capeJkg: number;
  thermalGradientCPer1000ft: number;
  inversionLayer?: {
    present: boolean;
    baseAltitudeFt: number;
  };
  turbulenceIndex: number; // 0-10 normalized
  flyability: FlyabilityScore;
}
