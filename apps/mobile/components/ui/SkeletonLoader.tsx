import { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, ViewStyle, Easing } from "react-native";
import { colors, radius } from "@/lib/theme";

type Props = { width?: number | string; height?: number; borderRadius?: number; style?: ViewStyle };

function SkeletonBox({ width = "100%", height = 16, borderRadius: br = radius.sm, style }: Props) {
  const opacity = useRef(new Animated.Value(0.3)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View style={[{ width: width as any, height, borderRadius: br, backgroundColor: colors.slate100, opacity }, style]} />
  );
}

export function DoctorCardSkeleton() {
  return (
    <View style={skStyles.card}>
      <SkeletonBox width={52} height={52} borderRadius={26} />
      <View style={{ flex: 1, gap: 8 }}>
        <SkeletonBox width="70%" height={14} />
        <SkeletonBox width="50%" height={12} />
        <SkeletonBox width="40%" height={12} />
      </View>
    </View>
  );
}

export function AppointmentCardSkeleton() {
  return (
    <View style={skStyles.apptCard}>
      <View style={skStyles.accentBar} />
      <View style={{ flex: 1, gap: 8, padding: 16 }}>
        <SkeletonBox width="60%" height={14} />
        <SkeletonBox width="40%" height={12} />
        <SkeletonBox width="80%" height={12} />
      </View>
    </View>
  );
}

export function ProfileSkeleton() {
  return (
    <View style={skStyles.profile}>
      <SkeletonBox width={80} height={80} borderRadius={40} />
      <SkeletonBox width={140} height={18} style={{ marginTop: 16 }} />
      <SkeletonBox width={100} height={14} style={{ marginTop: 8 }} />
    </View>
  );
}

export { SkeletonBox };

const skStyles = StyleSheet.create({
  card: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: colors.white, padding: 16, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, marginBottom: 8,
  },
  apptCard: {
    flexDirection: "row", backgroundColor: colors.white,
    borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border,
    marginBottom: 8, overflow: "hidden",
  },
  accentBar: { width: 4, backgroundColor: colors.slate100 },
  profile: { alignItems: "center", padding: 32 },
});
