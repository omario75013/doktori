import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  Modal,
  ScrollView,
  Linking,
  Share,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  colors,
  spacing,
  radii,
  api,
  t,
  useLocale,
  getApiBaseUrl,
} from "@doktori/mobile-core";
import { Screen, Loader, Empty } from "./_ui";

// Row shape returned by GET /api/medical-certificates?doctorId=me
type CertificateRow = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  appointmentId: string | null;
  verificationToken: string | null;
  templateId: string | null;
  patientId: string | null;
  patientName: string | null;
};

type FilterKey = "all" | "today" | "week" | "month";

// HTML strip: certificate content can contain rich-text markup
// (mirrors the prescription-render output). We strip tags + decode
// the handful of entities the renderer emits, then collapse blank lines.
function stripHtml(input: string): string {
  if (!input) return "";
  let s = input;
  // Block-level breaks -> newlines so paragraphs stay separated
  s = s.replace(/<\s*br\s*\/?\s*>/gi, "\n");
  s = s.replace(/<\/\s*(p|div|h[1-6]|li|tr)\s*>/gi, "\n");
  s = s.replace(/<[^>]+>/g, "");
  s = s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
  // Collapse runs of blank lines / trailing whitespace
  s = s.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n");
  return s.trim();
}

function formatDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleDateString(
      locale === "ar" ? "ar-TN" : "fr-FR",
      { day: "numeric", month: "short", year: "numeric" },
    );
  } catch {
    return iso;
  }
}

function isInRange(iso: string, key: FilterKey): boolean {
  if (key === "all") return true;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  if (key === "today") {
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }
  if (key === "week") {
    const ms = 7 * 24 * 60 * 60 * 1000;
    return now.getTime() - d.getTime() < ms;
  }
  if (key === "month") {
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth()
    );
  }
  return true;
}

export default function CertificatsScreen() {
  const { locale } = useLocale();
  const isRtl = locale === "ar";

  const [rows, setRows] = useState<CertificateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [openId, setOpenId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<CertificateRow[]>(
        "/api/medical-certificates?doctorId=me",
        { noRedirect: true },
      );
      setRows(Array.isArray(data) ? data : []);
    } catch {
      Alert.alert(t("doctor.certificats.loadError"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (!isInRange(r.createdAt, filter)) return false;
      if (!q) return true;
      return (
        (r.title || "").toLowerCase().includes(q) ||
        (r.patientName || "").toLowerCase().includes(q)
      );
    });
  }, [rows, query, filter]);

  const opened = useMemo(
    () => rows.find((r) => r.id === openId) || null,
    [rows, openId],
  );

  function publicUrl(id: string): string {
    const base = getApiBaseUrl();
    return `${base}/certificat-medical/${id}`;
  }

  async function openPublic(id: string) {
    const url = publicUrl(id);
    try {
      await Linking.openURL(url);
    } catch {
      // ignore — Linking will throw if no handler
    }
  }

  async function sharePublic(id: string, title: string) {
    const url = publicUrl(id);
    try {
      await Share.share({ message: `${title}\n${url}`, url, title });
    } catch {
      // user cancelled
    }
  }

  function confirmDelete(row: CertificateRow) {
    Alert.alert(
      t("doctor.certificats.deleteConfirmTitle"),
      t("doctor.certificats.deleteConfirmMessage"),
      [
        { text: t("doctor.certificats.cancel"), style: "cancel" },
        {
          text: t("doctor.certificats.confirmDelete"),
          style: "destructive",
          onPress: () => doDelete(row.id),
        },
      ],
    );
  }

  async function doDelete(id: string) {
    setDeletingId(id);
    try {
      await api(`/api/medical-certificates/${id}`, {
        method: "DELETE",
        noRedirect: true,
      });
      setRows((prev) => prev.filter((r) => r.id !== id));
      if (openId === id) setOpenId(null);
    } catch {
      Alert.alert(t("doctor.certificats.deleteError"));
    } finally {
      setDeletingId(null);
    }
  }

  const filters: { key: FilterKey; label: string }[] = [
    { key: "all", label: t("doctor.certificats.filterAll") },
    { key: "today", label: t("doctor.certificats.filterToday") },
    { key: "week", label: t("doctor.certificats.filterWeek") },
    { key: "month", label: t("doctor.certificats.filterMonth") },
  ];

  return (
    <>
      <Stack.Screen options={{ title: t("doctor.certificats.title") }} />
      <Screen>
        <View style={[styles.header, isRtl && styles.rowRtl]}>
          <View style={styles.headerIcon}>
            <Ionicons name="document-text" size={20} color={colors.teal} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, isRtl && styles.txtRtl]}>
              {t("doctor.certificats.title")}
            </Text>
            <Text style={[styles.subtitle, isRtl && styles.txtRtl]}>
              {t("doctor.certificats.subtitle")}
            </Text>
          </View>
          <View style={styles.counter}>
            <Text style={styles.counterNum}>{rows.length}</Text>
          </View>
        </View>

        <View style={[styles.searchBox, isRtl && styles.rowRtl]}>
          <Ionicons
            name="search"
            size={16}
            color={colors.foregroundSecondary}
          />
          <TextInput
            style={[styles.searchInput, isRtl && styles.txtRtl]}
            value={query}
            onChangeText={setQuery}
            placeholder={t("doctor.certificats.searchPlaceholder")}
            placeholderTextColor={colors.foregroundSecondary}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons
                name="close-circle"
                size={16}
                color={colors.foregroundSecondary}
              />
            </Pressable>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {filters.map((f) => {
            const active = filter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setFilter(f.key)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text
                  style={[
                    styles.chipText,
                    active && styles.chipTextActive,
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {loading ? (
          <Loader />
        ) : visible.length === 0 ? (
          <Empty
            icon="document-text-outline"
            title={
              rows.length === 0
                ? t("doctor.certificats.empty")
                : t("doctor.certificats.noMatch")
            }
            sub={
              rows.length === 0
                ? t("doctor.certificats.emptySub")
                : t("doctor.certificats.noMatchSub")
            }
          />
        ) : (
          <View style={{ gap: spacing.sm }}>
            {visible.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => setOpenId(r.id)}
                style={styles.row}
              >
                <View style={[styles.rowBody, isRtl && styles.rowRtl]}>
                  <View style={styles.rowIcon}>
                    <Ionicons
                      name="ribbon"
                      size={18}
                      color={colors.teal}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text
                      style={[styles.rowTitle, isRtl && styles.txtRtl]}
                      numberOfLines={1}
                    >
                      {r.title}
                    </Text>
                    <Text
                      style={[styles.rowSub, isRtl && styles.txtRtl]}
                      numberOfLines={1}
                    >
                      {r.patientName ||
                        t("doctor.certificats.unknownPatient")}
                      {"  •  "}
                      {formatDate(r.createdAt, locale)}
                    </Text>
                    <View style={[styles.badges, isRtl && styles.rowRtl]}>
                      {r.templateId ? (
                        <View style={styles.badgeTpl}>
                          <Ionicons
                            name="copy-outline"
                            size={10}
                            color={colors.teal}
                          />
                          <Text style={styles.badgeTplText}>
                            {t("doctor.certificats.fromTemplate")}
                          </Text>
                        </View>
                      ) : null}
                      {r.verificationToken ? (
                        <View style={styles.badgeTok}>
                          <Ionicons
                            name="shield-checkmark-outline"
                            size={10}
                            color={colors.foregroundSecondary}
                          />
                          <Text style={styles.badgeTokText}>
                            {r.verificationToken.slice(0, 6)}…
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                  <Ionicons
                    name={isRtl ? "chevron-back" : "chevron-forward"}
                    size={18}
                    color={colors.foregroundSecondary}
                  />
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </Screen>

      <Modal
        visible={!!opened}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setOpenId(null)}
      >
        {opened ? (
          <View style={styles.modalRoot}>
            <View style={[styles.modalHeader, isRtl && styles.rowRtl]}>
              <Pressable onPress={() => setOpenId(null)} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.foreground} />
              </Pressable>
              <Text style={styles.modalHeaderTitle} numberOfLines={1}>
                {t("doctor.certificats.viewTitle")}
              </Text>
              <View style={{ width: 22 }} />
            </View>

            <ScrollView contentContainerStyle={styles.modalBody}>
              <Text style={[styles.modalTitle, isRtl && styles.txtRtl]}>
                {opened.title}
              </Text>

              <View style={styles.metaCard}>
                <View style={[styles.metaRow, isRtl && styles.rowRtl]}>
                  <Text style={styles.metaLabel}>
                    {t("doctor.certificats.patient")}
                  </Text>
                  <Text style={styles.metaValue}>
                    {opened.patientName ||
                      t("doctor.certificats.unknownPatient")}
                  </Text>
                </View>
                <View style={[styles.metaRow, isRtl && styles.rowRtl]}>
                  <Text style={styles.metaLabel}>
                    {t("doctor.certificats.issuedOn")}
                  </Text>
                  <Text style={styles.metaValue}>
                    {formatDate(opened.createdAt, locale)}
                  </Text>
                </View>
                {opened.verificationToken ? (
                  <View style={[styles.metaRow, isRtl && styles.rowRtl]}>
                    <Text style={styles.metaLabel}>
                      {t("doctor.certificats.tokenLabel")}
                    </Text>
                    <Text
                      style={[styles.metaValue, { fontFamily: "monospace" }]}
                      numberOfLines={1}
                    >
                      {opened.verificationToken.slice(0, 16)}…
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text style={styles.sectionLabel}>
                {t("doctor.certificats.content")}
              </Text>
              <View style={styles.contentCard}>
                <Text
                  style={[styles.contentText, isRtl && styles.txtRtl]}
                  selectable
                >
                  {stripHtml(opened.content)}
                </Text>
              </View>

              <Text style={styles.sectionLabel}>
                {t("doctor.certificats.verifyUrl")}
              </Text>
              <View style={styles.urlCard}>
                <Text style={styles.urlText} selectable numberOfLines={2}>
                  {publicUrl(opened.id)}
                </Text>
              </View>

              <View style={styles.actions}>
                <Pressable
                  onPress={() => openPublic(opened.id)}
                  style={[styles.actionBtn, styles.actionPrimary]}
                >
                  <Ionicons
                    name="open-outline"
                    size={16}
                    color="#fff"
                  />
                  <Text style={styles.actionPrimaryText}>
                    {t("doctor.certificats.openInBrowser")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => sharePublic(opened.id, opened.title)}
                  style={[styles.actionBtn, styles.actionGhost]}
                >
                  <Ionicons
                    name="share-outline"
                    size={16}
                    color={colors.foreground}
                  />
                  <Text style={styles.actionGhostText}>
                    {t("doctor.certificats.share")}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => confirmDelete(opened)}
                  disabled={deletingId === opened.id}
                  style={[
                    styles.actionBtn,
                    styles.actionDanger,
                    deletingId === opened.id && { opacity: 0.5 },
                  ]}
                >
                  <Ionicons name="trash-outline" size={16} color="#B91C1C" />
                  <Text style={styles.actionDangerText}>
                    {t("doctor.certificats.delete")}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        ) : null}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  rowRtl: { flexDirection: "row-reverse" },
  txtRtl: { textAlign: "right", writingDirection: "rtl" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.foreground },
  subtitle: {
    fontSize: 12,
    color: colors.foregroundSecondary,
    marginTop: 2,
  },
  counter: {
    minWidth: 36,
    height: 28,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  counterNum: { fontSize: 14, fontWeight: "800", color: colors.teal },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    height: 40,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: colors.foreground,
    paddingVertical: 0,
  },
  chips: {
    flexDirection: "row",
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    height: 32,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  chipActive: {
    borderColor: colors.teal,
    backgroundColor: "rgba(0,150,150,0.08)",
  },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.foreground },
  chipTextActive: { color: colors.teal },
  row: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.bg,
  },
  rowBody: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: "rgba(0,150,150,0.10)",
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.foreground,
  },
  rowSub: {
    fontSize: 12,
    color: colors.foregroundSecondary,
    marginTop: 2,
  },
  badges: {
    flexDirection: "row",
    gap: spacing.xs,
    marginTop: spacing.xs,
    flexWrap: "wrap",
  },
  badgeTpl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: "rgba(0,150,150,0.10)",
  },
  badgeTplText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.teal,
  },
  badgeTok: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.bgSecondary,
  },
  badgeTokText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.foregroundSecondary,
    fontFamily: "monospace",
  },
  modalRoot: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalHeaderTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "700",
    color: colors.foreground,
  },
  modalBody: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing["2xl"],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.foreground,
  },
  metaCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.bgSecondary,
    padding: spacing.md,
    gap: spacing.xs,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  metaLabel: {
    fontSize: 12,
    color: colors.foregroundSecondary,
  },
  metaValue: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.foreground,
    flex: 1,
    textAlign: "right",
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: spacing.xs,
  },
  contentCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    backgroundColor: colors.bg,
  },
  contentText: {
    fontSize: 13,
    lineHeight: 20,
    color: colors.foreground,
  },
  urlCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.sm,
    backgroundColor: colors.bgSecondary,
  },
  urlText: {
    fontSize: 11,
    fontFamily: "monospace",
    color: colors.foregroundSecondary,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    height: 44,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
  },
  actionPrimary: {
    backgroundColor: colors.teal,
  },
  actionPrimaryText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  actionGhost: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  actionGhostText: {
    color: colors.foreground,
    fontWeight: "700",
    fontSize: 14,
  },
  actionDanger: {
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  actionDangerText: {
    color: "#B91C1C",
    fontWeight: "700",
    fontSize: 14,
  },
});
