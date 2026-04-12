import { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Pressable,
} from "react-native";
import { useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";
import { colors, spacing, radius } from "@/lib/theme";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENRES = ["Homme", "Femme"];

type Profile = {
  allergies?: string;
  chronicDiseases?: string;
  currentMedications?: string;
  notes?: string;
  bloodGroup?: string;
  birthDate?: string;
  gender?: string;
};

export default function DossierMedicalScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile>({});

  useEffect(() => {
    apiFetch<Profile>("/api/patients/me/profile")
      .catch(() => apiFetch<Profile>("/api/patients/me"))
      .then((data) => setProfile(data ?? {}))
      .catch(() => setProfile({}))
      .finally(() => setLoading(false));
  }, []);

  function update(key: keyof Profile, value: string) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await apiFetch("/api/patients/me/profile", {
        method: "PUT",
        body: JSON.stringify(profile),
      }).catch(() =>
        apiFetch("/api/patients/me/profile", {
          method: "POST",
          body: JSON.stringify(profile),
        })
      );
      Alert.alert("Succès", "Dossier médical mis à jour.", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch {
      Alert.alert("Erreur", "Impossible de sauvegarder le dossier.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingSpinner />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Mon dossier médical</Text>

      <View style={styles.section}>
        <Input
          label="Allergies"
          value={profile.allergies ?? ""}
          onChangeText={(v) => update("allergies", v)}
          placeholder="Ex: pénicilline, arachides..."
          multiline
          numberOfLines={3}
          style={styles.multiline}
        />

        <Input
          label="Maladies chroniques"
          value={profile.chronicDiseases ?? ""}
          onChangeText={(v) => update("chronicDiseases", v)}
          placeholder="Ex: diabète, hypertension..."
          multiline
          numberOfLines={3}
          style={styles.multiline}
        />

        <Input
          label="Médicaments en cours"
          value={profile.currentMedications ?? ""}
          onChangeText={(v) => update("currentMedications", v)}
          placeholder="Ex: metformine 500mg..."
          multiline
          numberOfLines={3}
          style={styles.multiline}
        />

        <Input
          label="Notes"
          value={profile.notes ?? ""}
          onChangeText={(v) => update("notes", v)}
          placeholder="Informations supplémentaires..."
          multiline
          numberOfLines={3}
          style={styles.multiline}
        />

        <Input
          label="Date de naissance (AAAA-MM-JJ)"
          value={profile.birthDate ?? ""}
          onChangeText={(v) => update("birthDate", v)}
          placeholder="1990-01-31"
          keyboardType="numeric"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.pickerLabel}>Groupe sanguin</Text>
        <View style={styles.chipRow}>
          {BLOOD_GROUPS.map((g) => (
            <Pressable
              key={g}
              onPress={() => update("bloodGroup", g)}
              style={[styles.chip, profile.bloodGroup === g && styles.chipActive]}
            >
              <Text style={[styles.chipText, profile.bloodGroup === g && styles.chipTextActive]}>
                {g}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.pickerLabel}>Genre</Text>
        <View style={styles.chipRow}>
          {GENRES.map((g) => (
            <Pressable
              key={g}
              onPress={() => update("gender", g)}
              style={[styles.chip, profile.gender === g && styles.chipActive]}
            >
              <Text style={[styles.chipText, profile.gender === g && styles.chipTextActive]}>
                {g}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Button
        title="Enregistrer"
        onPress={handleSave}
        loading={saving}
        style={styles.saveBtn}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  heading: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: spacing.md,
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  multiline: { height: 80, textAlignVertical: "top" },
  pickerLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: colors.mist,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, color: colors.slate500 },
  chipTextActive: { color: colors.white, fontWeight: "600" },
  saveBtn: { marginTop: spacing.sm },
});
