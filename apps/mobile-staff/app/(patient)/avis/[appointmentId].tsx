import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ApiError, api, colors, radii, spacing, t, useLocale } from "@doktori/mobile-core";

const PATIENT_TOKEN_KEY = "doktori.patient.token";

type Appointment = {
  id: string;
  startsAt: string;
  endsAt: string;
  status: string;
  type: string;
  reason: string | null;
  doctorName: string;
  doctorSpecialty: string;
  doctorAddress: string;
  doctorSlug: string;
};

async function getPatientToken(): Promise<string | null> {
  const SS = await import("expo-secure-store").catch(() => null);
  return SS ? SS.getItemAsync(PATIENT_TOKEN_KEY) : null;
}

export default function PatientAvis() {
  useLocale();
  const router = useRouter();
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const [appt, setAppt] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const token = await getPatientToken();
      const list = await api<Appointment[]>("/api/appointments/patient", {
        token: token ?? undefined,
      });
      const match = list.find((a) => a.id === appointmentId);
      if (!match) {
        setError(t("patient.avis.notFound"));
      } else {
        setAppt(match);
      }
    } catch {
      setError(t("patient.avis.loadError"));
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    if (appointmentId) load();
    else {
      setLoading(false);
      setError(t("patient.avis.notFound"));
    }
  }, [appointmentId, load]);

  const dateLabel = useMemo(() => {
    if (!appt) return "";
    try {
      return new Date(appt.startsAt).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return appt.startsAt;
    }
  }, [appt]);

  async function submit() {
    if (!rating) {
      Alert.alert(t("patient.avis.errorTitle"), t("patient.avis.ratingRequired"));
      return;
    }
    if (!appointmentId) return;
    setSubmitting(true);
    try {
      const token = await getPatientToken();
      await api("/api/reviews", {
        method: "POST",
        body: {
          appointmentId,
          rating,
          comment: comment.trim() || null,
          anonymous,
        },
        token: token ?? undefined,
      });
      setSubmitted(true);
    } catch (e) {
      let msg = t("patient.avis.submitError");
      if (e instanceof ApiError) {
        if (e.status === 409) msg = t("patient.avis.alreadySubmitted");
        else if (e.status === 400) msg = t("patient.avis.notCompleted");
        else if (e.status === 403) msg = t("patient.avis.notYours");
      }
      Alert.alert(t("patient.avis.errorTitle"), msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={styles.root}>
        <ActivityIndicator color={colors.teal} style={{ marginTop: spacing["3xl"] }} />
      </SafeAreaView>
    );
  }

  if (submitted) {
    return (
      <SafeAreaView edges={["top", "bottom"]} style={styles.root}>
        <View style={styles.thanksWrap}>
          <View style={styles.thanksIcon}>
            <Ionicons name="checkmark" size={48} color="#FFFFFF" />
          </View>
          <Text style={styles.thanksTitle}>{t("patient.avis.thanksTitle")}</Text>
          <Text style={styles.thanksSub}>{t("patient.avis.thanksSub")}</Text>
          <Pressable style={styles.primaryBtn} onPress={() => router.back()}>
            <Text style={styles.primaryBtnText}>{t("patient.avis.back")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !appt) {
    return (
      <SafeAreaView edges={["top"]} style={styles.root}>
        <Header onBack={() => router.back()} title={t("patient.avis.title")} />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{error ?? t("patient.avis.notFound")}</Text>
          <Pressable onPress={() => router.back()} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>{t("patient.avis.back")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const displayRating = hoverRating || rating;

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <Header onBack={() => router.back()} title={t("patient.avis.title")} />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.doctorName}>Dr. {appt.doctorName}</Text>
          <Text style={styles.specialty}>{appt.doctorSpecialty}</Text>
          <Text style={styles.date}>{dateLabel}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("patient.avis.ratingLabel")}</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                onPress={() => setRating(n)}
                onPressIn={() => setHoverRating(n)}
                onPressOut={() => setHoverRating(0)}
                hitSlop={4}
                style={styles.starBtn}
              >
                <Ionicons
                  name={n <= displayRating ? "star" : "star-outline"}
                  size={40}
                  color={n <= displayRating ? colors.amber : colors.border}
                />
              </Pressable>
            ))}
          </View>
          {rating > 0 ? (
            <Text style={styles.ratingHint}>
              {t(`patient.avis.ratingHint${rating}` as never)}
            </Text>
          ) : (
            <Text style={styles.ratingHint}>{t("patient.avis.tapToRate")}</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("patient.avis.commentLabel")}</Text>
          <TextInput
            style={[styles.input, styles.textarea]}
            value={comment}
            onChangeText={setComment}
            placeholder={t("patient.avis.commentPh")}
            placeholderTextColor={colors.foregroundSecondary}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
            maxLength={1000}
          />
          <Text style={styles.charCount}>{comment.length}/1000</Text>
        </View>

        <View style={styles.toggleRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleLabel}>{t("patient.avis.anonymous")}</Text>
            <Text style={styles.toggleHint}>{t("patient.avis.anonymousHint")}</Text>
          </View>
          <Switch
            value={anonymous}
            onValueChange={setAnonymous}
            trackColor={{ true: colors.teal, false: colors.border }}
            thumbColor="#FFFFFF"
          />
        </View>

        <Pressable
          style={[styles.primaryBtn, (!rating || submitting) && styles.primaryBtnDisabled]}
          onPress={submit}
          disabled={!rating || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryBtnText}>{t("patient.avis.submit")}</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <View style={styles.header}>
      <Pressable onPress={onBack} style={styles.backBtn} hitSlop={8}>
        <Ionicons name="chevron-back" size={22} color={colors.foreground} />
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <View style={{ width: 32 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontSize: 18, fontWeight: "700", color: colors.foreground, textAlign: "center" },
  content: { padding: spacing.lg, gap: spacing.lg },
  card: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: 4,
  },
  doctorName: { fontSize: 17, fontWeight: "700", color: colors.foreground },
  specialty: { fontSize: 14, color: colors.teal },
  date: { fontSize: 13, color: colors.foregroundSecondary, marginTop: 2 },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.foreground },
  starsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  starBtn: { padding: 4 },
  ratingHint: {
    fontSize: 13,
    color: colors.foregroundSecondary,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 15,
    color: colors.foreground,
    backgroundColor: colors.bg,
  },
  textarea: { minHeight: 120 },
  charCount: { fontSize: 12, color: colors.foregroundSecondary, textAlign: "right" },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  toggleLabel: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  toggleHint: { fontSize: 12, color: colors.foregroundSecondary, marginTop: 2 },
  primaryBtn: {
    backgroundColor: colors.teal,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: "center",
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  emptyText: { fontSize: 14, color: colors.foregroundSecondary, textAlign: "center" },
  thanksWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    gap: spacing.lg,
  },
  thanksIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
  },
  thanksTitle: { fontSize: 22, fontWeight: "700", color: colors.foreground, textAlign: "center" },
  thanksSub: { fontSize: 14, color: colors.foregroundSecondary, textAlign: "center" },
});
