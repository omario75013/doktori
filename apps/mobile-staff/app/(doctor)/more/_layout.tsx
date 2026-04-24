import { Stack, router } from "expo-router";
import { useEffect } from "react";
import { BackHandler, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "@doktori/mobile-core";

/**
 * The `more/*` stack sits inside the (hidden) "more" tab. Left un-managed,
 * Expo Router accumulates history across taps from the Plus menu (each push
 * stacks on top of the previous, so "back" from Stats goes to CNAM instead of
 * the Plus menu).
 *
 * We override back: both the custom header chevron and the Android hardware
 * back button route to /plus. Every more/* screen feels like a modal pushed
 * from Plus, and back always returns there.
 */
export default function MoreLayout() {
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      router.replace("/(doctor)/plus");
      return true;
    });
    return () => sub.remove();
  }, []);

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.foreground,
        headerTitleStyle: { fontWeight: "700" },
        headerShadowVisible: false,
        headerBackVisible: false,
        headerLeft: () => (
          <Pressable
            onPress={() => router.replace("/(doctor)/plus")}
            hitSlop={10}
            style={{ padding: spacing.xs }}
          >
            <View>
              <Ionicons name="chevron-back" size={24} color={colors.foreground} />
            </View>
          </Pressable>
        ),
      }}
    />
  );
}
