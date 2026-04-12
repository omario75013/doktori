import { Tabs } from "expo-router";
import { Search, Siren, Calendar, User } from "lucide-react-native";
import { View, StyleSheet, Platform } from "react-native";
import { colors, shadow } from "@/lib/theme";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.slate400,
        tabBarStyle: {
          borderTopWidth: 0,
          paddingTop: 6,
          paddingBottom: Platform.OS === "ios" ? 24 : 10,
          height: Platform.OS === "ios" ? 84 : 64,
          backgroundColor: colors.white,
          ...shadow.md,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600", marginTop: 2 },
        headerStyle: { backgroundColor: colors.white, ...shadow.sm },
        headerTintColor: colors.ink,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Rechercher",
          tabBarIcon: ({ color, size }) => <Search size={size - 2} color={color} strokeWidth={2.2} />,
          headerTitle: "Doktori",
          headerTitleStyle: { fontWeight: "800", color: colors.primary, fontSize: 22, letterSpacing: -0.5 },
        }}
      />
      <Tabs.Screen
        name="sos"
        options={{
          title: "SOS",
          tabBarIcon: ({ size }) => (
            <View style={styles.sosIconWrap}>
              <Siren size={size - 4} color={colors.white} strokeWidth={2.2} />
            </View>
          ),
          tabBarLabelStyle: { color: colors.red, fontWeight: "700", fontSize: 11, marginTop: 2 },
          headerTitle: "SOS Docteur",
          headerStyle: { backgroundColor: colors.redFaint },
          headerTintColor: colors.red,
          headerTitleStyle: { fontWeight: "800", fontSize: 18 },
        }}
      />
      <Tabs.Screen
        name="mes-rdv"
        options={{
          title: "Mes RDV",
          tabBarIcon: ({ color, size }) => <Calendar size={size - 2} color={color} strokeWidth={2.2} />,
          headerTitle: "Mes rendez-vous",
          headerTitleStyle: { fontWeight: "700", fontSize: 18 },
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: "Profil",
          tabBarIcon: ({ color, size }) => <User size={size - 2} color={color} strokeWidth={2.2} />,
          headerTitle: "Mon profil",
          headerTitleStyle: { fontWeight: "700", fontSize: 18 },
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  sosIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -4,
  },
});
