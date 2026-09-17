import { create } from "zustand";
import type { PilotProfile } from "@aeroparamotor/core";

const defaultPilotProfile: PilotProfile = {
  id: "local-pilot",
  userEmail: "",
  displayName: "Piloto",
  experienceLevel: "intermediate",
  totalFlightHours: 0,
  pilotWeightKg: 80,
  equipmentWeightKg: 35,
  windTolerance: { maxSustainedWindKt: 15, maxGustKt: 20, maxCrosswindComponentKt: 10 },
  wing: {
    brand: "",
    model: "",
    sizeM2: 24,
    trimSpeedMs: 11,
    minSinkRateMs: 1.1,
    bestGlideRatio: 6.5,
    speedBarMaxReductionMs: 2,
    reflexProfile: true,
  },
  motor: {
    brand: "",
    model: "",
    aircraftType: "foot-launch",
    fuelBurnRateLph: 4.5,
    tankCapacityL: 10,
    reserveFuelL: 2,
  },
  emergencyContacts: [],
  safetyLink: {
    enabled: false,
    inactivityAlertMinutes: 2,
    impactDetectionEnabled: false,
  },
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

interface PilotStore {
  profile: PilotProfile;
  setProfile: (profile: PilotProfile) => void;
  updateProfile: (patch: Partial<PilotProfile>) => void;
}

export const usePilotStore = create<PilotStore>((set) => ({
  profile: defaultPilotProfile,
  setProfile: (profile) => set({ profile }),
  updateProfile: (patch) =>
    set((state) => ({ profile: { ...state.profile, ...patch, updatedAt: new Date().toISOString() } })),
}));
