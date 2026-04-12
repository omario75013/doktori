import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Linking,
} from "react-native";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { api } from "@/lib/api";
import { colors } from "@/lib/theme";

type Step = "intro" | "form" | "locating" | "waiting" | "accepted" | "expired";

const SYMPTOMS = [
  { id: "fievre", label: "Fièvre" },
  { id: "douleur", label: "Douleur aiguë" },
  { id: "enfant", label: "Enfant malade" },
  { id: "autre", label: "Autre" },
];

export default function SOSScreen() {
  const [step, setStep] = useState<Step>("intro");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [symptom, setSymptom] = useState("fievre");
  const [description, setDescription] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [error, setError] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll session when waiting
  useEffect(() => {
    if (step !== "waiting" || !sessionId) return;
    async function poll() {
      try {
        const data = await api.sosSession(sessionId!);
        setSession(data);
        if (data.status === "accepted") {
          setStep("accepted");
          if (pollRef.current) clearInterval(pollRef.current);
        } else if (new Date(data.expires_at) < new Date()) {
          setStep("expired");
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch (e) {
        console.error("Poll failed:", e);
      }
    }
    poll();
    pollRef.current = setInterval(poll, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [step, sessionId]);

  async function submitRequest() {
    if (!name.trim() || !phone.trim()) {
      setError("Nom et téléphone requis");
      return;
    }
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setStep("locating");

    // Request location permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setError("Permission de géolocalisation refusée");
      setStep("form");
      return;
    }

    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const result = await api.sosRequest({
        patientName: name,
        patientPhone: phone,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        symptomCategory: symptom,
        description: description || undefined,
      });
      setSessionId(result.sessionId);
      setStep("waiting");
    } catch (e: any) {
      setError(e.message || "Erreur lors de l'envoi");
      setStep("form");
    }
  }

  function callDoctor() {
    if (session?.doctor_phone) {
      Linking.openURL(`tel:${session.doctor_phone}`);
    }
  }

  function reset() {
    setStep("intro");
    setSessionId(null);
    setSession(null);
    setName("");
    setPhone("");
    setDescription("");
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Disclaimer always visible */}
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          ⚠️ Pour une urgence vitale, composez le{" "}
          <Text style={styles.bold}>190 (SAMU)</Text>.{"\n"}
          Doktori SOS est destiné aux consultations urgentes{" "}
          <Text style={styles.bold}>non-vitales</Text>.
        </Text>
      </View>

      {step === "intro" && (
        <View style={styles.card}>
          <Text style={styles.emoji}>🚨</Text>
          <Text style={styles.title}>SOS Docteur</Text>
          <Text style={styles.subtitle}>
            Trouvez un médecin disponible près de vous en 2 minutes. Nous
            cherchons automatiquement les médecins en mode urgence dans votre
            quartier.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={() => setStep("form")}>
            <Text style={styles.primaryBtnText}>
              Demander un médecin maintenant
            </Text>
          </Pressable>
        </View>
      )}

      {step === "form" && (
        <View style={styles.card}>
          <Text style={styles.formTitle}>Informations</Text>
          <Text style={styles.label}>Votre nom</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Prénom Nom"
            placeholderTextColor={colors.slate500}
          />
          <Text style={styles.label}>Téléphone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+216 XX XXX XXX"
            keyboardType="phone-pad"
            placeholderTextColor={colors.slate500}
          />
          <Text style={styles.label}>Type de symptôme</Text>
          <View style={styles.symptomGrid}>
            {SYMPTOMS.map((s) => (
              <Pressable
                key={s.id}
                style={[
                  styles.symptomChip,
                  symptom === s.id && styles.symptomChipActive,
                ]}
                onPress={() => setSymptom(s.id)}
              >
                <Text
                  style={[
                    styles.symptomText,
                    symptom === s.id && styles.symptomTextActive,
                  ]}
                >
                  {s.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Description (optionnel)</Text>
          <TextInput
            style={[styles.input, { height: 80 }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Décrivez vos symptômes..."
            placeholderTextColor={colors.slate500}
            multiline
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable style={styles.primaryBtn} onPress={submitRequest}>
            <Text style={styles.primaryBtnText}>Envoyer la demande</Text>
          </Pressable>
          <Pressable onPress={() => setStep("intro")} style={{ marginTop: 10 }}>
            <Text style={styles.cancelText}>Annuler</Text>
          </Pressable>
        </View>
      )}

      {step === "locating" && (
        <View style={styles.centerCard}>
          <ActivityIndicator size="large" color={colors.red} />
          <Text style={styles.statusText}>Obtention de votre position...</Text>
        </View>
      )}

      {step === "waiting" && (
        <View style={styles.centerCard}>
          <Text style={styles.bigEmoji}>⏳</Text>
          <Text style={styles.statusTitle}>Recherche d'un médecin...</Text>
          <Text style={styles.statusText}>
            Nous contactons les médecins disponibles dans votre zone.
          </Text>
          <Pressable onPress={reset} style={{ marginTop: 20 }}>
            <Text style={styles.cancelText}>Annuler la demande</Text>
          </Pressable>
        </View>
      )}

      {step === "accepted" && session && (
        <View style={styles.successCard}>
          <Text style={styles.bigEmoji}>✓</Text>
          <Text style={styles.successTitle}>Médecin trouvé !</Text>
          <View style={styles.doctorInfo}>
            <Text style={styles.doctorName}>{session.doctor_name}</Text>
            <Text style={styles.doctorDetail}>📞 {session.doctor_phone}</Text>
            <Text style={styles.doctorDetail}>📍 {session.doctor_address}</Text>
          </View>
          <Pressable style={styles.callBtn} onPress={callDoctor}>
            <Text style={styles.callBtnText}>📞 Appeler maintenant</Text>
          </Pressable>
          <Pressable onPress={reset} style={{ marginTop: 12 }}>
            <Text style={styles.cancelText}>Nouvelle demande</Text>
          </Pressable>
        </View>
      )}

      {step === "expired" && (
        <View style={styles.centerCard}>
          <Text style={styles.bigEmoji}>😞</Text>
          <Text style={styles.statusTitle}>Aucun médecin disponible</Text>
          <Text style={styles.statusText}>
            Aucun médecin n'est disponible dans votre zone pour le moment.
            Réessayez dans quelques minutes.
          </Text>
          <Pressable style={styles.primaryBtn} onPress={reset}>
            <Text style={styles.primaryBtnText}>Réessayer</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fef2f2" },
  content: { padding: 16, paddingBottom: 40 },
  disclaimer: {
    backgroundColor: "#fef3c7",
    borderWidth: 1,
    borderColor: "#fde68a",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  disclaimerText: { fontSize: 12, color: "#92400e", lineHeight: 18 },
  bold: { fontWeight: "700" },
  card: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
  },
  centerCard: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
  },
  successCard: {
    backgroundColor: "#f0fdf4",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.green,
  },
  emoji: { fontSize: 56, marginBottom: 12 },
  bigEmoji: { fontSize: 48, marginBottom: 16 },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: colors.slate500,
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 16,
    alignSelf: "flex-start",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.ink,
    alignSelf: "flex-start",
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    width: "100%",
    backgroundColor: colors.mist,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: colors.ink,
  },
  symptomGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    width: "100%",
  },
  symptomChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: colors.mist,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  symptomChipActive: { backgroundColor: colors.red, borderColor: colors.red },
  symptomText: { fontSize: 13, color: colors.ink },
  symptomTextActive: { color: colors.white, fontWeight: "600" },
  error: {
    color: colors.red,
    fontSize: 13,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  primaryBtn: {
    backgroundColor: colors.red,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 20,
    width: "100%",
    alignItems: "center",
  },
  primaryBtnText: { color: colors.white, fontSize: 16, fontWeight: "700" },
  cancelText: {
    color: colors.slate500,
    fontSize: 13,
    textDecorationLine: "underline",
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: colors.ink,
    marginTop: 12,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 14,
    color: colors.slate500,
    textAlign: "center",
    lineHeight: 20,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.greenDark,
    marginBottom: 16,
  },
  doctorInfo: {
    backgroundColor: colors.white,
    borderRadius: 10,
    padding: 16,
    width: "100%",
    marginBottom: 16,
  },
  doctorName: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.ink,
    marginBottom: 6,
  },
  doctorDetail: { fontSize: 14, color: colors.slate500, marginTop: 2 },
  callBtn: {
    backgroundColor: colors.green,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  callBtnText: { color: colors.white, fontSize: 16, fontWeight: "700" },
});
