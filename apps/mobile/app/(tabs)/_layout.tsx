import { Tabs } from "expo-router";
import { Search, Siren, Calendar, User } from "lucide-react-native";
import { colors } from "@/lib/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.slate500,
        tabBarStyle: { borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.white },
        headerTintColor: colors.ink,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Rechercher",
          tabBarIcon: ({ color, size }) => <Search size={size} color={color} />,
          headerTitle: "Doktori",
          headerTitleStyle: { fontWeight: "800", color: colors.ink },
        }}
      />
      <Tabs.Screen
        name="sos"
        options={{
          title: "SOS",
          tabBarIcon: ({ size }) => <Siren size={size} color={colors.red} />,
          tabBarLabelStyle: { color: colors.red, fontWeight: "700" },
          headerTitle: "SOS Docteur",
          headerStyle: { backgroundColor: "#FEF2F2" },
          headerTintColor: colors.red,
        }}
      />
      <Tabs.Screen
        name="mes-rdv"
        options={{
          title: "Mes RDV",
          tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} />,
          headerTitle: "Mes rendez-vous",
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
          headerTitle: "Mon profil",
        }}
      />
    </Tabs>
  );
}
