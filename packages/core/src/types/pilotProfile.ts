export type ExperienceLevel =
  | "student"
  | "novice"
  | "intermediate"
  | "advanced"
  | "instructor";

export type AircraftType = "foot-launch" | "trike";

export interface WingProfile {
  brand: string;
  model: string;
  sizeM2: number;
  certification?: "LTF-A" | "LTF-B" | "LTF-C" | "LTF-D" | "uncertified";
  trimSpeedMs: number;
  minSinkRateMs: number;
  bestGlideRatio: number; // e.g. 6.5 (L/D)
  speedBarMaxReductionMs: number;
  reflexProfile: boolean;
}

export interface MotorProfile {
  brand: string;
  model: string;
  aircraftType: AircraftType;
  fuelBurnRateLph: number; // liters per hour at cruise throttle
  tankCapacityL: number;
  reserveFuelL: number; // minimum reserve the pilot commits to always land with
  propellerReductionRatio?: number;
}

export interface WindTolerance {
  maxSustainedWindKt: number;
  maxGustKt: number;
  maxCrosswindComponentKt: number;
}

export interface PilotProfile {
  id: string;
  userEmail: string;
  displayName: string;
  experienceLevel: ExperienceLevel;
  totalFlightHours: number;
  pilotWeightKg: number;
  equipmentWeightKg: number;
  windTolerance: WindTolerance;
  wing: WingProfile;
  motor: MotorProfile;
  homeSiteId?: string;
  emergencyContacts: Array<{
    name: string;
    phone: string;
    notifyOnSOS: boolean;
  }>;
  safetyLink: {
    enabled: boolean;
    inactivityAlertMinutes: number;
    impactDetectionEnabled: boolean;
    shareUrlToken?: string;
  };
  createdAt: string; // ISO 8601
  updatedAt: string;
}
