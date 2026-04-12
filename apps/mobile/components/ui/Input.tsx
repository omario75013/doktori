import { useState } from "react";
import { View, Text, TextInput, StyleSheet, TextInputProps, Animated } from "react-native";
import { colors, radius, spacing, shadow } from "@/lib/theme";

type Props = TextInputProps & { label?: string; error?: string; hint?: string };

export function Input({ label, error, hint, style, onFocus, onBlur, ...props }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ marginTop: spacing.md }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[
        styles.inputWrap,
        focused && styles.inputFocused,
        error ? styles.inputError : undefined,
        focused && shadow.sm,
      ]}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={colors.slate400}
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          {...props}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {hint && !error ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "600", color: colors.ink, marginBottom: 6, letterSpacing: 0.1 },
  inputWrap: {
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.slate200,
  },
  inputFocused: { borderColor: colors.primary, backgroundColor: colors.white },
  inputError: { borderColor: colors.red },
  input: {
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: colors.ink,
  },
  error: { fontSize: 12, color: colors.red, marginTop: 4, fontWeight: "500" },
  hint: { fontSize: 12, color: colors.slate400, marginTop: 4 },
});
