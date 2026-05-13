import { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { colors, t, useLocale } from "@doktori/mobile-core";

/**
 * Radial/arc quick-action overlay rendered when user taps the centered "+"
 * FAB in the patient tab bar. Renders a semi-transparent backdrop with three
 * satellite buttons fanned out in an arc above the FAB position. The FAB
 * itself stays visible (rendered by the tab bar); we draw a rotated "×" on
 * top of it so it visually flips to a close icon while the overlay is open.
 *
 * Backdrop transparency approach: because expo-router Tabs renders the tab
 * bar as part of the layout (not a modal), an absolutely-positioned full
 * screen View inside this route sits ABOVE the screen content but BELOW the
 * tab bar — exactly what we want (FAB stays clickable / visible).
 */
export default function PlusRadialMenu() {
  useLocale();
  const anim = useRef(new Animated.Value(0)).current;

  useFocusEffect(
    useCallback(() => {
      anim.setValue(0);
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 60,
      }).start();
      return () => {
        anim.setValue(0);
      };
    }, [anim])
  );

  function close() {
    Animated.timing(anim, {
      toValue: 0,
      duration: 160,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      router.back();
    });
  }

  function go(path: string) {
    Animated.timing(anim, {
      toValue: 0,
      duration: 120,
      useNativeDriver: true,
    }).start(() => {
      router.replace(path as never);
    });
  }

  // Arc geometry (relative to bottom-center FAB position)
  const R = 110;
  const COS45 = Math.cos((45 * Math.PI) / 180);
  const SIN45 = Math.sin((45 * Math.PI) / 180);

  const items: Array<{
    key: string;
    label: string;
    icon: React.ComponentProps<typeof Ionicons>["name"];
    bg: string;
    iconColor: string;
    dx: number;
    dy: number;
    onPress: () => void;
  }> = [
    {
      key: "reserve",
      label: t("patient.plus.reserveRdv"),
      icon: "calendar-outline",
      bg: "#FFFFFF",
      iconColor: colors.teal,
      dx: -R * COS45,
      dy: -(R * SIN45 + 30),
      onPress: () => go("/(patient)/recherche"),
    },
    {
      key: "document",
      label: t("patient.plus.document"),
      icon: "document-attach-outline",
      bg: "#FFFFFF",
      iconColor: colors.teal,
      dx: 0,
      dy: -(R + 30),
      onPress: () => go("/(patient)/mes-documents"),
    },
    {
      key: "traitement",
      label: t("patient.plus.traitement"),
      icon: "medkit-outline",
      bg: "#FFFFFF",
      iconColor: colors.teal,
      dx: R * COS45,
      dy: -(R * SIN45 + 30),
      onPress: () => {
        Animated.timing(anim, {
          toValue: 0,
          duration: 120,
          useNativeDriver: true,
        }).start(() => {
          router.replace("/(patient)/dossier-medical" as never);
        });
      },
    },
  ];

  const backdropOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const closeRotate = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "45deg"],
  });

  return (
    <View style={styles.root} pointerEvents="box-none">
      {/* Dim backdrop — tap to close */}
      <Animated.View
        style={[styles.backdrop, { opacity: backdropOpacity }]}
        pointerEvents="auto"
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={close} />
      </Animated.View>

      {/* Anchor at bottom-center where the FAB sits */}
      <View style={styles.anchor} pointerEvents="box-none">
        {items.map((item) => {
          const translateX = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, item.dx],
          });
          const translateY = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0, item.dy],
          });
          const scale = anim.interpolate({
            inputRange: [0, 1],
            outputRange: [0.4, 1],
          });
          const opacity = anim;

          return (
            <Animated.View
              key={item.key}
              style={[
                styles.satellite,
                {
                  opacity,
                  transform: [{ translateX }, { translateY }, { scale }],
                },
              ]}
              pointerEvents="box-none"
            >
              <Pressable
                onPress={item.onPress}
                style={({ pressed }) => [
                  styles.satelliteBtn,
                  { backgroundColor: item.bg },
                  pressed && { opacity: 0.85 },
                ]}
                accessibilityRole="button"
                accessibilityLabel={item.label}
              >
                <Ionicons name={item.icon} size={26} color={item.iconColor} />
              </Pressable>
              <Text style={styles.satelliteLabel} numberOfLines={1}>
                {item.label}
              </Text>
            </Animated.View>
          );
        })}

        {/* Rotating × on top of the FAB position so + looks like × while open */}
        <Animated.View
          pointerEvents="auto"
          style={[
            styles.closeOverFab,
            { transform: [{ rotate: closeRotate }] },
          ]}
        >
          <Pressable
            onPress={close}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="close"
          >
            <Ionicons name="close" size={30} color="#FFFFFF" />
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  anchor: {
    position: "absolute",
    left: 0,
    right: 0,
    // Approximate vertical center of the FAB:
    // tab bar height (64) - paddingBottom (8) - fab marginTop (-22) means
    // FAB center sits roughly 6px above the bottom of the screen + 28 (half
    // the FAB) = ~34px from bottom of screen. We anchor satellites' bottom
    // edge there.
    bottom: 34,
    alignItems: "center",
    justifyContent: "center",
    height: 0,
  },
  satellite: {
    position: "absolute",
    alignItems: "center",
    width: 90,
  },
  satelliteBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 6,
    elevation: 6,
  },
  satelliteLabel: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  closeOverFab: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    bottom: -6,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
});
