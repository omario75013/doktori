import { Pressable, Text, ActivityIndicator, StyleSheet, ViewStyle } from "react-native";
import { colors, radius } from "@/lib/theme";

type Variant = "primary" | "secondary" | "danger";

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
};

const VARIANTS: Record<Variant, { bg: string; text: string; border?: string }> = {
  primary: { bg: colors.primary, text: colors.white },
  secondary: { bg: colors.white, text: colors.primary, border: colors.primary },
  danger: { bg: colors.red, text: colors.white },
};

export function Button({ title, onPress, variant = "primary", loading, disabled, style }: Props) {
  const v = VARIANTS[variant];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        { backgroundColor: v.bg },
        v.border ? { borderWidth: 2, borderColor: v.border } : undefined,
        (disabled || loading) && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.text} />
      ) : (
        <Text style={[styles.text, { color: v.text }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { paddingVertical: 16, paddingHorizontal: 24, borderRadius: radius.md, alignItems: "center" },
  text: { fontSize: 16, fontWeight: "600" },
});
