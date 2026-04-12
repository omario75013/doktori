import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Linking, Alert, ScrollView, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { LogOut, Globe, Bell, Info, Video } from "lucide-react-native";
import { colors, spacing, radius } from "@/lib/theme";
import { getPatient, logout, type Patient } from "@/lib/auth";
import { api } from "@/lib/api";
import Constants from "expo-constants";

type TeleconsultAppointment = {
  id: string;
  doctorName: string;
  specialty: string;
  date: string;
  startTime: string;
  status: string;
  type: string;
};

export default function ProfilScreen() {
  const router = useRouter();
  const [patient, setPatient] = useState<Patient | null>(null);
  const [teleconsults, setTeleconsults] = useState<TeleconsultAppointment[]>([]);
  const [loadingTeleconsults, setLoadingTeleconsults] = useState(true);

  useEffect(() => {
    getPatient().then(setPatient);
  }, []);

  useEffect(() => {
    api.getMyTeleconsultAppointments()
      .then((appts) => {
        // Show only upcoming appointments (scheduled or confirmed)
        const upcoming = appts.filter(
          (a) => a.status === "scheduled" || a.status === "confirmed"
        );
        setTeleconsults(upcoming);
      })
      .catch(() => setTeleconsults([]))
      .finally(() => setLoadingTeleconsults(false));
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

  function formatAppointmentDate(date: string, time: string): string {
    const d = new Date(`${date}T${time}`);
    return d.toLocaleDateString("fr-FR", {
      weekday: "short",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {patient?.name?.charAt(0) || patient?.phone?.slice(-2) || "?"}
          </Text>
        </View>
        <Text style={styles.name}>{patient?.name || "Patient"}</Text>
        <Text style={styles.phone}>{patient?.phone}</Text>
      </View>

      {/* Mes rendez-vous vidéo */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Video size={18} color={styles.sectionTitle.color} />
          <Text style={styles.sectionTitle}>Mes rendez-vous vidéo</Text>
        </View>

        {loadingTeleconsults ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.sm }} />
        ) : teleconsults.length === 0 ? (
          <Text style={styles.emptyText}>Aucune consultation vidéo à venir</Text>
        ) : (
          teleconsults.map((appt) => (
            <View key={appt.id} style={styles.teleconsultCard}>
              <View style={styles.teleconsultInfo}>
                <Text style={styles.teleconsultDoctor}>{appt.doctorName}</Text>
                <Text style={styles.teleconsultSpecialty}>{appt.specialty}</Text>
                <Text style={styles.teleconsultDate}>
                  {formatAppointmentDate(appt.date, appt.startTime)}
                </Text>
              </View>
              <Pressable
                style={styles.joinBtn}
                onPress={() => router.push(`/teleconsult/${appt.id}` as any)}
              >
                <Video size={14} color={colors.white} />
                <Text style={styles.joinBtnText}>Rejoindre</Text>
              </Pressable>
            </View>
          ))
        )}
      </View>

      <View style={styles.menu}>
        <MenuItem icon={Globe} label="Langue" value="Français" onPress={() => {}} />
        <MenuItem icon={Bell} label="Notifications" onPress={() => Linking.openSettings()} />
        <MenuItem icon={Info} label="Version" value={Constants.expoConfig?.version ?? "1.0.0"} />
      </View>

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
    <Pressable style={styles.menuItem} onPress={onPress}>
      <Icon size={20} color={colors.slate500} />
      <Text style={styles.menuLabel}>{label}</Text>
      {value ? <Text style={styles.menuValue}>{value}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
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

  section: {
    backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md,
  },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
  emptyText: { fontSize: 13, color: colors.slate500, textAlign: "center", paddingVertical: spacing.sm },

  teleconsultCard: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border,
  },
  teleconsultInfo: { flex: 1, marginRight: spacing.sm },
  teleconsultDoctor: { fontSize: 14, fontWeight: "600", color: colors.ink },
  teleconsultSpecialty: { fontSize: 12, color: colors.slate500, marginTop: 2 },
  teleconsultDate: { fontSize: 12, color: colors.primary, marginTop: 2 },
  joinBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "#7C3AED", paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  joinBtnText: { fontSize: 13, fontWeight: "600", color: colors.white },

  menu: {
    backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, overflow: "hidden", marginBottom: spacing.md,
  },
  menuItem: {
    flexDirection: "row", alignItems: "center", gap: 12, padding: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  menuLabel: { flex: 1, fontSize: 15, color: colors.ink },
  menuValue: { fontSize: 14, color: colors.slate500 },
  logoutBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: spacing.sm, marginTop: spacing.sm, padding: spacing.md,
  },
  logoutText: { fontSize: 15, fontWeight: "600", color: colors.red },
});
