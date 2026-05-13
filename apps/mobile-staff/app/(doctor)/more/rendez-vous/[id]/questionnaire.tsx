import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Linking,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t } from "@doktori/mobile-core";

type Answer = {
  id: string;
  questionId: string;
  label: string;
  kind: string;
  displayOrder: number;
  value: string | null;
  fileUrl: string | null;
  createdAt: string;
};

export default function QuestionnaireScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const appointmentId = String(id);

  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await api<Answer[]>(`/api/appointments/${appointmentId}/answers`);
        if (!cancelled) setAnswers(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t("common.error"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [appointmentId]);

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: t("doctor.rdvQuestionnaire.title") }} />
        <View style={styles.center}>
          <ActivityIndicator color={colors.teal} />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: t("doctor.rdvQuestionnaire.title") }} />
      <ScrollView style={{ flex: 1, backgroundColor: colors.bg }} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerIcon}>
            <Ionicons name="chatbubbles" size={20} color={colors.teal} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t("doctor.rdvQuestionnaire.heading")}</Text>
            <Text style={styles.subtitle}>{t("doctor.rdvQuestionnaire.sub")}</Text>
          </View>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color="#B91C1C" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!error && answers.length === 0 && (
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={36} color={colors.foregroundSecondary} />
            <Text style={styles.emptyTitle}>{t("doctor.rdvQuestionnaire.empty")}</Text>
            <Text style={styles.emptySub}>{t("doctor.rdvQuestionnaire.emptySub")}</Text>
          </View>
        )}

        {answers.map((a) => (
          <View key={a.id} style={styles.card}>
            <Text style={styles.qLabel}>{a.label}</Text>

            {a.kind === "file" ? (
              a.fileUrl ? (
                <Pressable
                  onPress={() => a.fileUrl && Linking.openURL(a.fileUrl)}
                  style={styles.fileBtn}
                >
                  <Ionicons name="document" size={16} color={colors.teal} />
                  <Text style={styles.fileBtnText}>
                    {a.value ?? t("doctor.rdvQuestionnaire.attachedFile")}
                  </Text>
                </Pressable>
              ) : (
                <View style={styles.fileBtn}>
                  <Ionicons name="document-outline" size={16} color={colors.foregroundSecondary} />
                  <Text style={styles.fileMissing}>
                    {a.value ?? "—"}{" "}
                    <Text style={styles.fileNotUploaded}>
                      {t("doctor.rdvQuestionnaire.fileNotUploaded")}
                    </Text>
                  </Text>
                </View>
              )
            ) : a.value && a.value.trim().length > 0 ? (
              <Text style={styles.qValue}>{a.value}</Text>
            ) : (
              <Text style={styles.qEmpty}>{t("doctor.rdvQuestionnaire.notProvided")}</Text>
            )}

            <Text style={styles.qDate}>
              {new Date(a.createdAt).toLocaleString("fr-FR", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        ))}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.lg,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 17, fontWeight: "800", color: colors.foreground },
  subtitle: { fontSize: 12, color: colors.foregroundSecondary, marginTop: 2 },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: { color: "#B91C1C", fontSize: 13, flex: 1 },
  emptyCard: {
    alignItems: "center",
    padding: spacing.xl,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSecondary,
    gap: spacing.sm,
  },
  emptyTitle: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  emptySub: { fontSize: 12, color: colors.foregroundSecondary, textAlign: "center" },
  card: {
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    gap: spacing.xs,
  },
  qLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: colors.teal,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  qValue: { fontSize: 14, color: colors.foreground, lineHeight: 20 },
  qEmpty: { fontSize: 13, color: colors.foregroundSecondary, fontStyle: "italic" },
  qDate: { fontSize: 11, color: colors.foregroundSecondary, marginTop: 4 },
  fileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  fileBtnText: { fontSize: 14, color: colors.teal, fontWeight: "600", textDecorationLine: "underline" },
  fileMissing: { fontSize: 13, color: colors.foreground },
  fileNotUploaded: { fontSize: 11, color: colors.foregroundSecondary, fontStyle: "italic" },
});
