import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: "#fff" }, headerTintColor: "#2563eb" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="medecin/[slug]" options={{ title: "" }} />
      <Stack.Screen name="rdv/[slug]" options={{ title: "Prendre RDV" }} />
    </Stack>
  );
}
