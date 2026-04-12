import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Location from "expo-location";
import { api, apiFetch } from "@/lib/api";
import { colors, spacing, radius } from "@/lib/theme";
import { getPatient } from "@/lib/auth";
import { Button } from "@/components/ui/Button";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { Input } from "@/components/ui/Input";

export default function DomicileScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [doctor, setDoctor] = useState<any>(null);
  const [loadingDoctor, setLoadingDoctor] = useState(true);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [reason, setReason] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.getDoctor(slug)
      .then(setDoctor)
      .catch(() => Alert.alert("Erreur", "Médecin introuvable."))
      .finally(() => setLoadingDoctor(false));
  }, [slug]);

  useEffect(() => {
    getPatient().then((p) => {
      if (p?.name) setName(p.name);
      if (p?.phone) setPhone(p.phone);
    });
    prefillLocation();
  }, []);

  async function prefillLocation() {
    setGeoLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLatitude(loc.coords.latitude);
      setLongitude(loc.coords.longitude);

      const [geo] = await Location.reverseGeocodeAsync({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
      if (geo) {
        const parts = [geo.streetNumber, geo.street, geo.city, geo.region].filter(Boolean);
        setAddress(parts.join(", "));
      }
    } catch {
      // geolocation unavailable — user will fill manually
    } finally {
      setGeoLoading(false);
    }
  }

  async function handleBook() {
    if (!doctor || !name || !phone || !address) {
      Alert.alert("Veuillez remplir tous les champs obligatoires.");
      return;
    }
    setSubmitting(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const result = await apiFetch<any>("/api/appointments", {
        method: "POST",
        body: JSON.stringify({
          doctorId: doctor.id,
          patientName: name,
          patientPhone: phone,
          date: today,
          type: "home_visit",
          address,
          latitude,
          longitude,
          reason: reason || undefined,
        }),
      });
      Alert.alert(
        "Demande envoyée",
        "Votre demande de visite à domicile a été prise en compte.",
        [
          {
            text: "OK",
            onPress: () =>
              result?.id
                ? router.replace(`/rdv/${result.id}/confirmation`)
                : router.replace("/(tabs)"),
          },
        ]
      );
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Impossible d'envoyer la demande.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingDoctor) return <LoadingSpinner />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {doctor && (
        <View style={styles.doctorCard}>
          <Text style={styles.doctorName}>Dr. {doctor.name}</Text>
          {doctor.specialty ? (
            <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
          ) : null}
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Visite à domicile</Text>
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vos coordonnées</Text>

        <Input
          label="Nom complet *"
          value={name}
          onChangeText={setName}
          placeholder="Jean Dupont"
        />
        <Input
          label="Téléphone *"
          value={phone}
          onChangeText={setPhone}
          placeholder="+216 XX XXX XXX"
          keyboardType="phone-pad"
        />
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Adresse de visite *</Text>
          {geoLoading && (
            <ActivityIndicator size="small" color={colors.primary} />
          )}
        </View>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Votre adresse complète"
          placeholderTextColor={colors.slate500}
          value={address}
          onChangeText={setAddress}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
        {latitude && longitude ? (
          <Text style={styles.geoHint}>
            Position: {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Input
          label="Motif de la visite (optionnel)"
          value={reason}
          onChangeText={setReason}
          placeholder="Décrivez vos symptômes..."
          multiline
          numberOfLines={3}
          style={styles.multiline}
        />
      </View>

      <Button
        title="Demander une visite à domicile"
        onPress={handleBook}
        loading={submitting}
        disabled={!name || !phone || !address}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  doctorCard: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  doctorName: { fontSize: 18, fontWeight: "700", color: colors.ink },
  doctorSpecialty: { fontSize: 14, color: colors.slate500, marginTop: 2 },
  badge: {
    marginTop: spacing.sm,
    alignSelf: "flex-start",
    backgroundColor: colors.mist,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: { fontSize: 12, fontWeight: "600", color: colors.primary },
  section: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
  input: {
    backgroundColor: colors.bg,
    padding: 12,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.slate200,
    fontSize: 15,
    color: colors.ink,
    marginTop: spacing.sm,
  },
  multiline: { height: 80, textAlignVertical: "top" },
  geoHint: { fontSize: 11, color: colors.slate500, marginTop: 4 },
});
