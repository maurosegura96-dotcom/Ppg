import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, spacing, typography } from "../theme/tokens";
import { usePilotStore } from "../store/pilotStore";

function Field({ label, value, onChangeText, keyboardType }: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: "default" | "numeric";
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor={colors.textSecondary}
      />
    </View>
  );
}

export default function ProfileScreen() {
  const { profile, updateProfile } = usePilotStore();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Perfil</Text>

      <Text style={styles.sectionTitle}>Tolerancia de viento</Text>
      <Field
        label="Viento sostenido máx. (kt)"
        keyboardType="numeric"
        value={String(profile.windTolerance.maxSustainedWindKt)}
        onChangeText={(v) =>
          updateProfile({ windTolerance: { ...profile.windTolerance, maxSustainedWindKt: Number(v) || 0 } })
        }
      />
      <Field
        label="Ráfaga máx. (kt)"
        keyboardType="numeric"
        value={String(profile.windTolerance.maxGustKt)}
        onChangeText={(v) => updateProfile({ windTolerance: { ...profile.windTolerance, maxGustKt: Number(v) || 0 } })}
      />

      <Text style={styles.sectionTitle}>Ala</Text>
      <Field
        label="Trim speed (m/s)"
        keyboardType="numeric"
        value={String(profile.wing.trimSpeedMs)}
        onChangeText={(v) => updateProfile({ wing: { ...profile.wing, trimSpeedMs: Number(v) || 0 } })}
      />
      <Field
        label="Ratio de planeo (L/D)"
        keyboardType="numeric"
        value={String(profile.wing.bestGlideRatio)}
        onChangeText={(v) => updateProfile({ wing: { ...profile.wing, bestGlideRatio: Number(v) || 0 } })}
      />

      <Text style={styles.sectionTitle}>Motor</Text>
      <Field
        label="Consumo (L/h)"
        keyboardType="numeric"
        value={String(profile.motor.fuelBurnRateLph)}
        onChangeText={(v) => updateProfile({ motor: { ...profile.motor, fuelBurnRateLph: Number(v) || 0 } })}
      />
      <Field
        label="Reserva mínima (L)"
        keyboardType="numeric"
        value={String(profile.motor.reserveFuelL)}
        onChangeText={(v) => updateProfile({ motor: { ...profile.motor, reserveFuelL: Number(v) || 0 } })}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, gap: spacing.sm },
  title: { ...typography.title, color: colors.textPrimary, marginBottom: spacing.sm },
  sectionTitle: { ...typography.hudLabel, color: colors.textSecondary, marginTop: spacing.md },
  field: { gap: 4 },
  fieldLabel: { ...typography.body, color: colors.textPrimary },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.textPrimary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
});
