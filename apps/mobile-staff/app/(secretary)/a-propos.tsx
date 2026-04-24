import { View, Text, ScrollView, StyleSheet, Pressable, Linking, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii } from "@doktori/mobile-core";

const APP_VERSION = "1.0.0";
const YEAR = new Date().getFullYear();

function InfoRow({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; value: string }) {
  return (
    <View style={s.infoRow}>
      <Ionicons name={icon} size={16} color={colors.teal} />
      <View style={{ flex: 1 }}>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function LinkRow({ icon, label, sublabel, onPress }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; sublabel?: string; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [s.linkRow, pressed && { opacity: 0.7 }]} onPress={onPress}>
      <View style={s.linkIcon}>
        <Ionicons name={icon} size={18} color={colors.teal} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.linkLabel}>{label}</Text>
        {sublabel ? <Text style={s.linkSublabel}>{sublabel}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.border} />
    </Pressable>
  );
}

export default function AProposScreen() {
  function openUrl(url: string) {
    Linking.openURL(url).catch(() => Alert.alert("Erreur", "Impossible d'ouvrir le lien."));
  }

  return (
    <SafeAreaView edges={["top"]} style={s.root}>
      <View style={s.header}>
        <Pressable onPress={() => router.navigate("/(secretary)/parametres" as never)} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={s.title}>À propos</Text>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Brand */}
        <View style={s.brand}>
          <View style={s.logoWrap}>
            <Ionicons name="medkit" size={36} color="#FFF" />
          </View>
          <Text style={s.appName}>Doktori</Text>
          <Text style={s.appTagline}>La santé numérique en Tunisie</Text>
          <View style={s.versionBadge}>
            <Text style={s.versionText}>Version {APP_VERSION}</Text>
          </View>
        </View>

        {/* App info */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Application</Text>
          <View style={s.card}>
            <InfoRow icon="globe-outline" label="Site web" value="doktori.tn" />
            <View style={s.divider} />
            <InfoRow icon="phone-portrait-outline" label="Version" value={APP_VERSION} />
            <View style={s.divider} />
            <InfoRow icon="calendar-outline" label="Dernière mise à jour" value="Avril 2026" />
            <View style={s.divider} />
            <InfoRow icon="flag-outline" label="Région" value="Tunisie 🇹🇳" />
          </View>
        </View>

        {/* Mission */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Notre mission</Text>
          <View style={s.missionCard}>
            <Text style={s.missionText}>
              Doktori est la plateforme de santé numérique de référence en Tunisie. Notre mission est de simplifier
              la gestion des rendez-vous médicaux, de fluidifier la communication entre professionnels de santé
              et de faciliter l'accès aux soins pour tous les patients.
            </Text>
          </View>
        </View>

        {/* Developer */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Développeur</Text>
          <View style={s.card}>
            <InfoRow icon="code-slash-outline" label="Agence" value="RandomWalkers" />
            <View style={s.divider} />
            <InfoRow icon="location-outline" label="Localisation" value="Tunis, Tunisie" />
            <View style={s.divider} />
            <InfoRow icon="globe-outline" label="Web" value="randomwalkers.tech" />
          </View>
        </View>

        {/* Contact */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>Contact & liens</Text>
          <View style={s.card}>
            <LinkRow
              icon="mail-outline"
              label="Contacter le support"
              sublabel="support@doktori.tn"
              onPress={() => Linking.openURL("mailto:support@doktori.tn").catch(() => {})}
            />
            <View style={s.divider} />
            <LinkRow
              icon="globe-outline"
              label="Site officiel"
              sublabel="doktori.tn"
              onPress={() => openUrl("https://doktori.tn")}
            />
          </View>
        </View>

        <Text style={s.copyright}>© {YEAR} RandomWalkers. Tous droits réservés.</Text>
        <Text style={s.copyright}>Doktori est une marque déposée en Tunisie.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.foreground },
  content: { padding: spacing.xl, gap: spacing.xl, paddingBottom: spacing["3xl"] },

  brand: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.lg },
  logoWrap: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: colors.teal, alignItems: "center", justifyContent: "center",
  },
  appName: { fontSize: 28, fontWeight: "800", color: colors.foreground },
  appTagline: { fontSize: 14, color: colors.foregroundSecondary, textAlign: "center" },
  versionBadge: {
    paddingHorizontal: spacing.md, paddingVertical: 4,
    borderRadius: radii.full, backgroundColor: colors.bgSecondary,
    borderWidth: 1, borderColor: colors.border,
  },
  versionText: { fontSize: 12, fontWeight: "600", color: colors.foregroundSecondary },

  section: { gap: spacing.sm },
  sectionLabel: {
    fontSize: 11, fontWeight: "700", color: colors.foregroundSecondary,
    textTransform: "uppercase", letterSpacing: 0.5, paddingHorizontal: 4,
  },
  card: {
    backgroundColor: colors.bgSecondary, borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.border, overflow: "hidden",
  },
  divider: { height: 1, backgroundColor: colors.border },

  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, padding: spacing.md },
  infoLabel: { fontSize: 12, color: colors.foregroundSecondary },
  infoValue: { fontSize: 14, fontWeight: "600", color: colors.foreground, marginTop: 1 },

  linkRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    padding: spacing.md, backgroundColor: colors.bgSecondary,
  },
  linkIcon: {
    width: 34, height: 34, borderRadius: radii.md,
    backgroundColor: colors.bg, alignItems: "center", justifyContent: "center",
  },
  linkLabel: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  linkSublabel: { fontSize: 12, color: colors.foregroundSecondary, marginTop: 1 },

  missionCard: {
    backgroundColor: colors.bgSecondary, borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg,
  },
  missionText: { fontSize: 14, color: colors.foreground, lineHeight: 22 },

  copyright: { textAlign: "center", fontSize: 11, color: colors.border },
});
