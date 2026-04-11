import { useEffect, useState } from "react";
import { View, Text, TextInput, FlatList, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { api } from "@/lib/api";
import { SPECIALTIES, CITIES } from "@doktori/shared";

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handler = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.searchDoctors(query);
        setResults(data.hits || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [query]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Trouvez un médecin</Text>
        <Text style={styles.subtitle}>Réservez en 2 clics</Text>
      </View>
      <TextInput
        style={styles.input}
        placeholder="Nom, spécialité, ville..."
        placeholderTextColor="#9ca3af"
        value={query}
        onChangeText={setQuery}
      />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} color="#2563eb" />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          ListEmptyComponent={
            <Text style={styles.empty}>Tapez pour rechercher un médecin</Text>
          }
          renderItem={({ item }) => {
            const spec = SPECIALTIES.find((s) => s.id === item.specialty);
            const city = CITIES.find((c) => c.id === item.city);
            return (
              <Pressable
                style={styles.card}
                onPress={() => router.push(`/medecin/${item.slug}`)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.name?.charAt(0) || "?"}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.doctorName}>{item.name}</Text>
                  <Text style={styles.specialty}>{spec?.label}</Text>
                  <Text style={styles.city}>{city?.label}</Text>
                </View>
                {item.consultationFee && (
                  <View>
                    <Text style={styles.fee}>{item.consultationFee / 1000} DT</Text>
                  </View>
                )}
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  header: { padding: 20, paddingBottom: 10, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb" },
  title: { fontSize: 24, fontWeight: "700", color: "#111827" },
  subtitle: { fontSize: 14, color: "#6b7280", marginTop: 4 },
  input: {
    backgroundColor: "#fff", margin: 16, padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: "#e5e7eb", fontSize: 16,
  },
  empty: { textAlign: "center", color: "#9ca3af", marginTop: 40 },
  card: {
    backgroundColor: "#fff", padding: 16, borderRadius: 12, flexDirection: "row",
    alignItems: "center", gap: 12, borderWidth: 1, borderColor: "#e5e7eb",
  },
  avatar: {
    width: 48, height: 48, borderRadius: 24, backgroundColor: "#dbeafe",
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 20, fontWeight: "700", color: "#2563eb" },
  doctorName: { fontSize: 16, fontWeight: "600", color: "#111827" },
  specialty: { fontSize: 14, color: "#2563eb", marginTop: 2 },
  city: { fontSize: 13, color: "#6b7280", marginTop: 2 },
  fee: { fontSize: 16, fontWeight: "700", color: "#111827" },
});
