import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../theme/tokens";

// MapLibre GL requires a native build (Expo Dev Client), not Expo Go, and
// has no web target — see docs/PRODUCT_SPEC.md section 1.4. This placeholder
// keeps the tab navigable and the web export green until
// @maplibre/maplibre-react-native is wired in with a dev-client build.
export default function MapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mapa</Text>
      <Text style={styles.body}>
        Pendiente: MapLibre GL con capas topo 3D / satelital / aeronáutica (OpenAIP) y descarga
        offline en PMTiles. Requiere un build de Expo Dev Client (no funciona en Expo Go).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md, gap: spacing.sm },
  title: { ...typography.title, color: colors.textPrimary },
  body: { ...typography.body, color: colors.textSecondary },
});
