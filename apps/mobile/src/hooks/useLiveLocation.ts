import { useEffect, useRef, useState } from "react";
import * as Location from "expo-location";

export interface LiveLocationState {
  status: "requesting-permission" | "denied" | "acquiring" | "active" | "error";
  lat?: number;
  lon?: number;
  altitudeMslM?: number;
  groundSpeedKt?: number;
  headingDeg?: number;
  verticalSpeedMs?: number;
  errorMessage?: string;
}

const MS_TO_KT = 1.94384;

/** Streams GPS fixes at flight-relevant cadence and derives vertical speed
 * from consecutive altitude samples (expo-location doesn't expose it directly
 * on Android). */
export function useLiveLocation(enabled: boolean): LiveLocationState {
  const [state, setState] = useState<LiveLocationState>({ status: "requesting-permission" });
  const lastSample = useRef<{ altitudeMslM: number; timestampMs: number } | null>(null);

  useEffect(() => {
    if (!enabled) {
      setState({ status: "requesting-permission" });
      lastSample.current = null;
      return;
    }

    let subscription: Location.LocationSubscription | undefined;
    let cancelled = false;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;
      if (status !== "granted") {
        setState({ status: "denied" });
        return;
      }

      setState((s) => ({ ...s, status: "acquiring" }));

      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 0 },
        (loc) => {
          const nowMs = loc.timestamp;
          const altitudeMslM = loc.coords.altitude ?? 0;
          let verticalSpeedMs = 0;
          if (lastSample.current) {
            const dtS = (nowMs - lastSample.current.timestampMs) / 1000;
            if (dtS > 0) {
              verticalSpeedMs = (altitudeMslM - lastSample.current.altitudeMslM) / dtS;
            }
          }
          lastSample.current = { altitudeMslM, timestampMs: nowMs };

          setState({
            status: "active",
            lat: loc.coords.latitude,
            lon: loc.coords.longitude,
            altitudeMslM,
            groundSpeedKt: (loc.coords.speed ?? 0) * MS_TO_KT,
            headingDeg: loc.coords.heading ?? 0,
            verticalSpeedMs,
          });
        },
      );
    })().catch((err) => setState({ status: "error", errorMessage: String(err) }));

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [enabled]);

  return state;
}
