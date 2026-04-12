import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Calendar, Clock, MapPin, Stethoscope, CheckCircle2, XCircle, Bell } from "lucide-react-native";
import { apiFetch } from "@/lib/api";
import { colors, spacing, radius, shadow } from "@/lib/theme";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

type ReminderPreview = {
  doctorName?: string;
  doctorSpecialty?: string;
  date?: string;
  time?: string;
  location?: string;
};

export default function ReminderScreen() {
  const { token } = useLocalSearchParams<{ token: string }>();
  const router = useRouter();
  const [preview, setPreview] = useState<ReminderPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<"confirm" | "cancel" | null>(null);
  const [done, setDone] = useState<"confirm" | "cancel" | null>(null);

  useEffect(() => {
    apiFetch<ReminderPreview>(
      `/api/appointments/reminder-action/preview?token=${encodeURIComponent(token)}`
    )
      .then(setPreview)
      .catch(() => setPreview({}))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleAction(action: "confirm" | "cancel") {
    setActionLoading(action);
    try {
      await apiFetch("/api/appointments/reminder-action", {
        method: "POST",
        body: JSON.stringify({ token, action }),
      });
      setDone(action);
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Action impossible.");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) return <LoadingSpinner message="Chargement du rappel..." />;

  if (done) {
    const confirmed = done === "confirm";
    return (
      <View style={styles.resultContainer}>
        <View style={[styles.resultIconWrap, { backgroundColor: confirmed ? colors.greenFaint : colors.redFaint }, shadow.lg]}>
          {confirmed
            ? <CheckCircle2 size={56} color={colors.green} />
            : <XCircle size={56} color={colors.red} />}
        </View>
        <Text style={styles.resultTitle}>
          {confirmed ? "Présence confirmée" : "Rendez-vous annulé"}
        </Text>
        <Text style={styles.resultSubtitle}>
          {confirmed
            ? "Votre médecin a été notifié. À bientôt !"
            : "Votre rendez-vous a été annulé avec succès."}
        </Text>
        <Button
          title="Retour à l'accueil"
          onPress={() => router.replace("/(tabs)")}
          size="lg"
          style={{ width: "100%" }}
        />
      </View>
    );
  }

  const formattedDate = preview?.date
    ? new Date(preview.date).toLocaleDateString("fr-FR", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      })
    : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.bellIcon, shadow.md]}>
          <Bell size={28} color={colors.primary} />
        </View>
        <Text style={styles.heading}>Rappel de rendez-vous</Text>
        <Text style={styles.subtitle}>Confirmez-vous votre présence ?</Text>
      </View>

      {/* Appointment card */}
      <View style={[styles.card, shadow.md]}>
        {preview?.doctorName && (
          <DetailRow icon={<Stethoscope size={16} color={colors.primary} />} label="Médecin" value={`Dr. ${preview.doctorName}`} />
        )}
        {preview?.doctorSpecialty && (
          <DetailRow icon={<Stethoscope size={16} color={colors.slate400} />} label="Spécialité" value={preview.doctorSpecialty} />
        )}
        {formattedDate && (
          <DetailRow icon={<Calendar size={16} color={colors.primary} />} label="Date" value={formattedDate} />
        )}
        {preview?.time && (
          <DetailRow icon={<Clock size={16} color={colors.primary} />} label="Heure" value={preview.time} />
        )}
        {preview?.location && (
          <DetailRow icon={<MapPin size={16} color={colors.red} />} label="Lieu" value={preview.location} last />
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Confirmer ma présence"
          onPress={() => handleAction("confirm")}
          loading={actionLoading === "confirm"}
          disabled={actionLoading !== null}
          size="lg"
          icon={<CheckCircle2 size={18} color={colors.white} />}
          style={{ flex: 1 }}
        />
        <Button
          title="Annuler"
          onPress={() => handleAction("cancel")}
          variant="danger"
          loading={actionLoading === "cancel"}
          disabled={actionLoading !== null}
          size="lg"
          style={{ flex: 1 }}
        />
      </View>
    </View>
  );
}

function DetailRow({ icon, label, value, last }: { icon: React.ReactNode; label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.detailRow, !last && styles.detailRowBorder]}>
      <View style={styles.detailIcon}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.md },
  header: { alignItems: "center", paddingVertical: spacing.lg },
  bellIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: colors.primaryFaint,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.md,
  },
  heading: { fontSize: 24, fontWeight: "800", color: colors.ink, letterSpacing: -0.3 },
  subtitle: { fontSize: 15, color: colors.slate500, marginTop: 4 },
  card: {
    backgroundColor: colors.white, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.lg, overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    padding: spacing.md,
  },
  detailRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  detailIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: colors.bg,
    alignItems: "center", justifyContent: "center",
  },
  detailLabel: { fontSize: 12, fontWeight: "600", color: colors.slate400, textTransform: "uppercase", letterSpacing: 0.3 },
  detailValue: { fontSize: 15, fontWeight: "600", color: colors.ink, marginTop: 2 },
  actions: { flexDirection: "row", gap: spacing.sm },
  resultContainer: {
    flex: 1, backgroundColor: colors.white,
    alignItems: "center", justifyContent: "center", padding: spacing.xl,
  },
  resultIconWrap: {
    width: 100, height: 100, borderRadius: 50,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.lg,
  },
  resultTitle: { fontSize: 24, fontWeight: "800", color: colors.ink, textAlign: "center", letterSpacing: -0.3 },
  resultSubtitle: {
    fontSize: 15, color: colors.slate500, textAlign: "center",
    marginTop: spacing.sm, marginBottom: spacing.xl, lineHeight: 22,
  },
});
