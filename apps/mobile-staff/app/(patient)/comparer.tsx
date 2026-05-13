import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api, colors, radii, spacing, t, useLocale } from "@doktori/mobile-core";

const PATIENT_TOKEN_KEY = "doktori.patient.token";
const MAX_COMPARE = 3;

type Doctor = {
  id: string;
  name: string;
  specialty: string | null;
  slug: string;
  city?: string | null;
  photoUrl: string | null;
  consultationFee?: number | null;
  averageRating?: number | null;
  reviewsCount?: number | null;
  acceptsCnam?: boolean | null;
  distanceKm?: number | null;
};

async function getPatientToken(): Promise<string | null> {
  const SS = await import("expo-secure-store").catch(() => null);
  return SS ? SS.getItemAsync(PATIENT_TOKEN_KEY) : null;
}

function formatFee(millimes: number | null | undefined): string {
  if (millimes == null) return "—";
  return `${(millimes / 1000).toFixed(0)} DT`;
}

function formatRating(r: number | null | undefined): string {
  if (r == null) return "—";
  return r.toFixed(1);
}

export default function PatientComparer() {
  useLocale();
  const router = useRouter();
  const [selected, setSelected] = useState<Doctor[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Doctor[]>([]);
  const [searching, setSearching] = useState(false);

  const searchDoctors = useCallback(async (q: string) => {
    setSearching(true);
    try {
      const token = await getPatientToken();
      const params = new URLSearchParams({ q: q || "", limit: "20" });
      const res = await api<{ hits: Doctor[] }>(`/api/search?${params}`, {
        token: token ?? undefined,
      });
      setResults(res.hits ?? []);
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (!modalOpen) return;
    const id = setTimeout(() => searchDoctors(query), 250);
    return () => clearTimeout(id);
  }, [query, modalOpen, searchDoctors]);

  function addDoctor(d: Doctor) {
    setSelected((cur) => {
      if (cur.find((x) => x.id === d.id)) return cur;
      if (cur.length >= MAX_COMPARE) return cur;
      return [...cur, d];
    });
    setModalOpen(false);
  }

  function removeDoctor(id: string) {
    setSelected((cur) => cur.filter((x) => x.id !== id));
  }

  function chooseDoctor(d: Doctor) {
    router.push({ pathname: "/(patient)/doctor/[slug]", params: { slug: d.slug } } as never);
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={styles.title}>{t("patient.comparer.title")}</Text>
        <View style={{ width: 32 }} />
      </View>

      {selected.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Ionicons name="git-compare-outline" size={64} color={colors.border} />
          <Text style={styles.emptyTitle}>{t("patient.comparer.emptyTitle")}</Text>
          <Text style={styles.emptyText}>{t("patient.comparer.emptyText")}</Text>
          <Pressable onPress={() => setModalOpen(true)} style={styles.primaryBtn}>
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.primaryBtnText}>{t("patient.comparer.addCta")}</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cards}>
            {selected.map((d) => (
              <View key={d.id} style={styles.card}>
                <Pressable style={styles.removeBtn} onPress={() => removeDoctor(d.id)} hitSlop={8}>
                  <Ionicons name="close-circle" size={22} color={colors.foregroundSecondary} />
                </Pressable>
                {d.photoUrl ? (
                  <Image source={{ uri: d.photoUrl }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback]}>
                    <Ionicons name="person" size={28} color={colors.teal} />
                  </View>
                )}
                <Text style={styles.docName} numberOfLines={2}>Dr. {d.name}</Text>
                {!!d.specialty && <Text style={styles.docSpec}>{d.specialty}</Text>}

                <View style={styles.rowsBox}>
                  <Row icon="star" label={t("patient.comparer.rating")} value={
                    d.averageRating != null
                      ? `${formatRating(d.averageRating)} (${d.reviewsCount ?? 0})`
                      : "—"
                  } />
                  <Row icon="cash-outline" label={t("patient.comparer.fee")} value={formatFee(d.consultationFee)} />
                  <Row
                    icon="navigate-outline"
                    label={t("patient.comparer.distance")}
                    value={d.distanceKm != null ? `${d.distanceKm.toFixed(1)} km` : d.city || "—"}
                  />
                  <Row
                    icon="shield-checkmark-outline"
                    label={t("patient.comparer.cnam")}
                    value={d.acceptsCnam ? t("patient.comparer.yes") : t("patient.comparer.no")}
                  />
                </View>

                <Pressable style={styles.chooseBtn} onPress={() => chooseDoctor(d)}>
                  <Text style={styles.chooseBtnText}>{t("patient.comparer.choose")}</Text>
                </Pressable>
              </View>
            ))}

            {selected.length < MAX_COMPARE && (
              <Pressable onPress={() => setModalOpen(true)} style={[styles.card, styles.cardAdd]}>
                <Ionicons name="add-circle-outline" size={48} color={colors.teal} />
                <Text style={styles.addText}>{t("patient.comparer.addCta")}</Text>
              </Pressable>
            )}
          </ScrollView>
        </ScrollView>
      )}

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setModalOpen(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t("patient.comparer.searchTitle")}</Text>
              <Pressable onPress={() => setModalOpen(false)} hitSlop={8}>
                <Ionicons name="close" size={22} color={colors.foreground} />
              </Pressable>
            </View>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color={colors.foregroundSecondary} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={t("patient.comparer.searchPh")}
                placeholderTextColor={colors.foregroundSecondary}
                style={styles.searchInput}
                autoFocus
              />
            </View>
            {searching ? (
              <ActivityIndicator color={colors.teal} style={{ marginTop: spacing.md }} />
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                {results.length === 0 ? (
                  <Text style={styles.noResults}>{t("patient.comparer.noResults")}</Text>
                ) : (
                  results.map((d) => {
                    const already = !!selected.find((x) => x.id === d.id);
                    return (
                      <Pressable
                        key={d.id}
                        onPress={() => !already && addDoctor(d)}
                        disabled={already}
                        style={[styles.resultRow, already && styles.resultRowDisabled]}
                      >
                        {d.photoUrl ? (
                          <Image source={{ uri: d.photoUrl }} style={styles.resultAvatar} />
                        ) : (
                          <View style={[styles.resultAvatar, styles.avatarFallback]}>
                            <Ionicons name="person" size={18} color={colors.teal} />
                          </View>
                        )}
                        <View style={{ flex: 1 }}>
                          <Text style={styles.resultName}>Dr. {d.name}</Text>
                          {!!d.specialty && <Text style={styles.resultSpec}>{d.specialty}</Text>}
                        </View>
                        {already ? (
                          <Ionicons name="checkmark-circle" size={20} color={colors.teal} />
                        ) : (
                          <Ionicons name="add-circle-outline" size={22} color={colors.teal} />
                        )}
                      </Pressable>
                    );
                  })
                )}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function Row({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.row}>
      <View style={styles.rowHead}>
        <Ionicons name={icon} size={13} color={colors.foregroundSecondary} />
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Text style={styles.rowValue} numberOfLines={1}>{value}</Text>
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
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.foreground, marginTop: spacing.sm },
  emptyText: { fontSize: 13, color: colors.foregroundSecondary, textAlign: "center" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.teal,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    marginTop: spacing.sm,
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  scroll: { padding: spacing.lg },
  cards: { gap: spacing.md, paddingRight: spacing.lg },
  card: {
    width: 220,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardAdd: { alignItems: "center", justifyContent: "center", borderStyle: "dashed" },
  removeBtn: { position: "absolute", top: 6, right: 6, zIndex: 1 },
  avatar: { width: 72, height: 72, borderRadius: radii.full, alignSelf: "center", backgroundColor: colors.bgSecondary },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  docName: { fontSize: 15, fontWeight: "700", color: colors.foreground, textAlign: "center" },
  docSpec: { fontSize: 12, color: colors.teal, textAlign: "center" },
  rowsBox: { gap: spacing.xs, marginVertical: spacing.sm },
  row: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 4,
  },
  rowHead: { flexDirection: "row", alignItems: "center", gap: 4 },
  rowLabel: { fontSize: 11, color: colors.foregroundSecondary, textTransform: "uppercase" },
  rowValue: { fontSize: 13, fontWeight: "600", color: colors.foreground, marginTop: 2 },
  chooseBtn: {
    backgroundColor: colors.teal,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    alignItems: "center",
  },
  chooseBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  addText: { fontSize: 13, fontWeight: "600", color: colors.teal, marginTop: spacing.xs },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  modalCard: {
    backgroundColor: colors.bg,
    padding: spacing.lg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: "85%",
  },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: spacing.md },
  modalTitle: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
    marginBottom: spacing.md,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.foreground },
  noResults: { textAlign: "center", color: colors.foregroundSecondary, padding: spacing.md, fontSize: 13 },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radii.md,
    marginBottom: spacing.xs,
  },
  resultRowDisabled: { opacity: 0.5 },
  resultAvatar: { width: 40, height: 40, borderRadius: radii.full, backgroundColor: colors.bgSecondary },
  resultName: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  resultSpec: { fontSize: 12, color: colors.foregroundSecondary },
});
