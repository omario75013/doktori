// apps/mobile/app/medecin/[slug]/avis.tsx
import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { api } from "@/lib/api";
import { colors, spacing, radius } from "@/lib/theme";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface Review {
  id: string;
  rating: number;
  comment?: string;
  patientName?: string;
  createdAt: string;
}

interface ReviewStats {
  average: number;
  total: number;
  distribution: Record<string, number>; // "1".."5" → count
}

function StarRow({ rating, max = 5 }: { rating: number; max?: number }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {Array.from({ length: max }).map((_, i) => (
        <Text key={i} style={{ color: i < Math.round(rating) ? "#F59E0B" : "#D1D5DB", fontSize: 16 }}>
          ★
        </Text>
      ))}
    </View>
  );
}

function RatingBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label} ★</Text>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%` as any }]} />
      </View>
      <Text style={styles.barCount}>{count}</Text>
    </View>
  );
}

export default function AvisScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [doctorId, setDoctorId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const doctor = await api.getDoctor(slug);
        if (!doctor?.id) return;
        setDoctorId(doctor.id);
        const data = await api.getDoctorReviews(doctor.id);
        const list: Review[] = data.reviews ?? data ?? [];
        setReviews(list);

        // Compute stats from the list
        if (list.length > 0) {
          const total = list.length;
          const sum = list.reduce((acc, r) => acc + r.rating, 0);
          const distribution: Record<string, number> = { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 };
          list.forEach((r) => {
            const key = String(Math.min(5, Math.max(1, Math.round(r.rating))));
            distribution[key] = (distribution[key] ?? 0) + 1;
          });
          setStats({ average: sum / total, total, distribution });
        } else {
          setStats({ average: 0, total: 0, distribution: { "5": 0, "4": 0, "3": 0, "2": 0, "1": 0 } });
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  if (loading) return <LoadingSpinner />;

  return (
    <>
      <Stack.Screen options={{ title: "Avis patients" }} />
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        style={{ backgroundColor: colors.bg }}
        ListHeaderComponent={
          stats ? (
            <View style={styles.statsCard}>
              <View style={styles.statsTop}>
                <Text style={styles.avgScore}>{stats.average.toFixed(1)}</Text>
                <View>
                  <StarRow rating={stats.average} />
                  <Text style={styles.totalText}>{stats.total} avis</Text>
                </View>
              </View>
              <View style={styles.distribution}>
                {(["5", "4", "3", "2", "1"] as const).map((star) => (
                  <RatingBar
                    key={star}
                    label={star}
                    count={stats.distribution[star] ?? 0}
                    total={stats.total}
                  />
                ))}
              </View>
            </View>
          ) : null
        }
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Aucun avis pour le moment.</Text>
        }
        renderItem={({ item }) => (
          <View style={styles.reviewCard}>
            <View style={styles.reviewHeader}>
              <StarRow rating={item.rating} />
              <Text style={styles.reviewDate}>
                {new Date(item.createdAt).toLocaleDateString("fr-FR")}
              </Text>
            </View>
            {item.patientName && (
              <Text style={styles.patientName}>{item.patientName}</Text>
            )}
            {item.comment ? (
              <Text style={styles.reviewComment}>{item.comment}</Text>
            ) : null}
          </View>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  statsCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  avgScore: {
    fontSize: 48,
    fontWeight: "700",
    color: colors.ink,
  },
  totalText: {
    fontSize: 13,
    color: colors.slate500,
    marginTop: 4,
  },
  distribution: { gap: spacing.xs },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  barLabel: { fontSize: 12, color: colors.slate500, width: 18, textAlign: "right" },
  barTrack: {
    flex: 1,
    height: 8,
    backgroundColor: colors.mist,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: "#F59E0B",
    borderRadius: radius.full,
  },
  barCount: { fontSize: 12, color: colors.slate500, width: 24, textAlign: "right" },
  reviewCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.xs,
  },
  reviewDate: { fontSize: 12, color: colors.slate500 },
  patientName: { fontSize: 13, fontWeight: "600", color: colors.ink, marginBottom: 4 },
  reviewComment: { fontSize: 14, color: colors.ink, lineHeight: 20 },
  emptyText: { fontSize: 14, color: colors.slate500, textAlign: "center", marginTop: spacing.xl },
});
