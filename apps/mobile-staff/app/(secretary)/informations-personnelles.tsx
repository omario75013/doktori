import { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors, spacing, radii, api } from "@doktori/mobile-core";

type ProfileData = {
  name: string;
  phone: string;
  email: string;
  bio: string;
  photoUrl: string | null;
};

export default function InformationsPersonnellesScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const data = await api<ProfileData>("/api/staff/me-profile", {
          noRedirect: true,
        });
        setName(data.name ?? "");
        setPhone(data.phone ?? "");
        setEmail(data.email ?? "");
        setBio(data.bio ?? "");
      } catch (e) {
        Alert.alert("Erreur", e instanceof Error ? e.message : "Impossible de charger le profil");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleSave() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert("Nom requis", "Le nom complet ne peut pas être vide.");
      return;
    }
    setSaving(true);
    try {
      await api("/api/staff/me-profile", {
        method: "PATCH",
        body: { name: trimmedName, phone: phone.trim(), bio: bio.trim() },
        noRedirect: true,
      });
      Alert.alert("Enregistré", "Vos informations ont été mises à jour.");
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "Impossible d'enregistrer");
    } finally {
      setSaving(false);
    }
  }

  const initials = name
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("") || "S";

  if (loading) {
    return (
      <SafeAreaView edges={["top"]} style={styles.root}>
        <ActivityIndicator color={colors.teal} style={{ marginTop: spacing["3xl"] }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.navigate("/(secretary)/settings" as never)} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={styles.title}>Informations personnelles</Text>
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.cameraOverlay}>
              <Ionicons name="camera" size={14} color="#FFF" />
            </View>
          </View>
        </View>

        {/* Fields card */}
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Profil</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Nom complet</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Votre nom complet"
              placeholderTextColor={colors.foregroundSecondary}
              autoCapitalize="words"
            />
          </View>

          <View style={[styles.fieldGroup, styles.fieldBorderTop]}>
            <Text style={styles.fieldLabel}>Téléphone</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+216 XX XXX XXX"
              placeholderTextColor={colors.foregroundSecondary}
              keyboardType="phone-pad"
            />
          </View>

          <View style={[styles.fieldGroup, styles.fieldBorderTop]}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={[styles.input, styles.inputReadOnly]}
              value={email}
              editable={false}
              placeholderTextColor={colors.foregroundSecondary}
            />
            <Text style={styles.readOnlyHint}>L'email ne peut pas être modifié.</Text>
          </View>

          <View style={[styles.fieldGroup, styles.fieldBorderTop]}>
            <Text style={styles.fieldLabel}>Bio</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={bio}
              onChangeText={setBio}
              placeholder="Quelques mots sur vous…"
              placeholderTextColor={colors.foregroundSecondary}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Save button */}
        <Pressable
          style={({ pressed }) => [styles.saveBtn, (saving || pressed) && { opacity: 0.75 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveBtnText}>Enregistrer</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: spacing["3xl"], gap: spacing.lg },

  header: {
    flexDirection: "row",
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    alignItems: "center",
    gap: spacing.md,
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.foreground },

  avatarSection: { alignItems: "center", paddingVertical: spacing.lg },
  avatarWrap: { position: "relative" },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: radii.full,
    backgroundColor: colors.tealDark,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#FFF", fontSize: 28, fontWeight: "800" },
  cameraOverlay: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: radii.full,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.bg,
  },

  card: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: "hidden",
    paddingTop: spacing.md,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  fieldGroup: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  fieldBorderTop: { borderTopWidth: 1, borderTopColor: colors.border },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    fontSize: 15,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    backgroundColor: colors.bg,
  },
  inputReadOnly: {
    color: colors.foregroundSecondary,
    backgroundColor: colors.bgSecondary,
  },
  inputMultiline: {
    height: 100,
    textAlignVertical: "top",
  },
  readOnlyHint: {
    fontSize: 11,
    color: colors.foregroundSecondary,
    marginTop: 4,
    fontStyle: "italic",
  },

  saveBtn: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  saveBtnText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
});
