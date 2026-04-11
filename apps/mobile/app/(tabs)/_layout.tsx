import { Tabs } from "expo-router";
import { Text } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: "#2563eb", headerStyle: { backgroundColor: "#fff" } }}>
      <Tabs.Screen
        name="index"
        options={{
          title: "Rechercher",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>🔍</Text>,
          headerTitle: "Doktori",
        }}
      />
      <Tabs.Screen
        name="mes-rdv"
        options={{
          title: "Mes RDV",
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>📅</Text>,
          headerTitle: "Mes rendez-vous",
        }}
      />
    </Tabs>
  );
}
