import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../theme/tokens";

// Metro resolves this file for the web platform automatically (the .web.tsx
// suffix), so the native-only MapLibre module in MapScreen.tsx is never
// touched by the web bundle -- see docs/PRODUCT_SPEC.md section 1.4.
export default function MapScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mapa</Text>
      <Text style={styles.body}>
        El mapa interactivo (MapLibre, capas topo/satelital/espacio aéreo) requiere un build nativo de
        Android/iOS — no está disponible en la vista web de desarrollo. Ábrelo desde la app instalada en
        tu celular.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.md, gap: spacing.sm },
  title: { ...typography.title, color: colors.textPrimary },
  body: { ...typography.body, color: colors.textSecondary },
});
