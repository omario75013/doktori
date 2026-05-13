import { Stack } from "expo-router";

// Stack inside the "patients" tab so we can push a detail route ([id]) on top
// of the list (index) without losing the bottom tab bar — the parent Tabs in
// (doctor)/_layout.tsx still wraps this Stack.
export default function PatientsStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}
