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
import { colors, spacing, radii } from "@doktori/mobile-core";

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
  const [cacheCleared, setCacheCleared] = useState(false);

  function handleSoon() {
    Alert.alert("Bientôt disponible", "Cette fonctionnalité arrive prochainement.");
  }

  function handleClearCache() {
    Alert.alert(
      "Vider le cache",
      "Cette action supprimera les données temporaires de l'application. Continuer ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Vider",
          style: "destructive",
          onPress: () => {
            setCacheCleared(true);
            Alert.alert("Cache vidé", "Les données temporaires ont été supprimées.");
          },
        },
      ]
    );
  }

  function handleSupport() {
    Linking.openURL("mailto:support@doktori.tn").catch(() => {
      Alert.alert("Erreur", "Impossible d'ouvrir le client mail.");
    });
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.navigate("/(secretary)/settings" as never)} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={styles.title}>Paramètres</Text>
        </View>

        {/* Section: Affichage */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Affichage</Text>
          <View style={styles.card}>
            <MenuRow
              icon="language-outline"
              label="Langue"
              sublabel="Choisissez la langue de l'interface"
              value="Français"
              onPress={handleSoon}
            />
            <MenuRow
              icon="contrast-outline"
              label="Thème"
              sublabel="Clair, sombre ou automatique"
              value="Automatique"
              onPress={handleSoon}
              last
            />
          </View>
        </View>

        {/* Section: Données */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Données</Text>
          <View style={styles.card}>
            <MenuRow
              icon="trash-outline"
              label="Vider le cache"
              sublabel={cacheCleared ? "Cache vidé" : "Supprimer les données temporaires"}
              onPress={handleClearCache}
            />
            <MenuRow
              icon="information-circle-outline"
              label="Version de l'application"
              value="1.0.0"
              onPress={() => {}}
              last
            />
          </View>
        </View>

        {/* Section: À propos */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>À propos</Text>
          <View style={styles.card}>
            <MenuRow
              icon="document-text-outline"
              label="Conditions d'utilisation"
              sublabel="Lire nos conditions générales"
              onPress={() => router.navigate("/(secretary)/conditions" as never)}
            />
            <MenuRow
              icon="shield-checkmark-outline"
              label="Politique de confidentialité"
              sublabel="Comment nous traitons vos données"
              onPress={() => router.navigate("/(secretary)/confidentialite" as never)}
            />
            <MenuRow
              icon="information-circle-outline"
              label="À propos de Doktori"
              sublabel="Version, équipe et contact"
              onPress={() => router.navigate("/(secretary)/a-propos" as never)}
            />
            <MenuRow
              icon="mail-outline"
              label="Contacter le support"
              sublabel="support@doktori.tn"
              onPress={handleSupport}
              last
            />
          </View>
        </View>

        <Text style={styles.footer}>Doktori · Espace Secrétaire · v1.0.0</Text>
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
    fontSize: 11,
    fontWeight: "700",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },

  card: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: "hidden",
  },

  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.bgSecondary,
  },
  menuRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  menuIconWrap: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  menuIconWrapDanger: { backgroundColor: "#FEF2F2" },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  menuSublabel: { fontSize: 12, color: colors.foregroundSecondary, marginTop: 1 },
  menuValue: { fontSize: 13, color: colors.foregroundSecondary, marginRight: 4 },

  footer: {
    textAlign: "center",
    fontSize: 12,
    color: colors.border,
    marginTop: spacing.sm,
  },
});
