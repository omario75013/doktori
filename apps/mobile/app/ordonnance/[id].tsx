import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Share, Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { apiFetch } from "@/lib/api";
import { colors, spacing, radius } from "@/lib/theme";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

type Prescription = {
  id: string;
  doctorName?: string;
  doctorSpecialty?: string;
  patientName?: string;
  date?: string;
  content?: string;
  items?: Array<{ name: string; dosage?: string; duration?: string }>;
  hasPdf?: boolean;
};

export default function OrdonnanceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [prescription, setPrescription] = useState<Prescription | null>(null);
  const [loading, setLoading] = useState(true);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    apiFetch<Prescription>(`/api/prescriptions/${id}`)
      .then(setPrescription)
      .catch(() => Alert.alert("Erreur", "Impossible de charger l'ordonnance."))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleShare() {
    if (!prescription) return;
    setSharing(true);
    try {
      const webUrl = `${API_URL}/ordonnance/${id}`;
      const content = prescription.content
        ? `Ordonnance du ${prescription.date ?? ""}\nDr. ${prescription.doctorName ?? ""}\n\n${prescription.content}`
        : webUrl;

      await Share.share({ message: content, url: webUrl });
    } catch {
      // user dismissed
    } finally {
      setSharing(false);
    }
  }

  async function handleOpenWeb() {
    await WebBrowser.openBrowserAsync(`${API_URL}/ordonnance/${id}`);
  }

  if (loading) return <LoadingSpinner />;
  if (!prescription) return null;

  const formattedDate = prescription.date
    ? new Date(prescription.date).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.header}>
        <Text style={styles.title}>Ordonnance</Text>
        {formattedDate ? <Text style={styles.date}>{formattedDate}</Text> : null}
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Médecin</Text>
          <Text style={styles.rowValue}>{prescription.doctorName ?? "—"}</Text>
        </View>
        {prescription.doctorSpecialty ? (
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Spécialité</Text>
            <Text style={styles.rowValue}>{prescription.doctorSpecialty}</Text>
          </View>
        ) : null}
        <View style={[styles.row, styles.rowLast]}>
          <Text style={styles.rowLabel}>Patient</Text>
          <Text style={styles.rowValue}>{prescription.patientName ?? "—"}</Text>
        </View>
      </View>

      {prescription.items && prescription.items.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Médicaments prescrits</Text>
          {prescription.items.map((item, idx) => (
            <View key={idx} style={styles.item}>
              <Text style={styles.itemName}>{item.name}</Text>
              {item.dosage ? (
                <Text style={styles.itemDetail}>Posologie : {item.dosage}</Text>
              ) : null}
              {item.duration ? (
                <Text style={styles.itemDetail}>Durée : {item.duration}</Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : prescription.content ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Contenu</Text>
          <Text style={styles.content}>{prescription.content}</Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <Button
          title="Partager"
          onPress={handleShare}
          loading={sharing}
          style={{ flex: 1 }}
        />
        {prescription.hasPdf ? (
          <Button
            title="Voir le PDF"
            onPress={handleOpenWeb}
            variant="secondary"
            style={{ flex: 1 }}
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  header: { marginBottom: spacing.md },
  title: { fontSize: 22, fontWeight: "700", color: colors.ink },
  date: { fontSize: 14, color: colors.slate500, marginTop: 4 },
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
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { fontSize: 13, color: colors.slate500, fontWeight: "600" },
  rowValue: { fontSize: 14, color: colors.ink, fontWeight: "500", maxWidth: "60%", textAlign: "right" },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
    padding: spacing.md,
    paddingBottom: spacing.sm,
  },
  item: {
    padding: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  itemName: { fontSize: 15, fontWeight: "600", color: colors.ink },
  itemDetail: { fontSize: 13, color: colors.slate500, marginTop: 2 },
  actions: { flexDirection: "row", gap: spacing.sm },
});
