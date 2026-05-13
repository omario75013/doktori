import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";
import type { GestureResponderEvent } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, t, useLocale } from "@doktori/mobile-core";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

function icon(name: IconName) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );
}

/**
 * Custom centered FAB rendered in place of the middle tab. Tap launches
 * the plus.tsx route which shows a native Alert with quick actions.
 */
function FabButton({
  onPress,
  accessibilityState,
}: {
  onPress?: (e: GestureResponderEvent) => void;
  accessibilityState?: { selected?: boolean };
}) {
  return (
    <View style={styles.fabWrap} pointerEvents="box-none">
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel="plus"
        accessibilityState={accessibilityState}
        style={({ pressed }) => [styles.fab, pressed && { opacity: 0.85 }]}
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

export default function PatientLayout() {
  useLocale(); // re-render on locale change so tab labels update
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: colors.foregroundSecondary,
        tabBarStyle: {
          borderTopColor: colors.border,
          height: 64 + insets.bottom,
          paddingTop: 6,
          paddingBottom: 8 + insets.bottom,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: t("patient.tabs.home"), tabBarIcon: icon("home-outline") }}
      />
      <Tabs.Screen
        name="rendez-vous"
        options={{ title: t("patient.tabs.rdv"), tabBarIcon: icon("calendar-outline") }}
      />
      <Tabs.Screen
        name="plus"
        options={{
          title: "",
          tabBarIcon: () => null,
          tabBarLabel: () => null,
          tabBarButton: (props) => (
            <FabButton
              onPress={props.onPress}
              accessibilityState={props.accessibilityState as { selected?: boolean }}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="dossier-medical"
        options={{ title: t("patient.tabs.dossier"), tabBarIcon: icon("folder-outline") }}
      />
      <Tabs.Screen
        name="plus-menu"
        options={{ title: t("patient.tabs.plus"), tabBarIcon: icon("grid-outline") }}
      />
      {/* Hidden routes */}
      <Tabs.Screen name="profil" options={{ href: null }} />
      <Tabs.Screen name="ordonnances" options={{ href: null }} />
      <Tabs.Screen name="messages" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="doctor/[slug]" options={{ href: null }} />
      <Tabs.Screen name="booking/[slug]" options={{ href: null }} />
      <Tabs.Screen name="chat/[id]" options={{ href: null }} />
      <Tabs.Screen name="teleconsult/[appointmentId]" options={{ href: null }} />
      <Tabs.Screen name="favoris" options={{ href: null }} />
      <Tabs.Screen name="ma-famille" options={{ href: null }} />
      <Tabs.Screen name="avis/[appointmentId]" options={{ href: null }} />
      <Tabs.Screen name="recherche" options={{ href: null }} />
      <Tabs.Screen name="parametres" options={{ href: null }} />
      <Tabs.Screen name="mes-documents" options={{ href: null }} />
      <Tabs.Screen name="mon-parrainage" options={{ href: null }} />
      <Tabs.Screen name="domicile" options={{ href: null }} />
      <Tabs.Screen name="coach-ia" options={{ href: null }} />
      <Tabs.Screen name="comparer" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  fabWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -22, // raise above the tab bar
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
});
