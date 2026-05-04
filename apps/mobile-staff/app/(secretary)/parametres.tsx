import { useState } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  StyleSheet,
  ScrollView,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors, spacing, radii, t, useLocale, changeLocale } from "@doktori/mobile-core";

type MenuRowProps = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  sublabel?: string;
  value?: string;
  onPress: () => void;
  last?: boolean;
  danger?: boolean;
};

function MenuRow({ icon, label, sublabel, value, onPress, last, danger }: MenuRowProps) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuRow, !last && styles.menuRowBorder, pressed && { opacity: 0.7 }]}
      onPress={onPress}
    >
      <View style={[styles.menuIconWrap, danger && styles.menuIconWrapDanger]}>
        <Ionicons name={icon} size={18} color={danger ? colors.danger : colors.teal} />
      </View>
      <View style={styles.menuText}>
        <Text style={[styles.menuLabel, danger && { color: colors.danger }]}>{label}</Text>
        {sublabel ? <Text style={styles.menuSublabel}>{sublabel}</Text> : null}
      </View>
      {value ? <Text style={styles.menuValue}>{value}</Text> : null}
      <Ionicons name="chevron-forward" size={16} color={colors.border} />
    </Pressable>
  );
}

export default function ParametresScreen() {
  const { locale } = useLocale();
  const [cacheCleared, setCacheCleared] = useState(false);

  function handleSoon() {
    Alert.alert(t("doctor.parametres.comingSoon"), t("doctor.parametres.comingSoonDesc"));
  }

  function handleClearCache() {
    Alert.alert(
      t("doctor.parametres.clearCacheTitle"),
      t("doctor.parametres.clearCacheConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("doctor.parametres.clearCacheBtn"),
          style: "destructive",
          onPress: () => {
            setCacheCleared(true);
            Alert.alert(t("doctor.parametres.cacheCleared"), t("doctor.parametres.cacheClearedDesc"));
          },
        },
      ]
    );
  }

  function handleSupport() {
    Linking.openURL("mailto:support@doktori.tn").catch(() => {
      Alert.alert(t("common.error"), t("doctor.parametres.mailError"));
    });
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.navigate("/(secretary)/settings" as never)} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={styles.title}>{t("doctor.parametres.title")}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("doctor.parametres.displaySection")}</Text>
          <View style={styles.card}>
            <View style={[styles.menuRow, styles.menuRowBorder]}>
              <View style={styles.menuIconWrap}>
                <Ionicons name="language-outline" size={18} color={colors.teal} />
              </View>
              <View style={styles.menuText}>
                <Text style={styles.menuLabel}>{t("doctor.parametres.language")}</Text>
              </View>
              <View style={styles.langRow}>
                <Pressable
                  onPress={() => changeLocale("fr")}
                  style={[styles.langBtn, locale === "fr" && styles.langBtnActive]}
                >
                  <Text style={[styles.langBtnText, locale === "fr" && styles.langBtnTextActive]}>
                    {t("doctor.parametres.languageFr")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => changeLocale("ar")}
                  style={[styles.langBtn, locale === "ar" && styles.langBtnActive]}
                >
                  <Text style={[styles.langBtnText, locale === "ar" && styles.langBtnTextActive]}>
                    {t("doctor.parametres.languageAr")}
                  </Text>
                </Pressable>
              </View>
            </View>
            <MenuRow
              icon="contrast-outline"
              label={t("doctor.parametres.theme")}
              sublabel={t("doctor.parametres.themeHint")}
              value={t("doctor.parametres.themeAuto")}
              onPress={handleSoon}
              last
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("doctor.parametres.dataSection")}</Text>
          <View style={styles.card}>
            <MenuRow
              icon="trash-outline"
              label={t("doctor.parametres.clearCache")}
              sublabel={cacheCleared ? t("doctor.parametres.cacheCleared") : t("doctor.parametres.clearCacheDesc")}
              onPress={handleClearCache}
            />
            <MenuRow
              icon="information-circle-outline"
              label={t("doctor.parametres.appVersion")}
              value="1.0.0"
              onPress={() => {}}
              last
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("doctor.parametres.aboutSection")}</Text>
          <View style={styles.card}>
            <MenuRow
              icon="document-text-outline"
              label={t("doctor.parametres.conditions")}
              sublabel={t("doctor.parametres.conditionsDesc")}
              onPress={() => router.navigate("/(secretary)/conditions" as never)}
            />
            <MenuRow
              icon="shield-checkmark-outline"
              label={t("doctor.parametres.privacy")}
              sublabel={t("doctor.parametres.privacyDesc")}
              onPress={() => router.navigate("/(secretary)/confidentialite" as never)}
            />
            <MenuRow
              icon="information-circle-outline"
              label={t("doctor.parametres.about")}
              sublabel={t("doctor.parametres.aboutDesc")}
              onPress={() => router.navigate("/(secretary)/a-propos" as never)}
            />
            <MenuRow
              icon="mail-outline"
              label={t("doctor.parametres.support")}
              sublabel={t("doctor.parametres.supportEmail")}
              onPress={handleSupport}
              last
            />
          </View>
        </View>

        <Text style={styles.footer}>Doktori · {t("secretary.settings.spaceLabel")} · v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: spacing["3xl"], gap: spacing.lg },
  header: {
    flexDirection: "row",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    alignItems: "center",
    gap: spacing.md,
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.foreground },
  section: { gap: spacing.sm, paddingHorizontal: spacing.xl },
  sectionLabel: {
    fontSize: 11, fontWeight: "700", color: colors.foregroundSecondary,
    textTransform: "uppercase", letterSpacing: 0.5, paddingHorizontal: 4,
  },
  card: {
    backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.lg, overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row", alignItems: "center", padding: spacing.md,
    gap: spacing.md, backgroundColor: colors.bg,
  },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  menuIconWrap: {
    width: 34, height: 34, borderRadius: radii.md, backgroundColor: colors.bgSecondary,
    alignItems: "center", justifyContent: "center",
  },
  menuIconWrapDanger: { backgroundColor: "#FEF2F2" },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  menuSublabel: { fontSize: 12, color: colors.foregroundSecondary, marginTop: 1 },
  menuValue: { fontSize: 13, color: colors.foregroundSecondary },
  langRow: { flexDirection: "row", gap: spacing.xs },
  langBtn: {
    paddingHorizontal: spacing.sm, paddingVertical: 5,
    borderRadius: radii.md, borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.bgSecondary,
  },
  langBtnActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  langBtnText: { fontSize: 13, fontWeight: "600", color: colors.foregroundSecondary },
  langBtnTextActive: { color: "#FFFFFF" },
  footer: { textAlign: "center", fontSize: 12, color: colors.border, marginTop: spacing.sm },
});
