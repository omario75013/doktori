import { useState } from "react";
import { View, Text, ScrollView, StyleSheet, TextInput, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CheckCircle2, MessageSquare } from "lucide-react-native";
import { apiFetch } from "@/lib/api";
import { colors, spacing, radius, shadow } from "@/lib/theme";
import { Button } from "@/components/ui/Button";
import { StarRating } from "@/components/ui/StarRating";

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
      await apiFetch("/api/reviews", {
        method: "POST",
        body: JSON.stringify({ appointmentId, rating, comment }),
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
        <View style={[styles.successIconWrap, shadow.lg]}>
          <CheckCircle2 size={56} color={colors.green} />
        </View>
        <Text style={styles.successTitle}>Merci pour votre avis !</Text>
        <Text style={styles.successSubtitle}>
          Votre retour aide les autres patients à choisir leur médecin.
        </Text>
        <Button
          title="Retour à l'accueil"
          onPress={() => router.replace("/(tabs)")}
          size="lg"
          style={{ width: "100%" }}
        />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Donner un avis</Text>
      <Text style={styles.subtitle}>Comment s'est passée votre consultation ?</Text>

      <View style={[styles.card, shadow.sm]}>
        <Text style={styles.label}>Votre note</Text>
        <View style={styles.starWrap}>
          <StarRating rating={rating} size={36} interactive onChange={setRating} />
        </View>
        <Text style={styles.ratingHint}>
          {rating === 0 ? "Appuyez sur une étoile" : ["", "Décevant", "Moyen", "Bien", "Très bien", "Excellent"][rating]}
        </Text>
      </View>

      <View style={[styles.card, shadow.sm]}>
        <View style={styles.cardHeader}>
          <MessageSquare size={16} color={colors.slate500} />
          <Text style={styles.label}>Commentaire (optionnel)</Text>
        </View>
        <TextInput
          style={styles.textarea}
          placeholder="Partagez votre expérience..."
          placeholderTextColor={colors.slate400}
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
        size="lg"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  heading: { fontSize: 24, fontWeight: "800", color: colors.ink, letterSpacing: -0.3 },
  subtitle: { fontSize: 15, color: colors.slate500, marginTop: 4, marginBottom: spacing.lg },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.sm },
  label: { fontSize: 14, fontWeight: "700", color: colors.ink },
  starWrap: { alignItems: "center", paddingVertical: spacing.md },
  ratingHint: {
    fontSize: 14,
    color: colors.slate500,
    textAlign: "center",
    fontWeight: "500",
  },
  textarea: {
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.slate200,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.ink,
    minHeight: 120,
  },
  successContainer: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  successIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.greenFaint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.ink,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  successSubtitle: {
    fontSize: 15,
    color: colors.slate500,
    textAlign: "center",
    marginTop: spacing.sm,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
});
