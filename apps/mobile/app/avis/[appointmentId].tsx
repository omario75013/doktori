import { useState } from "react";
import { View, Text, ScrollView, StyleSheet, TextInput, Alert, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { apiFetch } from "@/lib/api";
import { colors, spacing, radius } from "@/lib/theme";
import { Button } from "@/components/ui/Button";

type ReviewPayload = {
  appointmentId: string;
  rating: number;
  comment: string;
};

export default function AvisScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (rating === 0) {
      Alert.alert("Veuillez sélectionner une note.");
      return;
    }
    setSubmitting(true);
    try {
      const payload: ReviewPayload = { appointmentId, rating, comment };
      await apiFetch("/api/reviews", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setSubmitted(true);
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Impossible de soumettre l'avis.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <View style={styles.successContainer}>
        <Text style={styles.successIcon}>✓</Text>
        <Text style={styles.successTitle}>Merci pour votre avis !</Text>
        <Text style={styles.successSubtitle}>
          Votre retour nous aide à améliorer nos services.
        </Text>
        <Button
          title="Retour à l'accueil"
          onPress={() => router.replace("/(tabs)")}
          style={styles.successBtn}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Donner un avis</Text>
      <Text style={styles.subtitle}>
        Comment s'est passée votre consultation ?
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Votre note</Text>
        <StarRating value={rating} onChange={setRating} />
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Commentaire (optionnel)</Text>
        <TextInput
          style={styles.textarea}
          placeholder="Partagez votre expérience..."
          placeholderTextColor={colors.slate500}
          value={comment}
          onChangeText={setComment}
          multiline
          numberOfLines={5}
          textAlignVertical="top"
        />
      </View>

      <Button
        title="Soumettre mon avis"
        onPress={handleSubmit}
        loading={submitting}
        disabled={rating === 0}
      />
    </ScrollView>
  );
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={starStyles.row}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable key={star} onPress={() => onChange(star)} hitSlop={8}>
          <Text style={[starStyles.star, star <= value && starStyles.starActive]}>
            ★
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const starStyles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, marginTop: spacing.sm },
  star: { fontSize: 36, color: colors.slate200 },
  starActive: { color: "#F59E0B" },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xl * 2 },
  heading: { fontSize: 22, fontWeight: "700", color: colors.ink, marginBottom: 4 },
  subtitle: { fontSize: 14, color: colors.slate500, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  label: { fontSize: 13, fontWeight: "600", color: colors.ink },
  textarea: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.slate200,
    borderRadius: radius.sm,
    padding: 12,
    fontSize: 15,
    color: colors.ink,
    marginTop: spacing.sm,
    minHeight: 120,
  },
  successContainer: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  successIcon: {
    fontSize: 64,
    color: colors.green,
    marginBottom: spacing.md,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: spacing.sm,
    textAlign: "center",
  },
  successSubtitle: {
    fontSize: 15,
    color: colors.slate500,
    textAlign: "center",
    marginBottom: spacing.xl,
  },
  successBtn: { width: "100%" },
});
