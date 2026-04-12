import { useState } from "react";
import { View, Text, ScrollView, StyleSheet, TextInput, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { CheckCircle2, Siren, MessageSquare } from "lucide-react-native";
import { apiFetch } from "@/lib/api";
import { colors, spacing, radius, shadow } from "@/lib/theme";
import { Button } from "@/components/ui/Button";
import { StarRating } from "@/components/ui/StarRating";

export default function AvisSosScreen() {
  const { sessionId, sig } = useLocalSearchParams<{ sessionId: string; sig: string }>();
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
      await apiFetch("/api/sos/rate", {
        method: "POST",
        body: JSON.stringify({ sessionId, sig: sig ?? "", rating, comment }),
      });
      setSubmitted(true);
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Impossible de soumettre l'évaluation.");
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
        <Text style={styles.successTitle}>Merci pour votre évaluation !</Text>
        <Text style={styles.successSubtitle}>
          Votre retour nous aide à améliorer le service SOS Docteur.
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
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.sosIcon}>
          <Siren size={18} color={colors.white} />
        </View>
        <View>
          <Text style={styles.heading}>Évaluer SOS Docteur</Text>
          <Text style={styles.subtitle}>Comment s'est passée votre consultation d'urgence ?</Text>
        </View>
      </View>

      {/* Rating card */}
      <View style={[styles.card, shadow.sm]}>
        <Text style={styles.label}>Votre note</Text>
        <View style={styles.starWrap}>
          <StarRating rating={rating} size={36} interactive onChange={setRating} />
        </View>
        <Text style={styles.ratingHint}>
          {rating === 0 ? "Appuyez sur une étoile" : ["", "Décevant", "Moyen", "Bien", "Très bien", "Excellent"][rating]}
        </Text>
      </View>

      {/* Comment card */}
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
        title="Soumettre mon évaluation"
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
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  sosIcon: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: colors.red,
    alignItems: "center", justifyContent: "center",
  },
  heading: { fontSize: 22, fontWeight: "800", color: colors.ink, letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: colors.slate500, marginTop: 2 },
  card: {
    backgroundColor: colors.white, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border,
    padding: spacing.lg, marginBottom: spacing.md,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: spacing.sm },
  label: { fontSize: 14, fontWeight: "700", color: colors.ink },
  starWrap: { alignItems: "center", paddingVertical: spacing.md },
  ratingHint: { fontSize: 14, color: colors.slate500, textAlign: "center", fontWeight: "500" },
  textarea: {
    backgroundColor: colors.bg, borderWidth: 1.5, borderColor: colors.slate200,
    borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: colors.ink, minHeight: 120,
  },
  successContainer: {
    flex: 1, backgroundColor: colors.white,
    alignItems: "center", justifyContent: "center", padding: spacing.xl,
  },
  successIconWrap: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: colors.greenFaint,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.lg,
  },
  successTitle: { fontSize: 24, fontWeight: "800", color: colors.ink, textAlign: "center", letterSpacing: -0.3 },
  successSubtitle: {
    fontSize: 15, color: colors.slate500, textAlign: "center",
    marginTop: spacing.sm, marginBottom: spacing.xl, lineHeight: 22,
  },
});
