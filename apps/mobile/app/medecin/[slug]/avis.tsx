import { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { MessageSquare } from "lucide-react-native";
import { api } from "@/lib/api";
import { colors, spacing, radius, shadow } from "@/lib/theme";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { StarRating } from "@/components/ui/StarRating";

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
  distribution: Record<string, number>;
}

function RatingBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <View style={styles.barRow}>
      <Text style={styles.barLabel}>{label}</Text>
      <StarRating rating={parseInt(label)} size={10} />
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

  useEffect(() => {
    async function load() {
      try {
        const doctor = await api.getDoctor(slug);
        if (!doctor?.id) return;
        const data = await api.getDoctorReviews(doctor.id);
        const list: Review[] = data.reviews ?? data ?? [];
        setReviews(list);

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

  if (loading) return <LoadingSpinner message="Chargement des avis..." />;

  return (
    <>
      <Stack.Screen options={{ title: "Avis patients" }} />
      <FlatList
        data={reviews}
        keyExtractor={(item) => item.id}
        style={{ backgroundColor: colors.bg }}
        ListHeaderComponent={
          stats ? (
            <View style={[styles.statsCard, shadow.md]}>
              <View style={styles.statsTop}>
                <View style={styles.scoreWrap}>
                  <Text style={styles.avgScore}>{stats.average.toFixed(1)}</Text>
                  <StarRating rating={stats.average} size={18} />
                  <Text style={styles.totalText}>{stats.total} avis</Text>
                </View>
                <View style={styles.distribution}>
                  {(["5", "4", "3", "2", "1"] as const).map((star) => (
                    <RatingBar key={star} label={star} count={stats.distribution[star] ?? 0} total={stats.total} />
                  ))}
                </View>
              </View>
            </View>
          ) : null
        }
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <MessageSquare size={40} color={colors.slate200} />
            <Text style={styles.emptyText}>Aucun avis pour le moment</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[styles.reviewCard, shadow.sm]}>
            <View style={styles.reviewHeader}>
              <View style={styles.reviewAuthor}>
                <View style={styles.authorAvatar}>
                  <Text style={styles.authorInitial}>
                    {item.patientName?.charAt(0) || "P"}
                  </Text>
                </View>
                <View>
                  {item.patientName && (
                    <Text style={styles.patientName}>{item.patientName}</Text>
                  )}
                  <Text style={styles.reviewDate}>
                    {new Date(item.createdAt).toLocaleDateString("fr-FR", {
                      day: "numeric", month: "long", year: "numeric",
                    })}
                  </Text>
                </View>
              </View>
              <StarRating rating={item.rating} size={14} />
            </View>
            {item.comment && <Text style={styles.reviewComment}>{item.comment}</Text>}
          </View>
        )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  statsCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statsTop: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  scoreWrap: { alignItems: "center", justifyContent: "center" },
  avgScore: { fontSize: 48, fontWeight: "800", color: colors.ink, letterSpacing: -1 },
  totalText: { fontSize: 13, color: colors.slate500, marginTop: 4 },
  distribution: { flex: 1, gap: 4, justifyContent: "center" },
  barRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  barLabel: { fontSize: 12, fontWeight: "600", color: colors.slate500, width: 14, textAlign: "right" },
  barTrack: {
    flex: 1,
    height: 6,
    backgroundColor: colors.bg,
    borderRadius: radius.full,
    overflow: "hidden",
  },
  barFill: { height: "100%", backgroundColor: colors.orange, borderRadius: radius.full },
  barCount: { fontSize: 12, color: colors.slate400, width: 24, textAlign: "right" },
  reviewCard: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  reviewAuthor: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  authorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center",
  },
  authorInitial: { fontSize: 15, fontWeight: "700", color: colors.primary },
  patientName: { fontSize: 14, fontWeight: "600", color: colors.ink },
  reviewDate: { fontSize: 12, color: colors.slate400, marginTop: 1 },
  reviewComment: { fontSize: 14, color: colors.ink, lineHeight: 21, marginTop: spacing.sm },
  emptyWrap: { alignItems: "center", justifyContent: "center", paddingVertical: spacing.xxl },
  emptyText: { fontSize: 15, color: colors.slate400, marginTop: spacing.md },
});
