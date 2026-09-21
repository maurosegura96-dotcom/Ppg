import { FlatList, StyleSheet, Text, View } from "react-native";
import type { FlightLog } from "@aeroparamotor/core";
import { colors, spacing, typography } from "../theme/tokens";

// Empty until local persistence (SQLite/expo-sqlite) + sync land — this
// screen's data contract is already the real FlightLog type from core.
const FLIGHT_LOGS: FlightLog[] = [];

export default function LogbookScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bitácora</Text>
      <FlatList
        data={FLIGHT_LOGS}
        keyExtractor={(log) => log.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.body}>{new Date(item.startedAtUtc).toLocaleDateString()}</Text>
            <Text style={styles.bodySecondary}>
              {item.stats.totalDistanceKm.toFixed(1)}km · {item.stats.flightDurationMinutes}min
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.card}>
            <Text style={styles.bodySecondary}>
              Aún no hay vuelos registrados. Cada vuelo en Modo Vuelo se guardará aquí automáticamente.
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md, gap: spacing.md },
  title: { ...typography.title, color: colors.textPrimary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: 2,
  },
  body: { ...typography.body, color: colors.textPrimary },
  bodySecondary: { ...typography.body, color: colors.textSecondary },
});
