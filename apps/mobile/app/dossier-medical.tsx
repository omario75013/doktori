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
import { Heart, Pill, AlertTriangle, FileText, Calendar, Droplets, Users, Save } from "lucide-react-native";
import { apiFetch } from "@/lib/api";
import { colors, spacing, radius, shadow } from "@/lib/theme";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENRES = [
  { id: "Homme", label: "Homme", icon: "♂" },
  { id: "Femme", label: "Femme", icon: "♀" },
];

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

  if (loading) return <LoadingSpinner message="Chargement du dossier..." />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Heart size={24} color={colors.primary} />
        <Text style={styles.heading}>Mon dossier médical</Text>
      </View>
      <Text style={styles.subheading}>
        Ces informations aident votre médecin à mieux vous soigner
      </Text>

      {/* Medical info */}
      <View style={[styles.section, shadow.sm]}>
        <SectionTitle icon={<AlertTriangle size={16} color={colors.red} />} title="Allergies" />
        <Input
          value={profile.allergies ?? ""}
          onChangeText={(v) => update("allergies", v)}
          placeholder="Ex: pénicilline, arachides..."
          multiline
          numberOfLines={3}
          style={styles.multiline}
        />

        <SectionTitle icon={<Heart size={16} color={colors.primary} />} title="Maladies chroniques" />
        <Input
          value={profile.chronicDiseases ?? ""}
          onChangeText={(v) => update("chronicDiseases", v)}
          placeholder="Ex: diabète, hypertension..."
          multiline
          numberOfLines={3}
          style={styles.multiline}
        />

        <SectionTitle icon={<Pill size={16} color={colors.green} />} title="Médicaments en cours" />
        <Input
          value={profile.currentMedications ?? ""}
          onChangeText={(v) => update("currentMedications", v)}
          placeholder="Ex: metformine 500mg..."
          multiline
          numberOfLines={3}
          style={styles.multiline}
        />

        <SectionTitle icon={<FileText size={16} color={colors.slate500} />} title="Notes" />
        <Input
          value={profile.notes ?? ""}
          onChangeText={(v) => update("notes", v)}
          placeholder="Informations supplémentaires..."
          multiline
          numberOfLines={3}
          style={styles.multiline}
        />
      </View>

      {/* Personal info */}
      <View style={[styles.section, shadow.sm]}>
        <SectionTitle icon={<Calendar size={16} color={colors.primary} />} title="Date de naissance" />
        <Input
          value={profile.birthDate ?? ""}
          onChangeText={(v) => update("birthDate", v)}
          placeholder="1990-01-31"
          keyboardType="numeric"
          hint="Format: AAAA-MM-JJ"
        />

        <SectionTitle icon={<Droplets size={16} color={colors.red} />} title="Groupe sanguin" />
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

        <SectionTitle icon={<Users size={16} color={colors.primary} />} title="Genre" />
        <View style={styles.genderRow}>
          {GENRES.map((g) => (
            <Pressable
              key={g.id}
              onPress={() => update("gender", g.id)}
              style={[styles.genderChip, profile.gender === g.id && styles.genderChipActive]}
            >
              <Text style={styles.genderIcon}>{g.icon}</Text>
              <Text style={[styles.genderText, profile.gender === g.id && styles.genderTextActive]}>
                {g.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Button
        title="Enregistrer"
        onPress={handleSave}
        loading={saving}
        size="lg"
        icon={<Save size={18} color={colors.white} />}
        style={{ marginTop: spacing.sm }}
      />
    </ScrollView>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <View style={styles.sectionTitle}>
      {icon}
      <Text style={styles.sectionTitleText}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  heading: { fontSize: 24, fontWeight: "800", color: colors.ink, letterSpacing: -0.3 },
  subheading: { fontSize: 14, color: colors.slate500, marginTop: 4, marginBottom: spacing.lg, lineHeight: 20 },
  section: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: spacing.md,
    marginBottom: -spacing.xs,
  },
  sectionTitleText: { fontSize: 14, fontWeight: "700", color: colors.ink },
  multiline: { height: 80, textAlignVertical: "top" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: spacing.sm },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.slate200,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, fontWeight: "600", color: colors.slate500 },
  chipTextActive: { color: colors.white },
  genderRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  genderChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.slate200,
  },
  genderChipActive: { backgroundColor: colors.primaryFaint, borderColor: colors.primary },
  genderIcon: { fontSize: 20 },
  genderText: { fontSize: 15, fontWeight: "600", color: colors.slate500 },
  genderTextActive: { color: colors.primary },
});
