// apps/mobile/app/medecin/[slug].tsx
import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Share } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";

const PURPLE = "#7C3AED";
import { Share2 } from "lucide-react-native";
import { api } from "@/lib/api";
import { SPECIALTIES, CITIES } from "@doktori/shared";
import { colors, spacing, radius } from "@/lib/theme";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { trackEvent } from "@/lib/analytics";

export default function DoctorScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [doctor, setDoctor] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDoctor(slug).then((d) => {
      setDoctor(d);
      setLoading(false);
      if (d?.id) {
        api.getDoctorReviews(d.id).then((r) => setReviews(r.reviews ?? r ?? [])).catch(() => {});
        trackEvent("doctor_view", { slug });
      }
    }).catch(() => setLoading(false));
  }, [slug]);

  if (loading) return <LoadingSpinner />;
  if (!doctor) return <Text style={{ padding: 20, color: colors.ink }}>Médecin introuvable</Text>;

  const spec = SPECIALTIES.find((s) => s.id === doctor.specialty);
  const city = CITIES.find((c) => c.id === doctor.city);
  const hasTeleconsult = doctor.consultation_mode === "teleconsult" || doctor.consultation_mode === "both";
  const teleconsultOnly = doctor.consultation_mode === "teleconsult";

  return (
    <>
      <Stack.Screen options={{ title: doctor.name }} />
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{doctor.name.charAt(0)}</Text>
            </View>
            <Text style={styles.name}>{doctor.name}</Text>
            <Text style={styles.specialty}>{spec?.label ?? doctor.specialty}</Text>
            <Text style={styles.city}>{city?.label ?? doctor.city}</Text>
            {/* Only teleconsult fee shown (prepaid platform service, set by doctor) */}
            {hasTeleconsult && doctor.teleconsultFee != null && (
              <Text style={styles.teleconsultFee}>
                Téléconsultation : {doctor.teleconsultFee / 1000} DT
              </Text>
            )}
            {hasTeleconsult && (
              <View style={styles.teleconsultBadge}>
                <Text style={styles.teleconsultBadgeText}>📹 Téléconsultation disponible</Text>
              </View>
            )}
            {teleconsultOnly && (
              <Text style={styles.teleconsultOnlyText}>
                Ce médecin consulte uniquement en vidéo
              </Text>
            )}
            <Pressable style={styles.shareBtn} onPress={() => Share.share({ url: `https://doktori.tn/medecin/${slug}` })}>
              <Share2 size={18} color={colors.primary} />
              <Text style={styles.shareText}>Partager</Text>
            </Pressable>
          </View>

          {/* Bio */}
          {doctor.bio && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>À propos</Text>
              <Text style={styles.bioText}>{doctor.bio}</Text>
            </View>
          )}

          {/* Education */}
          {doctor.educations?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Formation</Text>
              {doctor.educations.map((e: any, i: number) => (
                <View key={i} style={styles.timelineItem}>
                  <View style={styles.dot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{e.degree}</Text>
                    <Text style={styles.itemSub}>{e.institution} {e.year ? `· ${e.year}` : ""}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Experience */}
          {doctor.experiences?.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Expérience</Text>
              {doctor.experiences.map((e: any, i: number) => (
                <View key={i} style={styles.timelineItem}>
                  <View style={styles.dot} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>{e.position}</Text>
                    <Text style={styles.itemSub}>{e.institution} {e.period ? `· ${e.period}` : ""}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Languages + Expertise */}
          {(doctor.languages?.length > 0 || doctor.expertise?.length > 0) && (
            <View style={styles.section}>
              {doctor.languages?.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Langues</Text>
                  <View style={styles.chipRow}>
                    {doctor.languages.map((l: string) => (
                      <View key={l} style={styles.chip}><Text style={styles.chipText}>{l}</Text></View>
                    ))}
                  </View>
                </>
              )}
              {doctor.expertise?.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { marginTop: spacing.md }]}>Expertise</Text>
                  <View style={styles.chipRow}>
                    {doctor.expertise.map((e: string) => (
                      <View key={e} style={styles.chip}><Text style={styles.chipText}>{e}</Text></View>
                    ))}
                  </View>
                </>
              )}
            </View>
          )}

          {/* Reviews */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Avis patients ({reviews.length})</Text>
            {reviews.length === 0 ? (
              <Text style={styles.emptyText}>Aucun avis pour le moment</Text>
            ) : (
              <>
                {reviews.slice(0, 3).map((r: any) => (
                  <View key={r.id} style={styles.reviewCard}>
                    <View style={{ flexDirection: "row", gap: 2 }}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Text key={i} style={{ color: i < r.rating ? "#F59E0B" : "#D1D5DB", fontSize: 16 }}>★</Text>
                      ))}
                    </View>
                    {r.comment && <Text style={styles.reviewText}>{r.comment}</Text>}
                    <Text style={styles.reviewDate}>
                      {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                    </Text>
                  </View>
                ))}
                {reviews.length > 3 && (
                  <Pressable
                    style={styles.seeAllReviews}
                    onPress={() => router.push(`/medecin/${slug}/avis`)}
                  >
                    <Text style={styles.seeAllReviewsText}>
                      Voir tous les avis ({reviews.length}) →
                    </Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        </ScrollView>

        {/* Sticky CTA */}
        <View style={styles.stickyCta}>
          <Button title="Prendre rendez-vous" onPress={() => router.push(`/rdv/${doctor.slug}`)} />
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  header: { backgroundColor: colors.white, padding: spacing.xl, alignItems: "center", borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.mist, alignItems: "center", justifyContent: "center", marginBottom: spacing.md },
  avatarText: { fontSize: 32, fontWeight: "700", color: colors.primary },
  name: { fontSize: 22, fontWeight: "700", color: colors.ink },
  specialty: { fontSize: 16, color: colors.primary, marginTop: 4 },
  city: { fontSize: 14, color: colors.slate500, marginTop: 2 },
  fee: { fontSize: 14, color: colors.ink, marginTop: spacing.sm, fontWeight: "600" },
  teleconsultFee: { fontSize: 14, color: "#7C3AED", marginTop: spacing.sm, fontWeight: "700" },
  teleconsultBadge: {
    marginTop: spacing.sm,
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  teleconsultBadgeText: { fontSize: 13, fontWeight: "700", color: PURPLE },
  teleconsultOnlyText: { fontSize: 13, color: PURPLE, marginTop: spacing.xs, fontStyle: "italic" },
  shareBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.md, paddingVertical: 6 },
  shareText: { fontSize: 14, color: colors.primary, fontWeight: "600" },
  section: { backgroundColor: colors.white, margin: spacing.md, marginBottom: 0, padding: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: colors.ink, marginBottom: spacing.sm },
  bioText: { fontSize: 14, color: colors.ink, lineHeight: 20 },
  timelineItem: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginBottom: spacing.sm },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginTop: 6 },
  itemTitle: { fontSize: 14, fontWeight: "600", color: colors.ink },
  itemSub: { fontSize: 13, color: colors.slate500, marginTop: 2 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.mist, borderRadius: radius.full },
  chipText: { fontSize: 13, color: colors.primary },
  reviewCard: { padding: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  reviewText: { fontSize: 14, color: colors.ink, marginTop: 4, lineHeight: 20 },
  reviewDate: { fontSize: 12, color: colors.slate500, marginTop: 4 },
  emptyText: { fontSize: 14, color: colors.slate500 },
  seeAllReviews: {
    paddingVertical: spacing.sm,
    alignItems: "center",
    marginTop: spacing.xs,
  },
  seeAllReviewsText: { fontSize: 14, fontWeight: "600", color: colors.primary },
  stickyCta: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: colors.white, padding: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
});
