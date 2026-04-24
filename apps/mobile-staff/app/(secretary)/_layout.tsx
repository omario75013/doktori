import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@doktori/mobile-core";
import { SecretaryBellListener } from "../../components/secretary-bell-listener";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

function icon(name: IconName) {
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );
}

export default function SecretaryLayout() {
  return (
    <>
      <SecretaryBellListener />
      <Tabs
        initialRouteName="dashboard"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.tealDark,
          tabBarInactiveTintColor: colors.foregroundSecondary,
          tabBarStyle: { borderTopColor: colors.border },
        }}
      >
        <Tabs.Screen name="dashboard"  options={{ title: "Accueil",    tabBarIcon: icon("grid") }} />
        <Tabs.Screen name="planning"   options={{ title: "Planning",   tabBarIcon: icon("calendar") }} />
        <Tabs.Screen name="patients"   options={{ title: "Patients",   tabBarIcon: icon("people") }} />
        <Tabs.Screen name="messages"   options={{ title: "Messagerie", tabBarIcon: icon("chatbubbles") }} />
        <Tabs.Screen name="settings"   options={{ title: "Plus",       tabBarIcon: icon("ellipsis-horizontal-circle") }} />

        {/* Hidden screens */}
        <Tabs.Screen name="a-propos"                  options={{ href: null }} />
        <Tabs.Screen name="bookings"                  options={{ href: null }} />
        <Tabs.Screen name="call/[id]"                 options={{ href: null }} />
        <Tabs.Screen name="chat/[id]"                 options={{ href: null }} />
        <Tabs.Screen name="conditions"                options={{ href: null }} />
        <Tabs.Screen name="confidentialite"           options={{ href: null }} />
        <Tabs.Screen name="informations-personnelles" options={{ href: null }} />
        <Tabs.Screen name="notifications"             options={{ href: null }} />
        <Tabs.Screen name="parametres"                options={{ href: null }} />
        <Tabs.Screen name="quick-add"                 options={{ href: null }} />
        <Tabs.Screen name="patient/[id]"              options={{ href: null }} />
      </Tabs>
    </>
  );
}

