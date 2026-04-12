import { useEffect, useState } from "react";
import { View, Text, StyleSheet, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";
import { colors, spacing, radius } from "@/lib/theme";
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

  if (loading) return <LoadingSpinner />;

  if (done) {
    const confirmed = done === "confirm";
    return (
      <View style={styles.resultContainer}>
        <Text style={styles.resultIcon}>{confirmed ? "✓" : "✗"}</Text>
        <Text style={styles.resultTitle}>
          {confirmed ? "Rendez-vous confirmé" : "Rendez-vous annulé"}
        </Text>
        <Text style={styles.resultSubtitle}>
          {confirmed
            ? "Votre présence a bien été enregistrée."
            : "Votre rendez-vous a été annulé."}
        </Text>
        <Button
          title="Retour à l'accueil"
          onPress={() => router.replace("/(tabs)")}
          style={styles.resultBtn}
        />
      </View>
    );
  }

  const formattedDate = preview?.date
    ? new Date(preview.date).toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Rappel de rendez-vous</Text>
      <Text style={styles.subtitle}>Confirmez-vous votre présence ?</Text>

      <View style={styles.card}>
        {preview?.doctorName ? (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Médecin</Text>
            <Text style={styles.rowValue}>Dr. {preview.doctorName}</Text>
          </View>
        ) : null}
        {preview?.doctorSpecialty ? (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Spécialité</Text>
            <Text style={styles.rowValue}>{preview.doctorSpecialty}</Text>
          </View>
        ) : null}
        {formattedDate ? (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Date</Text>
            <Text style={styles.rowValue}>{formattedDate}</Text>
          </View>
        ) : null}
        {preview?.time ? (
          <View style={[styles.row, styles.rowLast]}>
            <Text style={styles.rowLabel}>Heure</Text>
            <Text style={styles.rowValue}>{preview.time}</Text>
          </View>
        ) : null}
        {preview?.location ? (
          <View style={[styles.row, styles.rowLast]}>
            <Text style={styles.rowLabel}>Lieu</Text>
            <Text style={styles.rowValue}>{preview.location}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Button
          title="Confirmer"
          onPress={() => handleAction("confirm")}
          loading={actionLoading === "confirm"}
          disabled={actionLoading !== null}
          style={styles.actionBtn}
        />
        <Button
          title="Annuler le RDV"
          onPress={() => handleAction("cancel")}
          variant="danger"
          loading={actionLoading === "cancel"}
          disabled={actionLoading !== null}
          style={styles.actionBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.md },
  heading: { fontSize: 22, fontWeight: "700", color: colors.ink, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.slate500, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { fontSize: 13, color: colors.slate500, fontWeight: "600" },
  rowValue: { fontSize: 14, color: colors.ink, fontWeight: "500", maxWidth: "60%", textAlign: "right" },
  actions: { gap: spacing.sm },
  actionBtn: {},
  resultContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  resultIcon: { fontSize: 64, marginBottom: spacing.md },
  resultTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  resultSubtitle: {
    fontSize: 15,
    color: colors.slate500,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  resultBtn: { width: "100%" },
});
