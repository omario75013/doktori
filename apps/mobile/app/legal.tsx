// apps/mobile/app/legal.tsx
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ExternalLink } from "lucide-react-native";
import { colors, spacing, radius } from "@/lib/theme";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

interface LegalLink {
  label: string;
  url: string;
}

const LEGAL_LINKS: LegalLink[] = [
  { label: "Conditions générales d'utilisation", url: `${API_URL}/legal/cgu` },
  { label: "Politique de confidentialité", url: `${API_URL}/legal/confidentialite` },
  { label: "Mentions légales", url: `${API_URL}/legal/mentions` },
];

export default function LegalScreen() {
  function openLink(url: string) {
    WebBrowser.openBrowserAsync(url);
  }

  return (
    <>
      <Stack.Screen options={{ title: "Informations légales" }} />
      <View style={styles.container}>
        <View style={styles.card}>
          {LEGAL_LINKS.map((link, index) => (
            <Pressable
              key={link.url}
              style={[styles.row, index < LEGAL_LINKS.length - 1 && styles.rowBorder]}
              onPress={() => openLink(link.url)}
            >
              <Text style={styles.rowLabel}>{link.label}</Text>
              <ExternalLink size={16} color={colors.slate500} />
            </Pressable>
          ))}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.md },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLabel: { fontSize: 15, color: colors.ink, flex: 1, marginRight: spacing.sm },
});
