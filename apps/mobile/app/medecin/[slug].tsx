import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, Share } from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import {
  Share2, MapPin, GraduationCap, Briefcase, Languages, Award,
  Video, ChevronRight, Stethoscope, Heart,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { api } from "@/lib/api";
import { SPECIALTIES, CITIES } from "@doktori/shared";
import { colors, spacing, radius, shadow } from "@/lib/theme";
import { addRecentDoctor, toggleFavorite, isFavorite } from "@/lib/favorites";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { StarRating } from "@/components/ui/StarRating";

export default function DoctorScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [doctor, setDoctor] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFav, setIsFav] = useState(false);

  useEffect(() => {
    api.getDoctor(slug).then((d) => {
      setDoctor(d);
      setLoading(false);
      if (d?.id) {
        api.getDoctorReviews(d.id).then((r) => setReviews(r.reviews ?? r ?? [])).catch(() => {});
        isFavorite(d.id).then(setIsFav);
        const spec = SPECIALTIES.find((s) => s.id === d.specialty);
        addRecentDoctor({ id: d.id, name: d.name, slug: d.slug, specialty: spec?.label ?? d.specialty, city: d.city });
      }
    }).catch(() => setLoading(false));
  }, [slug]);

  async function handleToggleFav() {
    if (!doctor) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const spec = SPECIALTIES.find((s) => s.id === doctor.specialty);
    const result = await toggleFavorite({ id: doctor.id, name: doctor.name, slug: doctor.slug, specialty: spec?.label ?? doctor.specialty, city: doctor.city });
    setIsFav(result);
  }

  if (loading) return <LoadingSpinner message="Chargement du profil..." />;
  if (!doctor) return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 20 }}>
      <Stethoscope size={48} color={colors.slate200} />
      <Text style={{ fontSize: 16, color: colors.slate500, marginTop: spacing.md }}>Médecin introuvable</Text>
    </View>
  );

  const spec = SPECIALTIES.find((s) => s.id === doctor.specialty);
  const city = CITIES.find((c) => c.id === doctor.city);
  const hasTeleconsult = doctor.consultation_mode === "teleconsult" || doctor.consultation_mode === "both";
  const teleconsultOnly = doctor.consultation_mode === "teleconsult";
  const avgRating = reviews.length > 0
    ? reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length
    : 0;

  return (
    <>
      <Stack.Screen options={{ title: doctor.name }} />
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Hero header */}
          <View style={styles.header}>
            <View style={styles.headerBg} />
            <View style={[styles.avatar, shadow.lg]}>
              <Text style={styles.avatarText}>{doctor.name.charAt(0)}</Text>
            </View>
            <Text style={styles.name}>{doctor.name}</Text>
            <Text style={styles.specialty}>{spec?.label ?? doctor.specialty}</Text>

            <View style={styles.metaRow}>
              <MapPin size={14} color={colors.slate500} />
              <Text style={styles.city}>{city?.label ?? doctor.city}</Text>
              {reviews.length > 0 && (
                <>
                  <View style={styles.metaDot} />
                  <StarRating rating={avgRating} size={14} />
                  <Text style={styles.ratingText}>{avgRating.toFixed(1)} ({reviews.length})</Text>
                </>
              )}
            </View>

            {/* Tags */}
            <View style={styles.tagRow}>
              {hasTeleconsult && (
                <View style={styles.teleconsultTag}>
                  <Video size={13} color={colors.purple} />
                  <Text style={styles.teleconsultTagText}>Vidéo disponible</Text>
                </View>
              )}
              {hasTeleconsult && doctor.teleconsultFee != null && (
                <View style={styles.feeTag}>
                  <Text style={styles.feeTagText}>
                    Téléconsult : {doctor.teleconsultFee / 1000} DT
                  </Text>
                </View>
              )}
            </View>

            {teleconsultOnly && (
              <Text style={styles.teleconsultOnlyNote}>
                Ce médecin consulte uniquement en vidéo
              </Text>
            )}

            <View style={styles.actionRow}>
              <Pressable style={styles.favBtn} onPress={handleToggleFav}>
                <Heart size={18} color={isFav ? colors.red : colors.slate400} fill={isFav ? colors.red : "transparent"} />
                <Text style={[styles.favText, isFav && { color: colors.red }]}>
                  {isFav ? "Favori" : "Ajouter"}
                </Text>
              </Pressable>
              <View style={styles.actionDivider} />
              <Pressable
                style={styles.shareBtn}
                onPress={() => Share.share({ url: `https://doktori.tn/medecin/${slug}` })}
              >
                <Share2 size={16} color={colors.primary} />
                <Text style={styles.shareText}>Partager</Text>
              </Pressable>
            </View>
          </View>

          {/* Bio */}
          {doctor.bio && (
            <SectionCard title="À propos" icon={<Stethoscope size={18} color={colors.primary} />}>
              <Text style={styles.bodyText}>{doctor.bio}</Text>
            </SectionCard>
          )}

          {/* Education */}
          {doctor.educations?.length > 0 && (
            <SectionCard title="Formation" icon={<GraduationCap size={18} color={colors.primary} />}>
              {doctor.educations.map((e: any, i: number) => (
                <View key={i} style={styles.timelineItem}>
                  <View style={styles.timelineLine}>
                    <View style={styles.timelineDot} />
                    {i < doctor.educations.length - 1 && <View style={styles.timelineBar} />}
                  </View>
                  <View style={{ flex: 1, paddingBottom: spacing.md }}>
                    <Text style={styles.itemTitle}>{e.degree}</Text>
                    <Text style={styles.itemSub}>{e.institution}{e.year ? ` · ${e.year}` : ""}</Text>
                  </View>
                </View>
              ))}
            </SectionCard>
          )}

          {/* Experience */}
          {doctor.experiences?.length > 0 && (
            <SectionCard title="Expérience" icon={<Briefcase size={18} color={colors.primary} />}>
              {doctor.experiences.map((e: any, i: number) => (
                <View key={i} style={styles.timelineItem}>
                  <View style={styles.timelineLine}>
                    <View style={[styles.timelineDot, { backgroundColor: colors.green }]} />
                    {i < doctor.experiences.length - 1 && <View style={styles.timelineBar} />}
                  </View>
                  <View style={{ flex: 1, paddingBottom: spacing.md }}>
                    <Text style={styles.itemTitle}>{e.position}</Text>
                    <Text style={styles.itemSub}>{e.institution}{e.period ? ` · ${e.period}` : ""}</Text>
                  </View>
                </View>
              ))}
            </SectionCard>
          )}

          {/* Languages + Expertise */}
          {(doctor.languages?.length > 0 || doctor.expertise?.length > 0) && (
            <SectionCard title="Compétences" icon={<Award size={18} color={colors.primary} />}>
              {doctor.languages?.length > 0 && (
                <>
                  <View style={styles.subsectionHeader}>
                    <Languages size={14} color={colors.slate500} />
                    <Text style={styles.subsectionTitle}>Langues</Text>
                  </View>
                  <View style={styles.chipRow}>
                    {doctor.languages.map((l: string) => (
                      <View key={l} style={styles.chip}><Text style={styles.chipText}>{l}</Text></View>
                    ))}
                  </View>
                </>
              )}
              {doctor.expertise?.length > 0 && (
                <>
                  <View style={[styles.subsectionHeader, { marginTop: spacing.md }]}>
                    <Award size={14} color={colors.slate500} />
                    <Text style={styles.subsectionTitle}>Expertise</Text>
                  </View>
                  <View style={styles.chipRow}>
                    {doctor.expertise.map((e: string) => (
                      <View key={e} style={[styles.chip, styles.chipExpertise]}>
                        <Text style={styles.chipExpertiseText}>{e}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </SectionCard>
          )}

          {/* Reviews */}
          <SectionCard title={`Avis patients (${reviews.length})`} icon={<StarRating rating={avgRating} size={16} />}>
            {reviews.length === 0 ? (
              <Text style={styles.emptyText}>Aucun avis pour le moment</Text>
            ) : (
              <>
                {reviews.slice(0, 3).map((r: any) => (
                  <View key={r.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <StarRating rating={r.rating} size={14} />
                      <Text style={styles.reviewDate}>
                        {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                      </Text>
                    </View>
                    {r.comment && <Text style={styles.reviewText}>{r.comment}</Text>}
                  </View>
                ))}
                {reviews.length > 3 && (
                  <Pressable
                    style={styles.seeAllBtn}
                    onPress={() => router.push(`/medecin/${slug}/avis`)}
                  >
                    <Text style={styles.seeAllText}>Voir tous les avis ({reviews.length})</Text>
                    <ChevronRight size={16} color={colors.primary} />
                  </Pressable>
                )}
              </>
            )}
          </SectionCard>
        </ScrollView>

        {/* Sticky CTA */}
        <View style={[styles.stickyCta, shadow.lg]}>
          <Button
            title="Prendre rendez-vous"
            onPress={() => router.push(`/rdv/${doctor.slug}`)}
            size="lg"
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <View style={[sectionStyles.card, shadow.sm]}>
      <View style={sectionStyles.header}>
        {icon}
        <Text style={sectionStyles.title}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    margin: spacing.md,
    marginBottom: 0,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  title: { fontSize: 17, fontWeight: "700", color: colors.ink, letterSpacing: -0.2 },
});

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.white,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    alignItems: "center",
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    position: "relative",
    overflow: "hidden",
  },
  headerBg: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: colors.primaryFaint,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: colors.white,
    marginBottom: spacing.md,
  },
  avatarText: { fontSize: 36, fontWeight: "700", color: colors.primary },
  name: { fontSize: 24, fontWeight: "800", color: colors.ink, letterSpacing: -0.3 },
  specialty: { fontSize: 16, color: colors.primary, marginTop: 4, fontWeight: "600" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.sm },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.slate400, marginHorizontal: 4 },
  city: { fontSize: 14, color: colors.slate500 },
  ratingText: { fontSize: 14, fontWeight: "600", color: colors.ink, marginLeft: 4 },
  tagRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, flexWrap: "wrap" },
  teleconsultTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: colors.purpleFaint,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  teleconsultTagText: { fontSize: 13, fontWeight: "600", color: colors.purple },
  feeTag: {
    backgroundColor: colors.purpleFaint,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  feeTagText: { fontSize: 13, fontWeight: "700", color: colors.purple },
  teleconsultOnlyNote: {
    fontSize: 13,
    color: colors.purple,
    marginTop: spacing.xs,
    fontStyle: "italic",
  },
  actionRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.md },
  favBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: colors.bg, borderRadius: radius.full },
  favText: { fontSize: 14, color: colors.slate500, fontWeight: "600" },
  actionDivider: { width: 1, height: 20, backgroundColor: colors.slate200 },
  shareBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 16, backgroundColor: colors.primaryFaint, borderRadius: radius.full },
  shareText: { fontSize: 14, color: colors.primary, fontWeight: "600" },
  bodyText: { fontSize: 15, color: colors.ink, lineHeight: 22 },
  timelineItem: { flexDirection: "row", gap: spacing.sm },
  timelineLine: { alignItems: "center", width: 16 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary, marginTop: 5 },
  timelineBar: { width: 2, flex: 1, backgroundColor: colors.border, marginTop: 4 },
  itemTitle: { fontSize: 15, fontWeight: "600", color: colors.ink },
  itemSub: { fontSize: 13, color: colors.slate500, marginTop: 2 },
  subsectionHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: spacing.sm },
  subsectionTitle: { fontSize: 14, fontWeight: "600", color: colors.slate500 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.mist, borderRadius: radius.full },
  chipText: { fontSize: 13, color: colors.primary, fontWeight: "500" },
  chipExpertise: { backgroundColor: colors.primaryFaint, borderWidth: 1, borderColor: colors.primaryLight },
  chipExpertiseText: { fontSize: 13, color: colors.primaryDark, fontWeight: "500" },
  reviewCard: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  reviewHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  reviewText: { fontSize: 14, color: colors.ink, marginTop: 6, lineHeight: 20 },
  reviewDate: { fontSize: 12, color: colors.slate400 },
  emptyText: { fontSize: 14, color: colors.slate400, fontStyle: "italic" },
  seeAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: spacing.md,
  },
  seeAllText: { fontSize: 15, fontWeight: "600", color: colors.primary },
  stickyCta: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingBottom: spacing.xl,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
});
