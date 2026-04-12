import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TextInput, Alert, ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Home, MapPin, User, Phone as PhoneIcon, FileText, Navigation, CheckCircle2 } from "lucide-react-native";
import * as Location from "expo-location";
import { api, apiFetch } from "@/lib/api";
import { colors, spacing, radius, shadow } from "@/lib/theme";
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
        latitude: loc.coords.latitude, longitude: loc.coords.longitude,
      });
      if (geo) {
        const parts = [geo.streetNumber, geo.street, geo.city, geo.region].filter(Boolean);
        setAddress(parts.join(", "));
      }
    } catch {} finally { setGeoLoading(false); }
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
          doctorId: doctor.id, patientName: name, patientPhone: phone,
          date: today, type: "home_visit", address, latitude, longitude,
          reason: reason || undefined,
        }),
      });
      Alert.alert("Demande envoyée", "Votre demande de visite à domicile a été prise en compte.", [
        { text: "OK", onPress: () => result?.id ? router.replace(`/rdv/${result.id}/confirmation`) : router.replace("/(tabs)") },
      ]);
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Impossible d'envoyer la demande.");
    } finally { setSubmitting(false); }
  }

  if (loadingDoctor) return <LoadingSpinner message="Chargement..." />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Doctor card */}
      {doctor && (
        <View style={[styles.doctorCard, shadow.md]}>
          <View style={styles.doctorAvatar}>
            <Text style={styles.doctorInitial}>{doctor.name?.charAt(0) || "?"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.doctorName}>Dr. {doctor.name}</Text>
            {doctor.specialty && <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>}
          </View>
          <View style={styles.homeBadge}>
            <Home size={14} color={colors.primary} />
            <Text style={styles.homeBadgeText}>Domicile</Text>
          </View>
        </View>
      )}

      {/* Contact info */}
      <View style={[styles.section, shadow.sm]}>
        <SectionHeader icon={<User size={16} color={colors.primary} />} title="Vos coordonnées" />
        <Input label="Nom complet *" value={name} onChangeText={setName} placeholder="Prénom Nom" />
        <Input label="Téléphone *" value={phone} onChangeText={setPhone} placeholder="+216 XX XXX XXX" keyboardType="phone-pad" />
      </View>

      {/* Address */}
      <View style={[styles.section, shadow.sm]}>
        <View style={styles.sectionHeaderRow}>
          <SectionHeader icon={<MapPin size={16} color={colors.red} />} title="Adresse de visite *" />
          {geoLoading && <ActivityIndicator size="small" color={colors.primary} />}
        </View>
        <TextInput
          style={styles.addressInput}
          placeholder="Votre adresse complète"
          placeholderTextColor={colors.slate400}
          value={address}
          onChangeText={setAddress}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />
        {latitude && longitude && (
          <View style={styles.geoTag}>
            <Navigation size={12} color={colors.green} />
            <Text style={styles.geoText}>Position GPS détectée</Text>
            <CheckCircle2 size={12} color={colors.green} />
          </View>
        )}
      </View>

      {/* Reason */}
      <View style={[styles.section, shadow.sm]}>
        <SectionHeader icon={<FileText size={16} color={colors.slate500} />} title="Motif (optionnel)" />
        <Input
          value={reason}
          onChangeText={setReason}
          placeholder="Décrivez vos symptômes..."
          multiline
          numberOfLines={3}
          style={{ height: 80, textAlignVertical: "top" }}
        />
      </View>

      <Button
        title="Demander une visite à domicile"
        onPress={handleBook}
        loading={submitting}
        disabled={!name || !phone || !address}
        size="lg"
        icon={<Home size={18} color={colors.white} />}
      />
    </ScrollView>
  );
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      {icon}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  doctorCard: {
    backgroundColor: colors.white, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.md,
    flexDirection: "row", alignItems: "center", gap: spacing.md,
  },
  doctorAvatar: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.mist,
    alignItems: "center", justifyContent: "center",
  },
  doctorInitial: { fontSize: 20, fontWeight: "700", color: colors.primary },
  doctorName: { fontSize: 17, fontWeight: "700", color: colors.ink },
  doctorSpecialty: { fontSize: 13, color: colors.slate500, marginTop: 2 },
  homeBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: colors.primaryFaint,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full,
  },
  homeBadgeText: { fontSize: 12, fontWeight: "600", color: colors.primary },
  section: {
    backgroundColor: colors.white, borderRadius: radius.xl,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, marginBottom: spacing.md,
  },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: -spacing.xs },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
  addressInput: {
    backgroundColor: colors.bg, paddingHorizontal: 14, paddingVertical: 13,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.slate200,
    fontSize: 15, color: colors.ink, marginTop: spacing.md, height: 80, textAlignVertical: "top",
  },
  geoTag: {
    flexDirection: "row", alignItems: "center", gap: 6,
    marginTop: spacing.sm, backgroundColor: colors.greenFaint,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.full,
    alignSelf: "flex-start",
  },
  geoText: { fontSize: 12, fontWeight: "600", color: colors.greenDark },
});
