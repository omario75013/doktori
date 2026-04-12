// apps/mobile/app/(tabs)/mes-rdv.tsx
import { useEffect, useState, useCallback } from "react";
import { View, Text, FlatList, Pressable, Alert, StyleSheet, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { api, ApiError } from "@/lib/api";
import { colors, spacing, radius } from "@/lib/theme";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const PURPLE = "#7C3AED";

type Appointment = {
  id: string;
  doctorName: string;
  doctorSpecialty: string;
  doctorSlug: string;
  startsAt: string;
  status: string;
  type?: string;
};

/** Returns true if appointment starts within 15 minutes or is already in progress (up to 60 min after start). */
function canJoinTeleconsult(startsAt: string): boolean {
  const start = new Date(startsAt).getTime();
  const now = Date.now();
  const fifteenMin = 15 * 60 * 1000;
  const sixtyMin = 60 * 60 * 1000;
  return now >= start - fifteenMin && now <= start + sixtyMin;
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

  if (loading) return <LoadingSpinner />;

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
          icon="📅"
          title="Aucun rendez-vous"
          description="Recherchez un médecin pour prendre votre premier RDV"
          ctaTitle="Rechercher"
          onCta={() => router.push("/(tabs)")}
        />
      }
      ListHeaderComponent={
        upcoming.length > 0 ? <Text style={styles.section}>À venir</Text> : null
      }
      renderItem={({ item, index }) => {
        const isFirstPast = index === upcoming.length && past.length > 0;
        const isPast = new Date(item.startsAt) < now || item.status === "cancelled";
        const canCancel = !isPast && item.status === "pending";
        const isTeleconsult = item.type === "teleconsult";
        const showJoin = isTeleconsult && item.status === "confirmed" && !isPast && canJoinTeleconsult(item.startsAt);
        return (
          <>
            {isFirstPast && <Text style={styles.section}>Passés</Text>}
            <Pressable
              style={[styles.card, isPast && { opacity: 0.6 }]}
              onPress={() => router.push(`/medecin/${item.doctorSlug}`)}
            >
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.doctorName}>{item.doctorName}</Text>
                  {isTeleconsult && (
                    <View style={styles.videoBadge}>
                      <Text style={styles.videoBadgeText}>Vidéo</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.detail}>{item.doctorSpecialty}</Text>
                <Text style={styles.detail}>
                  {new Date(item.startsAt).toLocaleDateString("fr-FR", {
                    weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                  })}
                </Text>
                {showJoin && (
                  <Pressable
                    style={styles.joinButton}
                    onPress={() => router.push(`/teleconsult/${item.id}`)}
                  >
                    <Text style={styles.joinButtonText}>Rejoindre</Text>
                  </Pressable>
                )}
              </View>
              <View style={{ alignItems: "flex-end", gap: 8 }}>
                <StatusBadge status={item.status} />
                {canCancel && (
                  <Pressable onPress={() => handleCancel(item.id)}>
                    <Text style={styles.cancelText}>Annuler</Text>
                  </Pressable>
                )}
              </View>
            </Pressable>
          </>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  section: { fontSize: 14, fontWeight: "700", color: colors.slate500, marginTop: spacing.md, marginBottom: spacing.sm, textTransform: "uppercase" },
  card: {
    backgroundColor: colors.white, padding: spacing.md, borderRadius: radius.md,
    flexDirection: "row", alignItems: "center", gap: 12,
    borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm,
  },
  doctorName: { fontSize: 16, fontWeight: "600", color: colors.ink },
  detail: { fontSize: 13, color: colors.slate500, marginTop: 2 },
  cancelText: { fontSize: 12, color: colors.red, fontWeight: "600" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexWrap: "wrap" },
  videoBadge: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
  },
  videoBadgeText: { fontSize: 11, fontWeight: "700", color: PURPLE },
  joinButton: {
    marginTop: spacing.sm,
    backgroundColor: PURPLE,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.sm,
    alignSelf: "flex-start",
  },
  joinButtonText: { fontSize: 13, fontWeight: "700", color: colors.white },
});
