import { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, Pressable, Alert, StyleSheet, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Calendar, Video, Clock, MapPin, XCircle, ChevronRight } from "lucide-react-native";
import { api, ApiError } from "@/lib/api";
import { colors, spacing, radius, shadow } from "@/lib/theme";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Button } from "@/components/ui/Button";

type Appointment = {
  id: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorSlug: string;
  startsAt: string;
  status: string;
  type?: string;
};

function canJoinTeleconsult(startsAt: string): boolean {
  const start = new Date(startsAt).getTime();
  const now = Date.now();
  return now >= start - 15 * 60 * 1000 && now <= start + 60 * 60 * 1000;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export default function MesRdvScreen() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.getMyAppointments();
      setAppointments(data.appointments ?? data ?? []);
    } catch (e) {
      if (e instanceof ApiError && e.status !== 401) {
        console.error("Failed to load appointments:", e);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function onRefresh() {
    setRefreshing(true);
    load().finally(() => setRefreshing(false));
  }

  async function handleCancel(id: string) {
    Alert.alert("Annuler ce RDV ?", "Cette action est irréversible.", [
      { text: "Non", style: "cancel" },
      {
        text: "Oui, annuler",
        style: "destructive",
        onPress: async () => {
          try {
            await api.cancelAppointment(id);
            load();
          } catch (e: any) {
            Alert.alert("Erreur", e.message);
          }
        },
      },
    ]);
  }

  if (loading) return <LoadingSpinner message="Chargement..." />;

  const now = new Date();
  const upcoming = appointments.filter((a) => new Date(a.startsAt) >= now && a.status !== "cancelled");
  const past = appointments.filter((a) => new Date(a.startsAt) < now || a.status === "cancelled");

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: spacing.md, flexGrow: 1 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      data={[...upcoming, ...past]}
      keyExtractor={(a) => a.id}
      ListEmptyComponent={
        <EmptyState
          icon={<Calendar size={48} color={colors.primaryLight} />}
          title="Aucun rendez-vous"
          description="Recherchez un médecin pour prendre votre premier rendez-vous"
          ctaTitle="Rechercher un médecin"
          onCta={() => router.push("/(tabs)")}
        />
      }
      ListHeaderComponent={
        upcoming.length > 0 ? (
          <View style={styles.sectionHeader}>
            <View style={styles.sectionDot} />
            <Text style={styles.sectionTitle}>À venir</Text>
            <Text style={styles.sectionCount}>{upcoming.length}</Text>
          </View>
        ) : null
      }
      renderItem={({ item, index }) => {
        const isFirstPast = index === upcoming.length && past.length > 0;
        const isPast = new Date(item.startsAt) < now || item.status === "cancelled";
        const canCancel = !isPast && item.status === "pending";
        const isTeleconsult = item.type === "teleconsult";
        const showJoin = isTeleconsult && item.status === "confirmed" && !isPast && canJoinTeleconsult(item.startsAt);

        return (
          <>
            {isFirstPast && (
              <View style={[styles.sectionHeader, { marginTop: spacing.lg }]}>
                <View style={[styles.sectionDot, { backgroundColor: colors.slate400 }]} />
                <Text style={styles.sectionTitle}>Passés</Text>
                <Text style={styles.sectionCount}>{past.length}</Text>
              </View>
            )}
            <Pressable
              style={[styles.card, isPast && styles.cardPast, shadow.sm]}
              onPress={() => router.push(`/medecin/${item.doctorSlug}`)}
            >
              {/* Left accent bar */}
              <View style={[styles.accentBar, {
                backgroundColor: isPast ? colors.slate200 : item.status === "confirmed" ? colors.green : colors.primary,
              }]} />

              <View style={styles.cardContent}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={styles.doctorName} numberOfLines={1}>{item.doctorName}</Text>
                      {isTeleconsult && (
                        <View style={styles.videoBadge}>
                          <Video size={11} color={colors.purple} />
                          <Text style={styles.videoBadgeText}>Vidéo</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.specialty}>{item.doctorSpecialty}</Text>
                  </View>
                  <StatusBadge status={item.status} />
                </View>

                <View style={styles.dateRow}>
                  <Calendar size={14} color={colors.slate400} />
                  <Text style={styles.dateText}>{formatDate(item.startsAt)}</Text>
                  <Clock size={14} color={colors.slate400} />
                  <Text style={styles.dateText}>{formatTime(item.startsAt)}</Text>
                </View>

                {/* Actions */}
                {(showJoin || canCancel) && (
                  <View style={styles.actions}>
                    {showJoin && (
                      <Button
                        title="Rejoindre"
                        onPress={() => router.push(`/teleconsult/${item.id}`)}
                        size="sm"
                        icon={<Video size={14} color={colors.white} />}
                        style={{ backgroundColor: colors.purple }}
                      />
                    )}
                    {canCancel && (
                      <Pressable style={styles.cancelBtn} onPress={() => handleCancel(item.id)}>
                        <XCircle size={14} color={colors.red} />
                        <Text style={styles.cancelText}>Annuler</Text>
                      </Pressable>
                    )}
                  </View>
                )}
              </View>

              <ChevronRight size={18} color={colors.slate200} style={{ alignSelf: "center" }} />
            </Pressable>
          </>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
    paddingVertical: spacing.xs,
  },
  sectionDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.slate500,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.slate400,
    backgroundColor: colors.slate100,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    flexDirection: "row",
    overflow: "hidden",
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPast: { opacity: 0.6 },
  accentBar: { width: 4 },
  cardContent: { flex: 1, padding: spacing.md },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  doctorName: { fontSize: 16, fontWeight: "700", color: colors.ink },
  specialty: { fontSize: 13, color: colors.slate500, marginTop: 2 },
  videoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.purpleFaint,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  videoBadgeText: { fontSize: 11, fontWeight: "700", color: colors.purple },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dateText: { fontSize: 13, color: colors.slate500, fontWeight: "500" },
  actions: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.sm },
  cancelBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4 },
  cancelText: { fontSize: 13, color: colors.red, fontWeight: "600" },
});
