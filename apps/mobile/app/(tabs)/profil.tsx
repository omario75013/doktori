import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Linking, Alert, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import {
  LogOut, Globe, Bell, Info, ChevronRight, Shield, FileText,
  HelpCircle, Heart, User,
} from "lucide-react-native";
import { colors, spacing, radius, shadow } from "@/lib/theme";
import { getPatient, logout, type Patient } from "@/lib/auth";
import Constants from "expo-constants";

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
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      {/* Profile card */}
      <View style={[styles.profileCard, shadow.md]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {patient?.name?.charAt(0) || patient?.phone?.slice(-2) || "?"}
          </Text>
        </View>
        <Text style={styles.name}>{patient?.name || "Patient"}</Text>
        <Text style={styles.phone}>{patient?.phone}</Text>
      </View>

      {/* Quick actions */}
      <View style={styles.quickActions}>
        <Pressable style={[styles.quickAction, shadow.sm]} onPress={() => router.push("/dossier-medical")}>
          <View style={[styles.quickIcon, { backgroundColor: colors.primaryFaint }]}>
            <Heart size={20} color={colors.primary} />
          </View>
          <Text style={styles.quickLabel}>Dossier{"\n"}médical</Text>
        </Pressable>
        <Pressable style={[styles.quickAction, shadow.sm]} onPress={() => router.push("/(tabs)/mes-rdv")}>
          <View style={[styles.quickIcon, { backgroundColor: colors.greenFaint }]}>
            <FileText size={20} color={colors.green} />
          </View>
          <Text style={styles.quickLabel}>Mes{"\n"}rendez-vous</Text>
        </Pressable>
        <Pressable style={[styles.quickAction, shadow.sm]} onPress={() => router.push("/faq")}>
          <View style={[styles.quickIcon, { backgroundColor: "#FEF3C7" }]}>
            <HelpCircle size={20} color="#F59E0B" />
          </View>
          <Text style={styles.quickLabel}>Aide &{"\n"}FAQ</Text>
        </Pressable>
      </View>

      {/* Settings menu */}
      <View style={[styles.menuSection, shadow.sm]}>
        <Text style={styles.menuSectionTitle}>Paramètres</Text>
        <MenuItem icon={Globe} label="Langue" value="Français" />
        <MenuItem icon={Bell} label="Notifications" onPress={() => Linking.openSettings()} />
        <MenuItem icon={Shield} label="Confidentialité" onPress={() => router.push("/legal")} />
      </View>

      <View style={[styles.menuSection, shadow.sm]}>
        <Text style={styles.menuSectionTitle}>Informations</Text>
        <MenuItem icon={Info} label="Version" value={Constants.expoConfig?.version ?? "1.0.0"} />
        <MenuItem icon={FileText} label="Mentions légales" onPress={() => router.push("/legal")} />
      </View>

      {/* Logout */}
      <Pressable style={styles.logoutBtn} onPress={handleLogout}>
        <LogOut size={18} color={colors.red} />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </Pressable>
    </ScrollView>
  );
}

function MenuItem({ icon: Icon, label, value, onPress }: {
  icon: any; label: string; value?: string; onPress?: () => void;
}) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress} disabled={!onPress}>
      <View style={styles.menuIconWrap}>
        <Icon size={18} color={colors.slate500} />
      </View>
      <Text style={styles.menuLabel}>{label}</Text>
      {value && <Text style={styles.menuValue}>{value}</Text>}
      {onPress && <ChevronRight size={16} color={colors.slate400} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  profileCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: "center",
    margin: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
    borderWidth: 3,
    borderColor: colors.primaryLight,
  },
  avatarText: { fontSize: 30, fontWeight: "700", color: colors.primary },
  name: { fontSize: 22, fontWeight: "800", color: colors.ink, letterSpacing: -0.3 },
  phone: { fontSize: 14, color: colors.slate500, marginTop: 4 },
  quickActions: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  quickAction: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: { fontSize: 12, fontWeight: "600", color: colors.ink, textAlign: "center", lineHeight: 16 },
  menuSection: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  menuSectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.slate400,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    padding: spacing.md,
    paddingBottom: spacing.xs,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  menuIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  menuLabel: { flex: 1, fontSize: 15, color: colors.ink, fontWeight: "500" },
  menuValue: { fontSize: 14, color: colors.slate400 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    marginHorizontal: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.redFaint,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  logoutText: { fontSize: 15, fontWeight: "700", color: colors.red },
});
