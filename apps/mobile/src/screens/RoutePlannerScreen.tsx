import { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, View, Pressable } from "react-native";
import { bearingDeg, haversineDistanceM, type LatLon } from "@aeroparamotor/core";
import { colors, spacing, typography } from "../theme/tokens";
import { usePilotStore } from "../store/pilotStore";

interface DraftWaypoint extends LatLon {
  id: string;
  name: string;
}

const MS_TO_KT = 1.94384;

export default function RoutePlannerScreen() {
  const pilot = usePilotStore((s) => s.profile);
  const [waypoints, setWaypoints] = useState<DraftWaypoint[]>([]);
  const [latInput, setLatInput] = useState("");
  const [lonInput, setLonInput] = useState("");

  const addWaypoint = () => {
    const lat = Number(latInput);
    const lon = Number(lonInput);
    if (Number.isNaN(lat) || Number.isNaN(lon)) return;
    setWaypoints((prev) => [...prev, { id: `${Date.now()}`, name: `WP${prev.length + 1}`, lat, lon }]);
    setLatInput("");
    setLonInput("");
  };

  // No-wind estimate until this screen consumes the live WeatherSnapshot per
  // leg (see docs/PRODUCT_SPEC.md section 3, RoutePlan.legs.windComponent).
  const legs = useMemo(() => {
    const trimSpeedKt = pilot.wing.trimSpeedMs * MS_TO_KT;
    return waypoints.slice(1).map((to, i) => {
      const from = waypoints[i];
      const distanceM = haversineDistanceM(from, to);
      const distanceKm = distanceM / 1000;
      const trueTrackDeg = bearingDeg(from, to);
      const eteMinutes = trimSpeedKt > 0 ? (distanceKm / 1.852 / trimSpeedKt) * 60 : 0;
      const fuelBurnL = (eteMinutes / 60) * pilot.motor.fuelBurnRateLph;
      return { fromId: from.id, toId: to.id, distanceKm, trueTrackDeg, eteMinutes, fuelBurnL };
    });
  }, [waypoints, pilot.wing.trimSpeedMs, pilot.motor.fuelBurnRateLph]);

  const totals = legs.reduce(
    (acc, l) => ({
      distanceKm: acc.distanceKm + l.distanceKm,
      eteMinutes: acc.eteMinutes + l.eteMinutes,
      fuelL: acc.fuelL + l.fuelBurnL,
    }),
    { distanceKm: 0, eteMinutes: 0, fuelL: 0 },
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Planear Ruta</Text>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Lat"
          placeholderTextColor={colors.textSecondary}
          keyboardType="numbers-and-punctuation"
          value={latInput}
          onChangeText={setLatInput}
        />
        <TextInput
          style={styles.input}
          placeholder="Lon"
          placeholderTextColor={colors.textSecondary}
          keyboardType="numbers-and-punctuation"
          value={lonInput}
          onChangeText={setLonInput}
        />
        <Pressable style={styles.addButton} onPress={addWaypoint}>
          <Text style={styles.addButtonText}>+ WP</Text>
        </Pressable>
      </View>

      <FlatList
        data={waypoints}
        keyExtractor={(w) => w.id}
        style={styles.list}
        renderItem={({ item, index }) => (
          <View style={styles.waypointRow}>
            <Text style={styles.body}>
              {item.name} — {item.lat.toFixed(4)}, {item.lon.toFixed(4)}
            </Text>
            {index > 0 && legs[index - 1] && (
              <Text style={styles.bodySecondary}>
                {legs[index - 1].distanceKm.toFixed(1)}km · rumbo {Math.round(legs[index - 1].trueTrackDeg)}° ·
                ETE {Math.round(legs[index - 1].eteMinutes)}min
              </Text>
            )}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.bodySecondary}>Toca el mapa o ingresa coordenadas para agregar waypoints.</Text>}
      />

      {waypoints.length > 1 && (
        <View style={styles.totalsCard}>
          <Text style={styles.body}>Total: {totals.distanceKm.toFixed(1)}km</Text>
          <Text style={styles.body}>ETE: {Math.round(totals.eteMinutes)}min</Text>
          <Text style={styles.body}>
            Combustible: {totals.fuelL.toFixed(1)}L (+ {pilot.motor.reserveFuelL}L reserva)
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md, gap: spacing.md },
  title: { ...typography.title, color: colors.textPrimary },
  form: { flexDirection: "row", gap: spacing.sm },
  input: {
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  addButton: { backgroundColor: colors.accent, borderRadius: 10, paddingHorizontal: spacing.md, justifyContent: "center" },
  addButtonText: { color: colors.background, fontWeight: "700" },
  list: { flex: 1 },
  waypointRow: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 2,
  },
  totalsCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 2,
  },
  body: { ...typography.body, color: colors.textPrimary },
  bodySecondary: { ...typography.body, color: colors.textSecondary },
});
