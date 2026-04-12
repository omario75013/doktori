// apps/mobile/app/faq.tsx
import { useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { Stack, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { colors } from "@/lib/theme";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export default function FaqScreen() {
  const router = useRouter();

  useEffect(() => {
    WebBrowser.openBrowserAsync(`${API_URL}/faq`).finally(() => {
      // Return to previous screen after browser is dismissed
      router.back();
    });
  }, []);

  return (
    <>
      <Stack.Screen options={{ title: "FAQ" }} />
      <View style={styles.container} />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
});
