import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Linking, Alert } from "react-native";
import { useRouter } from "expo-router";
import { LogOut, Globe, Bell, Info, HelpCircle, FileText } from "lucide-react-native";
import { colors, spacing, radius } from "@/lib/theme";
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
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {patient?.name?.charAt(0) || patient?.phone?.slice(-2) || "?"}
          </Text>
        </View>
        <Text style={styles.name}>{patient?.name || "Patient"}</Text>
        <Text style={styles.phone}>{patient?.phone}</Text>
      </View>

      <View style={styles.menu}>
        <MenuItem icon={Globe} label="Langue" value="Français" onPress={() => {}} />
        <MenuItem icon={Bell} label="Notifications" onPress={() => Linking.openSettings()} />
        <MenuItem icon={Info} label="Version" value={Constants.expoConfig?.version ?? "1.0.0"} />
      </View>

      <View style={[styles.menu, { marginTop: spacing.md }]}>
        <MenuItem icon={HelpCircle} label="FAQ" onPress={() => router.push("/faq")} />
        <MenuItem
          icon={FileText}
          label="Conditions d'utilisation"
          onPress={() => router.push("/legal")}
        />
      </View>

      <Pressable style={styles.logoutBtn} onPress={handleLogout}>
        <LogOut size={18} color={colors.red} />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </Pressable>
    </View>
  );
}

function MenuItem({ icon: Icon, label, value, onPress }: {
  icon: any; label: string; value?: string; onPress?: () => void;
}) {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <Icon size={20} color={colors.slate500} />
      <Text style={styles.menuLabel}>{label}</Text>
      {value ? <Text style={styles.menuValue}>{value}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.md },
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
