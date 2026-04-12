import { useRef } from "react";
import { Pressable, Text, ActivityIndicator, StyleSheet, ViewStyle, Animated } from "react-native";
import { colors, radius, shadow } from "@/lib/theme";

type Variant = "primary" | "secondary" | "danger" | "ghost";

type Props = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  icon?: React.ReactNode;
  size?: "sm" | "md" | "lg";
};

const VARIANTS: Record<Variant, { bg: string; text: string; border?: string }> = {
  primary: { bg: colors.primary, text: colors.white },
  secondary: { bg: colors.white, text: colors.primary, border: colors.primary },
  danger: { bg: colors.red, text: colors.white },
  ghost: { bg: "transparent", text: colors.primary },
};

const SIZES = {
  sm: { paddingVertical: 10, paddingHorizontal: 16, fontSize: 14 },
  md: { paddingVertical: 14, paddingHorizontal: 24, fontSize: 16 },
  lg: { paddingVertical: 18, paddingHorizontal: 32, fontSize: 17 },
};

export function Button({ title, onPress, variant = "primary", loading, disabled, style, icon, size = "md" }: Props) {
  const v = VARIANTS[variant];
  const s = SIZES[size];
  const scale = useRef(new Animated.Value(1)).current;

  function onPressIn() {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }
  function onPressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled || loading}
        style={[
          styles.base,
          { backgroundColor: v.bg, paddingVertical: s.paddingVertical, paddingHorizontal: s.paddingHorizontal },
          v.border ? { borderWidth: 1.5, borderColor: v.border } : undefined,
          variant === "primary" && shadow.md,
          (disabled || loading) && { opacity: 0.5 },
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={v.text} size="small" />
        ) : (
          <>
            {icon}
            <Text style={[styles.text, { color: v.text, fontSize: s.fontSize }]}>{title}</Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  text: { fontWeight: "700", letterSpacing: 0.2 },
});
