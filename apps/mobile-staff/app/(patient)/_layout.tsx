import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@doktori/mobile-core";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

function icon(name: IconName) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );
}

export default function PatientLayout() {
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
        options={{ title: "Accueil", tabBarIcon: icon("home-outline") }}
      />
      <Tabs.Screen
        name="rendez-vous"
        options={{ title: "Rendez-vous", tabBarIcon: icon("calendar-outline") }}
      />
      <Tabs.Screen
        name="ordonnances"
        options={{ title: "Ordonnances", tabBarIcon: icon("document-text-outline") }}
      />
      <Tabs.Screen
        name="profil"
        options={{ title: "Profil", tabBarIcon: icon("person-outline") }}
      />
      {/* Hidden routes */}
      <Tabs.Screen name="messages" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="doctor/[slug]" options={{ href: null }} />
      <Tabs.Screen name="booking/[slug]" options={{ href: null }} />
      <Tabs.Screen name="chat/[id]" options={{ href: null }} />
    </Tabs>
  );
}
