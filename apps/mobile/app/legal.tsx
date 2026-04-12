import { View, Text, Pressable, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { ExternalLink, FileText, Shield, Scale, ChevronRight } from "lucide-react-native";
import { colors, spacing, radius, shadow } from "@/lib/theme";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

const LEGAL_LINKS = [
  { label: "Conditions générales d'utilisation", desc: "Règles d'utilisation de la plateforme", url: `${API_URL}/legal/cgu`, icon: FileText, color: colors.primary },
  { label: "Politique de confidentialité", desc: "Protection de vos données personnelles", url: `${API_URL}/legal/confidentialite`, icon: Shield, color: colors.green },
  { label: "Mentions légales", desc: "Informations sur l'éditeur du service", url: `${API_URL}/legal/mentions`, icon: Scale, color: colors.purple },
];

export default function LegalScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Informations légales" }} />
      <View style={styles.container}>
        <View style={[styles.card, shadow.sm]}>
          {LEGAL_LINKS.map((link, index) => {
            const Icon = link.icon;
            return (
              <Pressable
                key={link.url}
                style={[styles.row, index < LEGAL_LINKS.length - 1 && styles.rowBorder]}
                onPress={() => WebBrowser.openBrowserAsync(link.url)}
              >
                <View style={[styles.iconWrap, { backgroundColor: link.color + "15" }]}>
                  <Icon size={18} color={link.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{link.label}</Text>
                  <Text style={styles.rowDesc}>{link.desc}</Text>
                </View>
                <ChevronRight size={18} color={colors.slate400} />
              </Pressable>
            );
          })}
        </View>

        <Text style={styles.footer}>
          Doktori © {new Date().getFullYear()}{"\n"}
          Tous droits réservés
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.md },
  card: {
    backgroundColor: colors.white, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border, overflow: "hidden",
  },
  row: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    padding: spacing.md, paddingVertical: 16,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  iconWrap: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  rowLabel: { fontSize: 15, fontWeight: "600", color: colors.ink },
  rowDesc: { fontSize: 13, color: colors.slate400, marginTop: 2 },
  footer: {
    fontSize: 12, color: colors.slate400,
    textAlign: "center", marginTop: spacing.xl, lineHeight: 18,
  },
});
