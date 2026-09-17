import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { WeatherSnapshot } from "@aeroparamotor/core";
import { colors, flyabilityColor, spacing, typography } from "../theme/tokens";

// Dev-only: point at the local API. In production this becomes an env var
// resolved per-environment (see apps/api README for the deploy target).
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:3001";

// Home site placeholder (Valle de Bravo, MX) until "favorite sites" (Perfil)
// picks a real one and GPS-based auto-detect lands.
const HOME_SITE = { lat: 19.1947, lon: -100.1339 };

type FetchState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; snapshots: WeatherSnapshot[] };

export default function HomeBriefingScreen() {
  const navigation = useNavigation<any>();
  const [state, setState] = useState<FetchState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${API_BASE_URL}/weather/snapshot?lat=${HOME_SITE.lat}&lon=${HOME_SITE.lon}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? `HTTP ${res.status}`);
        return res.json();
      })
      .then((body: { snapshots: WeatherSnapshot[] }) => setState({ status: "ready", snapshots: body.snapshots }))
      .catch((err) => {
        if (err.name === "AbortError") return;
        setState({ status: "error", message: String(err.message ?? err) });
      });
    return () => controller.abort();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Briefing de hoy</Text>
        <Pressable style={styles.flightButton} onPress={() => navigation.navigate("FlightMode")}>
          <Text style={styles.flightButtonText}>Modo Vuelo</Text>
        </Pressable>
      </View>

      {state.status === "loading" && (
        <View style={styles.centerBox}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}

      {state.status === "error" && (
        <View style={styles.card}>
          <Text style={[styles.body, { color: colors.red }]}>No se pudo cargar el briefing meteo.</Text>
          <Text style={styles.bodySecondary}>{state.message}</Text>
          <Text style={styles.bodySecondary}>
            Verifica que apps/api esté corriendo (npm run dev -w apps/api) y accesible en {API_BASE_URL}.
          </Text>
        </View>
      )}

      {state.status === "ready" &&
        (state.snapshots.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.body}>Sin datos de ningún modelo por ahora.</Text>
          </View>
        ) : (
          state.snapshots.map((snap) => (
            <View key={snap.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.modelLabel}>{snap.model}</Text>
                <View style={[styles.semaphore, { backgroundColor: flyabilityColor(snap.flyability.level) }]} />
              </View>
              <Text style={styles.scoreText}>Flyability Score: {snap.flyability.score}/100</Text>
              <Text style={styles.bodySecondary}>
                Viento superficie: {Math.round(snap.surfaceWind.speedKt)}kt (ráfagas{" "}
                {Math.round(snap.surfaceWind.gustKt)}kt) · Alt. densidad: {Math.round(snap.densityAltitudeFt)}ft
              </Text>
            </View>
          ))
        ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.md },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  title: { ...typography.title, color: colors.textPrimary },
  flightButton: { backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  flightButtonText: { color: colors.background, fontWeight: "700" },
  centerBox: { paddingVertical: spacing.xl, alignItems: "center" },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modelLabel: { ...typography.hudLabel, color: colors.textSecondary },
  semaphore: { width: 14, height: 14, borderRadius: 7 },
  scoreText: { fontSize: 20, fontWeight: "700", color: colors.textPrimary },
  body: { ...typography.body, color: colors.textPrimary },
  bodySecondary: { ...typography.body, color: colors.textSecondary },
});
