import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, t, useLocale } from "@doktori/mobile-core";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

function icon(name: IconName) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );
}

export default function PatientLayout() {
  useLocale(); // re-render on locale change so tab labels update
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: colors.foregroundSecondary,
        tabBarStyle: { borderTopColor: colors.border },
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
        name="ordonnances"
        options={{ title: t("patient.tabs.ordonnances"), tabBarIcon: icon("document-text-outline") }}
      />
      <Tabs.Screen
        name="profil"
        options={{ title: t("patient.tabs.profil"), tabBarIcon: icon("person-outline") }}
      />
      {/* Hidden routes */}
      <Tabs.Screen name="messages" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="doctor/[slug]" options={{ href: null }} />
      <Tabs.Screen name="booking/[slug]" options={{ href: null }} />
      <Tabs.Screen name="chat/[id]" options={{ href: null }} />
      <Tabs.Screen name="teleconsult/[appointmentId]" options={{ href: null }} />
      <Tabs.Screen name="favoris" options={{ href: null }} />
      <Tabs.Screen name="ma-famille" options={{ href: null }} />
      <Tabs.Screen name="avis/[appointmentId]" options={{ href: null }} />
    </Tabs>
  );
}
