import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Share, Alert } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { FileText, Stethoscope, User, Pill, Clock, Share2, ExternalLink } from "lucide-react-native";
import * as WebBrowser from "expo-web-browser";
import { apiFetch } from "@/lib/api";
import { colors, spacing, radius, shadow } from "@/lib/theme";
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
    } catch {} finally { setSharing(false); }
  }

  if (loading) return <LoadingSpinner message="Chargement de l'ordonnance..." />;
  if (!prescription) return null;

  const formattedDate = prescription.date
    ? new Date(prescription.date).toLocaleDateString("fr-FR", {
        day: "numeric", month: "long", year: "numeric",
      })
    : "";

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.headerIcon, shadow.md]}>
          <FileText size={28} color={colors.primary} />
        </View>
        <Text style={styles.title}>Ordonnance</Text>
        {formattedDate ? <Text style={styles.date}>{formattedDate}</Text> : null}
      </View>

      {/* Doctor & Patient info */}
      <View style={[styles.card, shadow.sm]}>
        <InfoRow icon={<Stethoscope size={16} color={colors.primary} />} label="Médecin" value={prescription.doctorName ?? "—"} />
        {prescription.doctorSpecialty && (
          <InfoRow icon={<Stethoscope size={16} color={colors.slate400} />} label="Spécialité" value={prescription.doctorSpecialty} />
        )}
        <InfoRow icon={<User size={16} color={colors.primary} />} label="Patient" value={prescription.patientName ?? "—"} last />
      </View>

      {/* Medications */}
      {prescription.items && prescription.items.length > 0 ? (
        <View style={[styles.card, shadow.sm]}>
          <View style={styles.cardHeader}>
            <Pill size={16} color={colors.green} />
            <Text style={styles.cardTitle}>Médicaments prescrits</Text>
          </View>
          {prescription.items.map((item, idx) => (
            <View key={idx} style={[styles.medItem, idx < prescription.items!.length - 1 && styles.medItemBorder]}>
              <View style={styles.medDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.medName}>{item.name}</Text>
                {item.dosage && (
                  <View style={styles.medDetail}>
                    <Pill size={12} color={colors.slate400} />
                    <Text style={styles.medDetailText}>{item.dosage}</Text>
                  </View>
                )}
                {item.duration && (
                  <View style={styles.medDetail}>
                    <Clock size={12} color={colors.slate400} />
                    <Text style={styles.medDetailText}>{item.duration}</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
        </View>
      ) : prescription.content ? (
        <View style={[styles.card, shadow.sm]}>
          <View style={styles.cardHeader}>
            <FileText size={16} color={colors.primary} />
            <Text style={styles.cardTitle}>Contenu</Text>
          </View>
          <Text style={styles.contentText}>{prescription.content}</Text>
        </View>
      ) : null}

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Partager"
          onPress={handleShare}
          loading={sharing}
          icon={<Share2 size={16} color={colors.white} />}
          style={{ flex: 1 }}
        />
        {prescription.hasPdf && (
          <Button
            title="Voir le PDF"
            onPress={() => WebBrowser.openBrowserAsync(`${API_URL}/ordonnance/${id}`)}
            variant="secondary"
            icon={<ExternalLink size={16} color={colors.primary} />}
            style={{ flex: 1 }}
          />
        )}
      </View>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value, last }: { icon: React.ReactNode; label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <View style={styles.infoIcon}>{icon}</View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  header: { alignItems: "center", paddingVertical: spacing.lg },
  headerIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: colors.primaryFaint,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.md,
  },
  title: { fontSize: 24, fontWeight: "800", color: colors.ink, letterSpacing: -0.3 },
  date: { fontSize: 14, color: colors.slate500, marginTop: 4 },
  card: {
    backgroundColor: colors.white, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.md, overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    padding: spacing.md, paddingBottom: spacing.sm,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: colors.ink },
  infoRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    padding: spacing.md,
  },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  infoIcon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: colors.bg, alignItems: "center", justifyContent: "center",
  },
  infoLabel: { fontSize: 13, color: colors.slate400, fontWeight: "600", width: 70 },
  infoValue: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.ink, textAlign: "right" },
  medItem: { flexDirection: "row", gap: spacing.sm, padding: spacing.md, paddingTop: spacing.sm },
  medItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  medDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green, marginTop: 6 },
  medName: { fontSize: 15, fontWeight: "700", color: colors.ink },
  medDetail: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  medDetailText: { fontSize: 13, color: colors.slate500 },
  contentText: { fontSize: 14, color: colors.ink, lineHeight: 21, padding: spacing.md, paddingTop: 0 },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
});
