export type WaypointType =
  | "takeoff"
  | "landing"
  | "checkpoint"
  | "emergency_lz"
  | "hazard_powerline"
  | "hazard_antenna"
  | "hazard_restricted_airspace";

export interface Waypoint {
  id: string;
  name: string;
  lat: number;
  lon: number;
  altitudeAglTargetM?: number;
  type: WaypointType;
  notes?: string;
}

export interface RouteLeg {
  fromWaypointId: string;
  toWaypointId: string;
  trueTrackDeg: number;
  magneticHeadingDeg: number;
  distanceKm: number;
  windComponent: {
    headwindKt: number; // negative = tailwind
    crosswindKt: number;
  };
  estimatedGroundspeedKt: number;
  estimatedTimeMinutes: number;
  estimatedFuelBurnL: number;
  glideCoverage: {
    reachableLzWithinGlide: boolean;
    nearestSafeLzId?: string;
    worstCaseGapKm?: number;
  };
}

export interface RoutePlan {
  id: string;
  pilotId: string;
  name: string;
  createdAt: string;
  weatherSnapshotId: string;
  waypoints: Waypoint[];
  legs: RouteLeg[];
  totals: {
    distanceKm: number;
    eteMinutes: number;
    fuelRequiredL: number;
    reserveFuelL: number;
    fuelMarginL: number;
  };
  airspaceWarnings: Array<{
    airspaceName: string;
    airspaceClass: string;
    proximityKm: number;
    legIndex: number;
  }>;
}
