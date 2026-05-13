import { Stack, router, useSegments } from "expo-router";
import { Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "@doktori/mobile-core";

/**
 * Nested stack for rendez-vous flow: list (index) → [id]/consultation
 * and [id]/questionnaire. Overrides the parent more/_layout back button so
 * that detail screens go back to the rendez-vous list, not to /plus.
 */
export default function RendezVousLayout() {
  const segments = useSegments();
  const isIndex = segments[segments.length - 1] === "rendez-vous";

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
            onPress={() => {
              if (isIndex) router.replace("/(doctor)/plus");
              else if (router.canGoBack()) router.back();
              else router.replace("/(doctor)/more/rendez-vous");
            }}
            hitSlop={10}
            style={{ padding: spacing.xs }}
          >
            <View>
              <Ionicons name="chevron-back" size={24} color={colors.foreground} />
            </View>
          </Pressable>
        ),
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]/consultation" />
      <Stack.Screen name="[id]/questionnaire" />
    </Stack>
  );
}
