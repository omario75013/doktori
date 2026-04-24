import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api } from "@doktori/mobile-core";

const PATIENT_TOKEN_KEY = "doktori.patient.token";

type Prescription = {
  id: string;
  content: string;
  createdAt: string;
  doctorName: string;
  doctorSpecialty: string;
  appointmentDate: string;
};

async function getPatientToken(): Promise<string | null> {
  const SS = await import("expo-secure-store").catch(() => null);
  return SS ? SS.getItemAsync(PATIENT_TOKEN_KEY) : null;
}

export default function PatientOrdonnances() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Prescription | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const token = await getPatientToken();
      const data = await api<Prescription[]>("/api/prescriptions/patient", {
        token: token ?? undefined,
      });
      setPrescriptions(data);
    } catch {
      setError("Impossible de charger vos ordonnances");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, []);

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Mes Ordonnances</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={colors.teal} style={{ marginTop: spacing["3xl"] }} />
      ) : error ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{error}</Text>
          <Pressable onPress={load} style={styles.retryBtn}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : prescriptions.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={56} color={colors.border} />
          <Text style={styles.emptyTitle}>Aucune ordonnance</Text>
          <Text style={styles.emptySubText}>
            Vos ordonnances apparaîtront ici après vos consultations.
          </Text>
        </View>
      ) : (
        <FlatList
          data={prescriptions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />
          }
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => setSelected(item)}>
              <View style={styles.iconWrap}>
                <Ionicons name="document-text" size={22} color={colors.teal} />
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.doctorName}>{item.doctorName}</Text>
                <Text style={styles.specialty}>{item.doctorSpecialty}</Text>
                <Text style={styles.date}>{formatDate(item.appointmentDate)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.foregroundSecondary} />
            </Pressable>
          )}
        />
      )}

      {/* Detail modal */}
      <Modal
        visible={!!selected}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setSelected(null)}
      >
        {selected && (
          <SafeAreaView edges={["top", "bottom"]} style={styles.modalRoot}>
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHandleWrap}>
                <View style={styles.modalHandle} />
              </View>
              <View style={styles.modalTitleRow}>
                <Text style={styles.modalTitle}>
                  Ordonnance du {formatDate(selected.appointmentDate)}
                </Text>
                <Pressable onPress={() => setSelected(null)} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={colors.foreground} />
                </Pressable>
              </View>
              <Text style={styles.modalDoctor}>
                Dr. {selected.doctorName} · {selected.doctorSpecialty}
              </Text>
              <View style={styles.divider} />
            </View>

            {/* Content */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.modalContent}
            >
              <Text style={styles.prescriptionContent}>{selected.content}</Text>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  title: { fontSize: 22, fontWeight: "700", color: colors.foreground },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing["3xl"],
    gap: spacing.sm,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    gap: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: { flex: 1, gap: 2 },
  doctorName: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  specialty: { fontSize: 12, color: colors.foregroundSecondary },
  date: { fontSize: 12, color: colors.teal, fontWeight: "600", marginTop: 2 },

  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: colors.foreground },
  emptyText: { fontSize: 14, color: colors.foregroundSecondary },
  emptySubText: {
    fontSize: 13,
    color: colors.foregroundSecondary,
    textAlign: "center",
  },
  retryBtn: {
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  retryText: { color: "#FFF", fontWeight: "700" },

  // Modal
  modalRoot: { flex: 1, backgroundColor: colors.bg },
  modalHeader: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalHandleWrap: { alignItems: "center", marginBottom: spacing.sm },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: radii.full,
    backgroundColor: colors.border,
  },
  modalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.foreground,
    flex: 1,
    marginRight: spacing.sm,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  modalDoctor: { fontSize: 13, color: colors.foregroundSecondary },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: spacing.md,
  },
  modalContent: { padding: spacing.xl },
  prescriptionContent: {
    fontSize: 14,
    lineHeight: 22,
    color: colors.foreground,
    fontFamily: "monospace",
  },
});
