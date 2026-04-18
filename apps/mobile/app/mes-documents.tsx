import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Linking,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { FileText, Receipt, ChevronLeft } from "lucide-react-native";
import { colors, spacing, radius, shadow } from "@/lib/theme";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000";

interface Prescription {
  prescriptionId: string;
  createdAt: string;
  doctorName: string;
  specialty: string;
  startsAt: string;
  type: string;
}

interface CnamClaim {
  id: string;
  cnamNumber: string;
  amount: number;
  status: string;
  consultationDate: string;
  doctorName: string;
}

type DocTab = "ordonnances" | "cnam";

const CNAM_STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  submitted: "Soumis",
  reimbursed: "Remboursé",
  rejected: "Rejeté",
};

const CNAM_STATUS_COLORS: Record<string, string> = {
  draft: colors.slate400,
  submitted: colors.primary,
  reimbursed: colors.green,
  rejected: colors.red,
};

function formatMillimes(amount: number): string {
  return `${(amount / 1000).toFixed(3)} DT`;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-TN", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export default function MesDocumentsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DocTab>("ordonnances");
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [cnamClaims, setCnamClaims] = useState<CnamClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDocuments = useCallback(async () => {
    try {
      setError(null);
      const data = await apiFetch<{
        prescriptions: Prescription[];
        cnamClaims: CnamClaim[];
        consultationNotes: unknown[];
      }>("/api/patients/me/documents");
      setPrescriptions(data.prescriptions);
      setCnamClaims(data.cnamClaims);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Erreur de chargement";
      setError(message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  async function openPrescription(prescriptionId: string) {
    const token = await getToken();
    const url = `${API_URL}/ordonnance/${prescriptionId}${token ? `?token=${token}` : ""}`;
    await Linking.openURL(url);
  }

  function onRefresh() {
    setRefreshing(true);
    fetchDocuments();
  }

  function renderPrescription({ item }: { item: Prescription }) {
    return (
      <View style={[styles.card, shadow.sm]}>
        <View style={styles.cardIcon}>
          <FileText size={20} color={colors.primary} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.doctorName}</Text>
          <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
          <View style={styles.typeBadge}>
            <Text style={styles.typeBadgeText}>Ordonnance</Text>
          </View>
        </View>
        <Pressable
          style={styles.viewBtn}
          onPress={() => openPrescription(item.prescriptionId)}
        >
          <Text style={styles.viewBtnText}>Voir</Text>
        </Pressable>
      </View>
    );
  }

  function renderCnamClaim({ item }: { item: CnamClaim }) {
    const statusColor = CNAM_STATUS_COLORS[item.status] ?? colors.slate400;
    const statusLabel = CNAM_STATUS_LABELS[item.status] ?? item.status;
    return (
      <View style={[styles.card, shadow.sm]}>
        <View style={[styles.cardIcon, { backgroundColor: "#F0FDF4" }]}>
          <Receipt size={20} color={colors.green} />
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{item.doctorName}</Text>
          <Text style={styles.cardMono}>{item.cnamNumber}</Text>
          <Text style={styles.cardDate}>{formatDate(item.consultationDate)}</Text>
          <View style={styles.row}>
            <Text style={styles.amount}>{formatMillimes(item.amount)}</Text>
            <View style={[styles.statusBadge, { borderColor: statusColor }]}>
              <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
            </View>
          </View>
        </View>
      </View>
    );
  }

  const tabs: { id: DocTab; label: string; count: number }[] = [
    { id: "ordonnances", label: "Ordonnances", count: prescriptions.length },
    { id: "cnam", label: "Bordereaux CNAM", count: cnamClaims.length },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <ChevronLeft size={20} color={colors.white} />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>Mes documents</Text>
          <Text style={styles.headerSubtitle}>Ordonnances et bordereaux CNAM</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.id}
            style={[styles.tab, activeTab === tab.id && styles.tabActive]}
            onPress={() => setActiveTab(tab.id)}
          >
            <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>
              {tab.label}
            </Text>
            {tab.count > 0 && (
              <View style={[styles.tabBadge, activeTab === tab.id && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === tab.id && styles.tabBadgeTextActive]}>
                  {tab.count}
                </Text>
              </View>
            )}
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={fetchDocuments}>
            <Text style={styles.retryBtnText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : activeTab === "ordonnances" ? (
        <FlatList
          data={prescriptions}
          keyExtractor={(item) => item.prescriptionId}
          renderItem={renderPrescription}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <FileText size={40} color={colors.slate200} />
              <Text style={styles.emptyTitle}>Aucune ordonnance</Text>
              <Text style={styles.emptyDesc}>Vos ordonnances apparaîtront ici après vos consultations</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={cnamClaims}
          keyExtractor={(item) => item.id}
          renderItem={renderCnamClaim}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Receipt size={40} color={colors.slate200} />
              <Text style={styles.emptyTitle}>Aucun bordereau CNAM</Text>
              <Text style={styles.emptyDesc}>Vos bordereaux de remboursement CNAM apparaîtront ici</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.mist },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl + spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.primary,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: colors.white, letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.7)", marginTop: 2 },
  tabBar: {
    flexDirection: "row",
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: { borderBottomColor: colors.primary },
  tabText: { fontSize: 13, fontWeight: "600", color: colors.slate400 },
  tabTextActive: { color: colors.primary },
  tabBadge: {
    backgroundColor: colors.slate100,
    borderRadius: radius.full,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabBadgeActive: { backgroundColor: colors.primaryFaint },
  tabBadgeText: { fontSize: 10, fontWeight: "700", color: colors.slate400 },
  tabBadgeTextActive: { color: colors.primary },
  list: { padding: spacing.md, gap: spacing.sm, flexGrow: 1 },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  cardIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primaryFaint,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardContent: { flex: 1, minWidth: 0 },
  cardTitle: { fontSize: 14, fontWeight: "700", color: colors.ink, marginBottom: 2 },
  cardMono: { fontSize: 11, color: colors.slate500, fontFamily: "monospace", marginBottom: 2 },
  cardDate: { fontSize: 12, color: colors.slate400, marginBottom: spacing.xs },
  typeBadge: {
    alignSelf: "flex-start",
    backgroundColor: colors.primaryFaint,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  typeBadgeText: { fontSize: 11, fontWeight: "600", color: colors.primary },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  amount: { fontSize: 14, fontWeight: "700", color: colors.ink },
  statusBadge: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusBadgeText: { fontSize: 11, fontWeight: "600" },
  viewBtn: {
    backgroundColor: colors.primaryFaint,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexShrink: 0,
  },
  viewBtnText: { fontSize: 13, fontWeight: "700", color: colors.primary },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  loadingText: { marginTop: spacing.md, fontSize: 14, color: colors.slate400 },
  errorText: { fontSize: 14, color: colors.red, textAlign: "center", marginBottom: spacing.md },
  retryBtn: {
    backgroundColor: colors.primaryFaint,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  retryBtnText: { fontSize: 14, fontWeight: "700", color: colors.primary },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxl },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.ink, marginTop: spacing.md, marginBottom: spacing.sm },
  emptyDesc: { fontSize: 13, color: colors.slate400, textAlign: "center", lineHeight: 20 },
});
