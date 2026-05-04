import { View, Text, ScrollView, StyleSheet, Pressable, Linking, Alert } from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, t, useLocale } from "@doktori/mobile-core";

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
  const { locale } = useLocale();
  function openUrl(url: string) {
    Linking.openURL(url).catch(() => Alert.alert(t("common.error"), t("common.error")));
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t("doctor.about.title"),
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={10} style={{ paddingHorizontal: spacing.sm }}>
              <Ionicons name="chevron-back" size={24} color={colors.foreground} />
            </Pressable>
          ),
        }}
      />
      <ScrollView style={s.root} contentContainerStyle={s.content}>
        {/* Brand */}
        <View style={s.brand}>
          <View style={s.logoWrap}>
            <Ionicons name="medkit" size={36} color="#FFF" />
          </View>
          <Text style={s.appName}>{t("doctor.about.appName")}</Text>
          <Text style={s.appTagline}>{t("doctor.about.tagline")}</Text>
          <View style={s.versionBadge}>
            <Text style={s.versionText}>{t("doctor.about.version")}</Text>
          </View>
        </View>

        {/* App info */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("doctor.about.sectionApp")}</Text>
          <View style={s.card}>
            <InfoRow icon="globe-outline" label={t("doctor.about.website")} value={t("doctor.about.websiteValue")} />
            <View style={s.divider} />
            <InfoRow icon="phone-portrait-outline" label={t("doctor.about.versionLabel")} value={APP_VERSION} />
            <View style={s.divider} />
            <InfoRow icon="calendar-outline" label={t("doctor.about.lastUpdate")} value={t("doctor.about.lastUpdateValue")} />
            <View style={s.divider} />
            <InfoRow icon="flag-outline" label={t("doctor.about.region")} value={t("doctor.about.regionValue")} />
          </View>
        </View>

        {/* Mission */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("doctor.about.missionTitle")}</Text>
          <View style={s.missionCard}>
            <Text style={s.missionText}>
              {t("doctor.about.missionText")}
            </Text>
          </View>
        </View>

        {/* Developer */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("doctor.about.sectionDev")}</Text>
          <View style={s.card}>
            <InfoRow icon="code-slash-outline" label={t("doctor.about.agency")} value={t("doctor.about.agencyValue")} />
            <View style={s.divider} />
            <InfoRow icon="location-outline" label={t("doctor.about.location")} value={t("doctor.about.locationValue")} />
            <View style={s.divider} />
            <InfoRow icon="globe-outline" label={t("doctor.about.web")} value={t("doctor.about.webValue")} />
          </View>
        </View>

        {/* Contact & Links */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>{t("doctor.about.sectionLinks")}</Text>
          <View style={s.card}>
            <LinkRow
              icon="mail-outline"
              label={t("doctor.about.support")}
              sublabel={t("doctor.about.supportEmail")}
              onPress={() => Linking.openURL("mailto:support@doktori.tn").catch(() => {})}
            />
            <View style={s.divider} />
            <LinkRow
              icon="globe-outline"
              label={t("doctor.about.officialSite")}
              sublabel={t("doctor.about.websiteValue")}
              onPress={() => openUrl("https://doktori.tn")}
            />
            <View style={s.divider} />
            <LinkRow
              icon="logo-linkedin"
              label={t("doctor.about.linkedin")}
              sublabel="linkedin.com/company/doktori"
              onPress={() => openUrl("https://linkedin.com/company/doktori")}
            />
          </View>
        </View>

        <Text style={s.copyright}>{t("doctor.about.copyright", { year: YEAR })}</Text>
        <Text style={s.copyright}>{t("doctor.about.trademark")}</Text>
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
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
  sectionTitle: {
    fontSize: 11, fontWeight: "700", color: colors.foregroundSecondary,
    textTransform: "uppercase", letterSpacing: 0.5, paddingHorizontal: 2,
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
