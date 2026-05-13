import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { api, colors, radii, spacing, t, useLocale } from "@doktori/mobile-core";

const PATIENT_TOKEN_KEY = "doktori.patient.token";

type Doc = {
  id: string;
  fileName: string;
  mimeType?: string | null;
  fileSize?: number | null;
  url?: string | null;
  sharedWithDoctorIds?: string[] | null;
  sharedWithName?: string | null;
  createdAt?: string | null;
};

type Filter = "all" | "shared" | "private";

async function getPatientToken(): Promise<string | null> {
  const SS = await import("expo-secure-store").catch(() => null);
  return SS ? SS.getItemAsync(PATIENT_TOKEN_KEY) : null;
}

function fmtSize(bytes?: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} ${t("patient.documents.bytes")}`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} ${t("patient.documents.kb")}`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ${t("patient.documents.mb")}`;
}

function iconFor(mime?: string | null): keyof typeof Ionicons.glyphMap {
  if (!mime) return "document-outline";
  if (mime.startsWith("image/")) return "image-outline";
  if (mime.includes("pdf")) return "document-text-outline";
  return "document-outline";
}

export default function PatientMesDocuments() {
  useLocale();
  const router = useRouter();
  const [items, setItems] = useState<Doc[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const token = await getPatientToken();
      const r = await api<{ items: Doc[] }>("/api/patient-documents", {
        token: token ?? undefined,
      });
      setItems(r.items ?? []);
    } catch {
      setErr(t("patient.documents.loadError"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "shared")
      return items.filter((x) => (x.sharedWithDoctorIds?.length ?? 0) > 0);
    return items.filter((x) => (x.sharedWithDoctorIds?.length ?? 0) === 0);
  }, [items, filter]);

  async function pickAndUpload() {
    setUploading(true);
    try {
      const ImagePicker = await import("expo-image-picker").catch(() => null);
      if (!ImagePicker) {
        Alert.alert(t("patient.documents.errorTitle"), "expo-image-picker missing");
        return;
      }
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
      });
      if (res.canceled || !res.assets?.[0]) return;
      const asset = res.assets[0];

      const token = await getPatientToken();
      const form = new FormData();
      // @ts-expect-error RN FormData blob with uri
      form.append("file", {
        uri: asset.uri,
        name: asset.fileName || `upload-${Date.now()}.jpg`,
        type: asset.mimeType || "image/jpeg",
      });

      const base = (process.env.EXPO_PUBLIC_API_BASE_URL || "").replace(/\/$/, "");
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      const resp = await fetch(`${base}/api/patient-documents`, {
        method: "POST",
        headers,
        body: form as unknown as BodyInit,
      });
      if (!resp.ok) throw new Error("upload failed");
      await load();
      Alert.alert(t("patient.documents.uploaded"));
    } catch {
      Alert.alert(t("patient.documents.errorTitle"), t("patient.documents.uploadError"));
    } finally {
      setUploading(false);
    }
  }

  function confirmDelete(d: Doc) {
    Alert.alert(
      t("patient.documents.deleteConfirmTitle"),
      t("patient.documents.deleteConfirmBody"),
      [
        { text: t("patient.parametres.cancel"), style: "cancel" },
        {
          text: t("patient.documents.delete"),
          style: "destructive",
          onPress: async () => {
            const prev = items;
            setItems((arr) => arr.filter((x) => x.id !== d.id));
            try {
              const token = await getPatientToken();
              await api(`/api/patient-documents/${d.id}`, {
                method: "DELETE",
                token: token ?? undefined,
              });
            } catch {
              setItems(prev);
              Alert.alert(t("patient.documents.errorTitle"), t("patient.documents.deleteError"));
            }
          },
        },
      ],
    );
  }

  async function toggleShare(d: Doc) {
    const isShared = (d.sharedWithDoctorIds?.length ?? 0) > 0;
    // Without doctor picker UI here, unshare only (set to []).
    if (!isShared) {
      Alert.alert(t("patient.documents.share"), t("patient.documents.sharedWith") + " …");
      return;
    }
    const prev = items;
    setItems((arr) =>
      arr.map((x) => (x.id === d.id ? { ...x, sharedWithDoctorIds: [] } : x)),
    );
    try {
      const token = await getPatientToken();
      await api(`/api/patient-documents/${d.id}`, {
        method: "PATCH",
        token: token ?? undefined,
        body: { doctorIds: [] },
      });
    } catch {
      setItems(prev);
      Alert.alert(t("patient.documents.errorTitle"));
    }
  }

  return (
    <SafeAreaView edges={["top"]} style={s.root}>
      <View style={s.header}>
        <Pressable onPress={() => router.back()} style={s.back} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={s.title}>{t("patient.documents.title")}</Text>
        <Pressable
          onPress={pickAndUpload}
          style={s.addBtn}
          hitSlop={8}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
              <Text style={s.addBtnText}>{t("patient.documents.upload")}</Text>
            </>
          )}
        </Pressable>
      </View>

      <View style={s.filtersRow}>
        {(["all", "shared", "private"] as Filter[]).map((f) => {
          const active = filter === f;
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[s.chip, active && s.chipActive]}
            >
              <Text style={[s.chipText, active && s.chipTextActive]}>
                {t(`patient.documents.filters.${f}` as never)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.teal} style={{ marginTop: spacing["3xl"] }} />
      ) : err ? (
        <View style={s.center}>
          <Text style={s.errText}>{err}</Text>
          <Pressable onPress={load} style={s.primaryBtn}>
            <Text style={s.primaryBtnText}>{t("patient.documents.retry")}</Text>
          </Pressable>
        </View>
      ) : filtered.length === 0 ? (
        <View style={s.center}>
          <Ionicons name="folder-open-outline" size={56} color={colors.border} />
          <Text style={s.emptyTitle}>{t("patient.documents.empty")}</Text>
          <Text style={s.emptyHint}>{t("patient.documents.emptyHint")}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(it) => it.id}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />
          }
          renderItem={({ item }) => {
            const shared = (item.sharedWithDoctorIds?.length ?? 0) > 0;
            return (
              <Pressable
                style={s.card}
                onPress={() => item.url && Linking.openURL(item.url)}
                onLongPress={() => confirmDelete(item)}
              >
                <View style={s.iconBox}>
                  <Ionicons name={iconFor(item.mimeType)} size={22} color={colors.teal} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={s.cardTitle} numberOfLines={1}>
                    {item.fileName}
                  </Text>
                  <Text style={s.cardMeta}>
                    {fmtSize(item.fileSize)}
                    {item.createdAt
                      ? ` · ${new Date(item.createdAt).toLocaleDateString()}`
                      : ""}
                  </Text>
                  {shared ? (
                    <View style={s.sharedBadge}>
                      <Ionicons name="people-outline" size={11} color={colors.teal} />
                      <Text style={s.sharedBadgeText}>
                        {item.sharedWithName ||
                          t("patient.documents.shared")}
                      </Text>
                    </View>
                  ) : (
                    <Text style={s.privateBadge}>{t("patient.documents.private")}</Text>
                  )}
                </View>
                <Pressable
                  onPress={() => toggleShare(item)}
                  hitSlop={8}
                  style={s.iconAction}
                >
                  <Ionicons
                    name={shared ? "people" : "people-outline"}
                    size={18}
                    color={shared ? colors.teal : colors.foregroundSecondary}
                  />
                </Pressable>
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  back: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, fontSize: 18, fontWeight: "700", color: colors.foreground, textAlign: "center" },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.teal,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  addBtnText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  filtersRow: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  chipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  chipText: { fontSize: 12, color: colors.foreground },
  chipTextActive: { color: "#fff", fontWeight: "700" },
  list: { padding: spacing.lg, paddingTop: 0, gap: spacing.md },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  cardMeta: { fontSize: 12, color: colors.foregroundSecondary },
  sharedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  sharedBadgeText: { fontSize: 11, color: colors.teal, fontWeight: "600" },
  privateBadge: { fontSize: 11, color: colors.foregroundSecondary, marginTop: 4 },
  iconAction: { padding: 6 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  emptyHint: { fontSize: 13, color: colors.foregroundSecondary, textAlign: "center" },
  errText: { fontSize: 14, color: "#DC2626", textAlign: "center" },
  primaryBtn: {
    backgroundColor: colors.teal,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});
