import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Linking, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { LogOut, Globe, Bell, Info, ClipboardHeart, ChevronRight, HelpCircle, FileText } from "lucide-react-native";
import { colors, spacing, radius } from "@/lib/theme";
import { getPatient, logout, type Patient } from "@/lib/auth";
import Constants from "expo-constants";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

export default function ProfilScreen() {
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);

  useEffect(() => {
    getPatient().then(setPatient);
  }, []);

  async function handleLogout() {
    Alert.alert("Déconnexion", "Voulez-vous vous déconnecter ?", [
      { text: "Non", style: "cancel" },
      {
        text: "Oui",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {patient?.name?.charAt(0) || patient?.phone?.slice(-2) || "?"}
          </Text>
        </View>
        <Text style={styles.name}>{patient?.name || "Patient"}</Text>
        <Text style={styles.phone}>{patient?.phone}</Text>
      </View>

      <Text style={styles.sectionLabel}>Santé</Text>
      <View style={styles.menu}>
        <MenuItem
          icon={ClipboardHeart}
          label="Mon dossier médical"
          onPress={() => router.push("/dossier-medical")}
          showChevron
        />
        <MenuItem
          icon={FileText}
          label="Mes ordonnances"
          value="Voir dans Mes RDV"
          onPress={() => router.push("/(tabs)/mes-rdv")}
          showChevron
        />
      </View>

      <Text style={styles.sectionLabel}>Paramètres</Text>
      <View style={styles.menu}>
        <MenuItem icon={Globe} label="Langue" value="Français" onPress={() => {}} />
        <MenuItem icon={Bell} label="Notifications" onPress={() => Linking.openSettings()} showChevron />
        <MenuItem icon={Info} label="Version" value={Constants.expoConfig?.version ?? "1.0.0"} />
      </View>

      <Text style={styles.sectionLabel}>Informations</Text>
      <View style={styles.menu}>
        <MenuItem
          icon={HelpCircle}
          label="FAQ"
          onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/faq`)}
          showChevron
        />
        <MenuItem
          icon={FileText}
          label="CGU"
          onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/legal/cgu`)}
          showChevron
        />
      </View>

      <Pressable style={styles.logoutBtn} onPress={handleLogout}>
        <LogOut size={18} color={colors.red} />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </Pressable>
    </ScrollView>
  );
}

function MenuItem({ icon: Icon, label, value, onPress, showChevron }: {
  icon: any; label: string; value?: string; onPress?: () => void; showChevron?: boolean;
}) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <Icon size={20} color={colors.slate500} />
      <Text style={styles.menuLabel}>{label}</Text>
      {value ? <Text style={styles.menuValue}>{value}</Text> : null}
      {showChevron && !value ? <ChevronRight size={16} color={colors.slate500} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate500,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.white, borderRadius: radius.lg, padding: spacing.xl,
    alignItems: "center", borderWidth: 1, borderColor: colors.border, marginBottom: spacing.md,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: colors.mist,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.md,
  },
  avatarText: { fontSize: 28, fontWeight: "700", color: colors.primary },
  name: { fontSize: 20, fontWeight: "700", color: colors.ink },
  phone: { fontSize: 14, color: colors.slate500, marginTop: 4 },
  menu: {
    backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, overflow: "hidden",
  },
  menuItem: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  menuLabel: { flex: 1, fontSize: 15, color: colors.ink },
  menuValue: { fontSize: 14, color: colors.slate500 },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.sm, marginTop: spacing.xl, padding: spacing.md,
  },
  logoutText: { fontSize: 15, fontWeight: "600", color: colors.red },
});
