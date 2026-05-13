import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  FlatList,
  Image,
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

type FavoriteRow = {
  id: string;
  createdAt: string;
  doctorId: string;
  doctorName: string;
  doctorSlug: string;
  doctorSpecialty: string | null;
  doctorAddress: string | null;
  doctorPhotoUrl: string | null;
};

async function getPatientToken(): Promise<string | null> {
  const SS = await import("expo-secure-store").catch(() => null);
  return SS ? SS.getItemAsync(PATIENT_TOKEN_KEY) : null;
}

export default function PatientFavoris() {
  useLocale();
  const router = useRouter();
  const [items, setItems] = useState<FavoriteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const token = await getPatientToken();
      const res = await api<{ items: FavoriteRow[] }>("/api/me/favorites", {
        token: token ?? undefined,
      });
      setItems(res.items ?? []);
    } catch {
      setError(t("patient.favoris.loadError"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      router.replace("/(patient)/plus-menu" as never);
      return true;
    });
    return () => sub.remove();
  }, [router]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  async function unfavorite(row: FavoriteRow) {
    Alert.alert(
      t("patient.favoris.removeTitle"),
      t("patient.favoris.removeConfirm").replace("{name}", row.doctorName),
      [
        { text: t("patient.favoris.cancel"), style: "cancel" },
        {
          text: t("patient.favoris.remove"),
          style: "destructive",
          onPress: async () => {
            const prev = items;
            setItems((s) => s.filter((x) => x.id !== row.id));
            try {
              const token = await getPatientToken();
              await api(`/api/me/favorites/${row.doctorId}`, {
                method: "DELETE",
                token: token ?? undefined,
              });
            } catch {
              setItems(prev);
              Alert.alert(t("patient.favoris.errorTitle"), t("patient.favoris.removeError"));
            }
          },
        },
      ],
    );
  }

  function openDoctor(row: FavoriteRow) {
    router.push({ pathname: "/(patient)/doctor/[slug]", params: { slug: row.doctorSlug } } as never);
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => router.replace("/(patient)/plus-menu" as never)} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={styles.title}>{t("patient.favoris.title")}</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.teal} style={{ marginTop: spacing["3xl"] }} />
      ) : error ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>{error}</Text>
          <Pressable onPress={load} style={styles.primaryBtn}>
            <Text style={styles.primaryBtnText}>{t("patient.favoris.retry")}</Text>
          </Pressable>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="heart-outline" size={56} color={colors.border} />
          <Text style={styles.emptyTitle}>{t("patient.favoris.emptyTitle")}</Text>
          <Text style={styles.emptySubText}>{t("patient.favoris.emptySubtitle")}</Text>
          <Pressable
            onPress={() => router.push("/(patient)/recherche" as never)}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>{t("patient.favoris.discoverCta")}</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.teal} />
          }
          renderItem={({ item }) => (
            <Pressable style={styles.card} onPress={() => openDoctor(item)}>
              {item.doctorPhotoUrl ? (
                <Image source={{ uri: item.doctorPhotoUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Ionicons name="person" size={22} color={colors.teal} />
                </View>
              )}
              <View style={styles.cardBody}>
                <Text style={styles.doctorName} numberOfLines={1}>
                  Dr. {item.doctorName}
                </Text>
                {!!item.doctorSpecialty && (
                  <Text style={styles.specialty} numberOfLines={1}>
                    {item.doctorSpecialty}
                  </Text>
                )}
                {!!item.doctorAddress && (
                  <View style={styles.addressRow}>
                    <Ionicons name="location-outline" size={12} color={colors.foregroundSecondary} />
                    <Text style={styles.address} numberOfLines={1}>
                      {item.doctorAddress}
                    </Text>
                  </View>
                )}
              </View>
              <Pressable hitSlop={10} onPress={() => unfavorite(item)} style={styles.heartBtn}>
                <Ionicons name="heart" size={22} color={colors.danger} />
              </Pressable>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
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
  listContent: { padding: spacing.lg, gap: spacing.md },
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
  avatar: { width: 48, height: 48, borderRadius: radii.full, backgroundColor: colors.bgSecondary },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  cardBody: { flex: 1, gap: 2 },
  doctorName: { fontSize: 15, fontWeight: "700", color: colors.foreground },
  specialty: { fontSize: 13, color: colors.teal },
  addressRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  address: { fontSize: 12, color: colors.foregroundSecondary, flex: 1 },
  heartBtn: { padding: spacing.xs },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl, gap: spacing.md },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.foreground, marginTop: spacing.sm },
  emptySubText: { fontSize: 13, color: colors.foregroundSecondary, textAlign: "center" },
  emptyText: { fontSize: 14, color: colors.foregroundSecondary, textAlign: "center" },
  primaryBtn: {
    backgroundColor: colors.teal,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radii.md,
    marginTop: spacing.sm,
  },
  primaryBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
});
