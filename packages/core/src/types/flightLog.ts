export interface TrackPoint {
  timestampUtc: string;
  lat: number;
  lon: number;
  altitudeMslM: number;
  groundSpeedKt: number;
  verticalSpeedMs: number;
  headingDeg: number;
}

export interface MaintenanceAlert {
  component: "wing_canopy" | "wing_lines" | "spark_plug" | "piston" | "propeller" | "reduction_drive";
  triggeredAt: string;
  reason: string;
  hoursSinceLastInspection: number;
}

export interface FlightLog {
  id: string;
  pilotId: string;
  wingId: string;
  motorId: string;
  startedAtUtc: string;
  endedAtUtc: string;
  takeoffSiteId?: string;
  landingSiteId?: string;
  track: TrackPoint[];
  stats: {
    maxAltitudeMslM: number;
    maxAltitudeAglM: number;
    maxGroundSpeedKt: number;
    totalDistanceKm: number;
    engineTimeMinutes: number;
    flightDurationMinutes: number;
    avgClimbRateMs: number;
    avgDescentRateMs: number;
    fuelConsumedL: number;
  };
  weatherSnapshotId?: string;
  maintenanceAlertsTriggered: MaintenanceAlert[];
  exports: {
    gpxUrl?: string;
    kmlUrl?: string;
    igcUrl?: string;
  };
  notes?: string;
}
