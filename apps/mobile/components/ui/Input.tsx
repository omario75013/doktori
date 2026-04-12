import { View, Text, TextInput, StyleSheet, TextInputProps } from "react-native";
import { colors, radius, spacing } from "@/lib/theme";

type Props = TextInputProps & { label: string; error?: string };

export function Input({ label, error, style, ...props }: Props) {
  return (
    <View style={{ marginTop: spacing.md }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[styles.input, error ? styles.inputError : undefined, style]}
        placeholderTextColor={colors.slate500}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "600", color: colors.ink, marginBottom: 6 },
  input: {
    backgroundColor: colors.bg, padding: 12, borderRadius: radius.sm,
    borderWidth: 1, borderColor: colors.slate200, fontSize: 15, color: colors.ink,
  },
  inputError: { borderColor: colors.red },
  error: { fontSize: 12, color: colors.red, marginTop: 4 },
});
