// apps/mobile/app/(tabs)/index.tsx
import { useCallback, useEffect, useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, StyleSheet, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { Search as SearchIcon } from "lucide-react-native";
import { api } from "@/lib/api";
import { SPECIALTIES, CITIES } from "@doktori/shared";
import { colors, spacing, radius } from "@/lib/theme";
import { DoctorCard } from "@/components/ui/DoctorCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [specialty, setSpecialty] = useState<string | undefined>();
  const [city, setCity] = useState<string | undefined>();
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const doSearch = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.searchDoctors(query, { specialty, city });
      setResults(data.hits || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [query, specialty, city]);

  useEffect(() => {
    const handler = setTimeout(doSearch, 300);
    return () => clearTimeout(handler);
  }, [doSearch]);

  function onRefresh() {
    setRefreshing(true);
    doSearch().finally(() => setRefreshing(false));
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Trouvez un médecin</Text>
        <View style={styles.searchRow}>
          <SearchIcon size={18} color={colors.slate500} />
          <TextInput
            style={styles.input}
            placeholder="Nom, spécialité, ville..."
            placeholderTextColor={colors.slate500}
            value={query}
            onChangeText={setQuery}
          />
        </View>
      </View>

      {/* Filter chips */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={SPECIALTIES}
        keyExtractor={(s) => s.id}
        style={styles.chips}
        contentContainerStyle={{ paddingHorizontal: spacing.md, gap: spacing.sm }}
        renderItem={({ item }) => (
          <Pressable
            style={[styles.chip, specialty === item.id && styles.chipActive]}
            onPress={() => setSpecialty(specialty === item.id ? undefined : item.id)}
          >
            <Text style={[styles.chipText, specialty === item.id && styles.chipTextActive]}>
              {item.label}
            </Text>
          </Pressable>
        )}
      />

      {loading && !refreshing ? (
        <LoadingSpinner />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: spacing.md, gap: spacing.md, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          ListEmptyComponent={
            <EmptyState icon="🔍" title="Recherchez un médecin" description="Tapez un nom, une spécialité ou une ville" />
          }
          renderItem={({ item }) => (
            <DoctorCard doctor={item} onPress={() => router.push(`/medecin/${item.slug}`)} />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.md, paddingBottom: spacing.sm, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: 24, fontWeight: "700", color: colors.ink, marginBottom: spacing.md },
  searchRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.bg, paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border,
  },
  input: { flex: 1, fontSize: 16, color: colors.ink },
  chips: { maxHeight: 48, backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  chip: { paddingHorizontal: 14, paddingVertical: 8, backgroundColor: colors.mist, borderRadius: radius.full },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: 13, color: colors.ink },
  chipTextActive: { color: colors.white, fontWeight: "600" },
});
