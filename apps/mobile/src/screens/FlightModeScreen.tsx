import { useMemo, useState } from "react";
import { StyleSheet, Text, View, Pressable } from "react-native";
import { useKeepAwake } from "expo-keep-awake";
import { findReachableLzs, type LatLon } from "@aeroparamotor/core";
import { colors, spacing, typography } from "../theme/tokens";
import { usePilotStore } from "../store/pilotStore";
import { useLiveLocation } from "../hooks/useLiveLocation";

// Placeholder emergency-LZ set for the current flying area until the
// offline POI/LZ database (section 2.2 "Mapa") is wired in.
const SAMPLE_LZS: Array<{ id: string } & LatLon> = [
  { id: "campo-1", lat: 19.42, lon: -99.1 },
  { id: "campo-2", lat: 19.41, lon: -99.12 },
];

function Hud({ label, value, unit, valueColor }: { label: string; value: string; unit: string; valueColor?: string }) {
  return (
    <View style={styles.hudTile}>
      <Text style={styles.hudLabel}>{label}</Text>
      <Text style={[styles.hudValue, valueColor ? { color: valueColor } : null]}>
        {value}
        <Text style={styles.hudUnit}> {unit}</Text>
      </Text>
    </View>
  );
}

export default function FlightModeScreen() {
  useKeepAwake();
  const pilot = usePilotStore((s) => s.profile);
  const [inFlight, setInFlight] = useState(false);
  const location = useLiveLocation(inFlight);

  const glideCheck = useMemo(() => {
    if (location.status !== "active" || location.lat === undefined || location.lon === undefined) {
      return null;
    }
    // TODO: replace hardcoded field elevation / wind-from with the current
    // WeatherSnapshot for this position once the Home screen's fetch is
    // threaded through into Flight Mode.
    const fieldElevationM = 2240;
    const altitudeAglM = Math.max((location.altitudeMslM ?? fieldElevationM) - fieldElevationM, 0);

    return findReachableLzs(
      {
        position: { lat: location.lat, lon: location.lon },
        altitudeAglM,
        glideRatio: pilot.wing.bestGlideRatio,
        trimSpeedMs: pilot.wing.trimSpeedMs,
        windSpeedMs: 4,
        windFromDeg: 270,
      },
      SAMPLE_LZS,
    );
  }, [location, pilot.wing]);

  const verticalSpeed = location.verticalSpeedMs ?? 0;
  const varioColor = verticalSpeed > 0.3 ? colors.green : verticalSpeed < -1.5 ? colors.red : colors.textPrimary;

  return (
    <View style={styles.container}>
      {!inFlight ? (
        <View style={styles.startContainer}>
          <Text style={styles.title}>Modo Vuelo</Text>
          <Text style={styles.body}>
            Activa el GPS en vivo para ver el HUD de cabina (variómetro, altímetro, velocidad, cono de planeo).
          </Text>
          <Pressable style={styles.startButton} onPress={() => setInFlight(true)}>
            <Text style={styles.startButtonText}>Iniciar vuelo</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.hudGrid}>
            <Hud
              label="ALTITUD MSL"
              value={location.altitudeMslM ? Math.round(location.altitudeMslM).toString() : "—"}
              unit="m"
            />
            <Hud
              label="VARIÓMETRO"
              value={verticalSpeed.toFixed(1)}
              unit="m/s"
              valueColor={varioColor}
            />
            <Hud
              label="VELOCIDAD GPS"
              value={location.groundSpeedKt ? Math.round(location.groundSpeedKt).toString() : "0"}
              unit="kt"
            />
            <Hud
              label="RUMBO"
              value={location.headingDeg ? Math.round(location.headingDeg).toString() : "0"}
              unit="°"
            />
          </View>

          <View style={styles.glideBanner}>
            {location.status !== "active" ? (
              <Text style={styles.body}>Adquiriendo señal GPS…</Text>
            ) : glideCheck && glideCheck.length > 0 ? (
              <Text style={[styles.body, { color: colors.green }]}>
                {glideCheck.length} campo(s) alcanzable(s) en planeo — más cercano a{" "}
                {Math.round(glideCheck[0].distanceM)}m
              </Text>
            ) : (
              <Text style={[styles.body, { color: colors.red }]}>
                ⚠ Fuera de alcance de planeo de los campos conocidos
              </Text>
            )}
          </View>

          <Pressable style={styles.sosButton} onPress={() => setInFlight(false)}>
            <Text style={styles.sosButtonText}>Finalizar vuelo</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md },
  startContainer: { flex: 1, justifyContent: "center", alignItems: "center", gap: spacing.md },
  title: { ...typography.title, color: colors.textPrimary },
  body: { ...typography.body, color: colors.textSecondary, textAlign: "center" },
  startButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    marginTop: spacing.md,
  },
  startButtonText: { color: colors.background, fontWeight: "700", fontSize: 16 },
  hudGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.lg },
  hudTile: {
    flexBasis: "47%",
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 110,
  },
  hudLabel: { ...typography.hudLabel, color: colors.textSecondary },
  hudValue: { ...typography.hudValue, color: colors.textPrimary, marginTop: spacing.xs },
  hudUnit: { fontSize: 16, fontWeight: "400", color: colors.textSecondary },
  glideBanner: {
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceRaised,
    borderRadius: 12,
    padding: spacing.md,
  },
  sosButton: {
    marginTop: "auto",
    backgroundColor: colors.red,
    borderRadius: 16,
    paddingVertical: spacing.lg,
    alignItems: "center",
  },
  sosButtonText: { color: colors.textPrimary, fontWeight: "700", fontSize: 18 },
});
