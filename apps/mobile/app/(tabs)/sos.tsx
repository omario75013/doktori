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
  Animated,
  Easing,
} from "react-native";
import * as Location from "expo-location";
import * as Haptics from "expo-haptics";
import { Siren, Phone, MapPin, AlertTriangle, Clock, CheckCircle2, UserRound, XCircle, Heart, Thermometer, Baby, HelpCircle } from "lucide-react-native";
import { api } from "@/lib/api";
import { colors, spacing, radius, shadow } from "@/lib/theme";
import { Button } from "@/components/ui/Button";

type Step = "intro" | "form" | "locating" | "waiting" | "accepted" | "expired";

const SYMPTOMS = [
  { id: "fievre", label: "Fièvre", icon: Thermometer },
  { id: "douleur", label: "Douleur aiguë", icon: Heart },
  { id: "enfant", label: "Enfant malade", icon: Baby },
  { id: "autre", label: "Autre", icon: HelpCircle },
];

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function PulseCircle({ color, size }: { color: string; size: number }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const anim = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.8, duration: 1500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0, duration: 1500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.4, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);
  return (
    <Animated.View style={{
      position: "absolute",
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: color,
      transform: [{ scale }],
      opacity,
    }} />
  );
}

export default function SOSScreen() {
  const [step, setStep] = useState<Step>("intro");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [symptom, setSymptom] = useState("fievre");
  const [description, setDescription] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [error, setError] = useState("");
  const [expiresAt, setExpiresAt] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (step !== "waiting" || !sessionId) return;
    async function poll() {
      try {
        const data = await api.sosSession(sessionId!);
        setSession(data);
        if (data.status === "accepted") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
    pollRef.current = setInterval(poll, 10000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [step, sessionId]);

  // Countdown tick — updates every second while waiting
  useEffect(() => {
    if (step !== "waiting" || !expiresAt) return;
    function tick() {
      const remaining = Math.max(0, Math.floor((expiresAt!.getTime() - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining === 0) {
        setStep("expired");
        if (countdownRef.current) clearInterval(countdownRef.current);
      }
    }
    tick();
    countdownRef.current = setInterval(tick, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [step, expiresAt]);

  async function submitRequest() {
    if (!name.trim() || !phone.trim()) {
      setError("Nom et téléphone requis");
      return;
    }
    setError("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setStep("locating");

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setError("Permission de géolocalisation refusée");
      setStep("form");
      return;
    }

    try {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const result = await api.sosRequest({
        patientName: name,
        patientPhone: phone,
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
        symptomCategory: symptom,
        description: description || undefined,
      });
      setSessionId(result.sessionId);
      const exp = new Date(Date.now() + 30 * 60 * 1000);
      setExpiresAt(exp);
      setCountdown(1800);
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
    setExpiresAt(null);
    setCountdown(0);
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Emergency disclaimer */}
      <View style={[styles.disclaimer, shadow.sm]}>
        <AlertTriangle size={16} color="#92400E" />
        <Text style={styles.disclaimerText}>
          Pour une urgence vitale, composez le{" "}
          <Text style={styles.bold}>190 (SAMU)</Text>.{"\n"}
          Doktori SOS : consultations urgentes <Text style={styles.bold}>non-vitales</Text>.
        </Text>
      </View>

      {/* INTRO */}
      {step === "intro" && (
        <View style={[styles.card, shadow.md]}>
          <View style={styles.introIconWrap}>
            <PulseCircle color={colors.red} size={100} />
            <View style={styles.sosIcon}>
              <Siren size={32} color={colors.white} strokeWidth={2} />
            </View>
          </View>
          <Text style={styles.title}>SOS Docteur</Text>
          <Text style={styles.subtitle}>
            Trouvez un médecin disponible près de vous en 2 minutes
          </Text>

          <View style={styles.featureRow}>
            <View style={styles.featureItem}>
              <Clock size={18} color={colors.primary} />
              <Text style={styles.featureText}>2 min</Text>
            </View>
            <View style={styles.featureDot} />
            <View style={styles.featureItem}>
              <MapPin size={18} color={colors.primary} />
              <Text style={styles.featureText}>Proche</Text>
            </View>
            <View style={styles.featureDot} />
            <View style={styles.featureItem}>
              <Phone size={18} color={colors.primary} />
              <Text style={styles.featureText}>Direct</Text>
            </View>
          </View>

          <Button
            title="Demander un médecin"
            onPress={() => setStep("form")}
            variant="danger"
            size="lg"
            icon={<Siren size={20} color={colors.white} />}
            style={{ width: "100%", marginTop: spacing.lg }}
          />
        </View>
      )}

      {/* FORM */}
      {step === "form" && (
        <View style={[styles.card, shadow.md]}>
          <Text style={styles.formTitle}>Vos informations</Text>

          <Text style={styles.label}>Votre nom</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Prénom Nom"
            placeholderTextColor={colors.slate400}
          />

          <Text style={styles.label}>Téléphone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+216 XX XXX XXX"
            keyboardType="phone-pad"
            placeholderTextColor={colors.slate400}
          />

          <Text style={styles.label}>Type de symptôme</Text>
          <View style={styles.symptomGrid}>
            {SYMPTOMS.map((s) => {
              const Icon = s.icon;
              const active = symptom === s.id;
              return (
                <Pressable
                  key={s.id}
                  style={[styles.symptomChip, active && styles.symptomChipActive, active && shadow.sm]}
                  onPress={() => setSymptom(s.id)}
                >
                  <Icon size={18} color={active ? colors.white : colors.red} />
                  <Text style={[styles.symptomText, active && styles.symptomTextActive]}>
                    {s.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.label}>Description (optionnel)</Text>
          <TextInput
            style={[styles.input, { height: 80, textAlignVertical: "top" }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Décrivez vos symptômes..."
            placeholderTextColor={colors.slate400}
            multiline
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Button
            title="Envoyer la demande"
            onPress={submitRequest}
            variant="danger"
            size="lg"
            style={{ width: "100%", marginTop: spacing.lg }}
          />
          <Pressable onPress={() => setStep("intro")} style={styles.cancelLink}>
            <Text style={styles.cancelText}>Annuler</Text>
          </Pressable>
        </View>
      )}

      {/* LOCATING */}
      {step === "locating" && (
        <View style={[styles.centerCard, shadow.md]}>
          <ActivityIndicator size="large" color={colors.red} />
          <Text style={styles.statusTitle}>Localisation en cours...</Text>
          <Text style={styles.statusText}>Obtention de votre position GPS</Text>
        </View>
      )}

      {/* WAITING */}
      {step === "waiting" && (
        <View style={[styles.centerCard, shadow.md]}>
          <View style={styles.waitingIconWrap}>
            <PulseCircle color={colors.primary} size={80} />
            <Clock size={32} color={colors.primary} />
          </View>
          <Text style={styles.statusTitle}>Recherche d'un médecin...</Text>
          <Text style={styles.statusText}>
            Nous contactons les médecins disponibles dans votre zone.
          </Text>
          {countdown > 0 && (
            <View style={styles.countdownWrap}>
              <Text style={styles.countdownLabel}>Temps restant</Text>
              <Text style={styles.countdownValue}>{formatCountdown(countdown)}</Text>
            </View>
          )}
          <Pressable onPress={reset} style={styles.cancelLink}>
            <Text style={styles.cancelText}>Annuler la demande</Text>
          </Pressable>
        </View>
      )}

      {/* ACCEPTED */}
      {step === "accepted" && session && (
        <View style={[styles.successCard, shadow.lg]}>
          <View style={styles.successIconWrap}>
            <CheckCircle2 size={56} color={colors.green} />
          </View>
          <Text style={styles.successTitle}>Médecin trouvé !</Text>

          <View style={[styles.doctorCard, shadow.sm]}>
            <View style={styles.doctorAvatar}>
              <UserRound size={24} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.doctorName}>{session.doctor_name}</Text>
              {session.doctor_address && (
                <View style={styles.doctorMeta}>
                  <MapPin size={13} color={colors.slate400} />
                  <Text style={styles.doctorDetail}>{session.doctor_address}</Text>
                </View>
              )}
              {session.doctor_phone && (
                <View style={styles.doctorMeta}>
                  <Phone size={13} color={colors.slate400} />
                  <Text style={styles.doctorDetail}>{session.doctor_phone}</Text>
                </View>
              )}
            </View>
          </View>

          <Button
            title="Appeler maintenant"
            onPress={callDoctor}
            size="lg"
            icon={<Phone size={20} color={colors.white} />}
            style={{ width: "100%", marginTop: spacing.lg, backgroundColor: colors.green }}
          />
          <Pressable onPress={reset} style={styles.cancelLink}>
            <Text style={styles.cancelText}>Nouvelle demande</Text>
          </Pressable>
        </View>
      )}

      {/* EXPIRED */}
      {step === "expired" && (
        <View style={[styles.centerCard, shadow.md]}>
          <XCircle size={56} color={colors.slate400} />
          <Text style={styles.statusTitle}>Aucun médecin disponible</Text>
          <Text style={styles.statusText}>
            Aucun médecin n'est disponible dans votre zone pour le moment. Réessayez dans quelques minutes.
          </Text>
          <Button
            title="Réessayer"
            onPress={reset}
            variant="danger"
            size="lg"
            style={{ width: "100%", marginTop: spacing.lg }}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.redFaint },
  content: { padding: spacing.md, paddingBottom: 40 },
  disclaimer: {
    flexDirection: "row",
    gap: 10,
    backgroundColor: "#FEF3C7",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  disclaimerText: { flex: 1, fontSize: 13, color: "#92400E", lineHeight: 19 },
  bold: { fontWeight: "700" },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: "center",
  },
  centerCard: {
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: "center",
  },
  successCard: {
    backgroundColor: colors.greenFaint,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: "center",
    borderWidth: 2,
    borderColor: colors.green,
  },
  introIconWrap: {
    width: 100,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  sosIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 26, fontWeight: "800", color: colors.ink, marginBottom: 8, letterSpacing: -0.3 },
  subtitle: { fontSize: 15, color: colors.slate500, textAlign: "center", lineHeight: 22, maxWidth: 280 },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    width: "100%",
  },
  featureItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  featureText: { fontSize: 13, fontWeight: "600", color: colors.ink },
  featureDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.slate200 },
  formTitle: { fontSize: 20, fontWeight: "800", color: colors.ink, marginBottom: spacing.md, alignSelf: "flex-start", letterSpacing: -0.3 },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.slate700,
    alignSelf: "flex-start",
    marginBottom: 6,
    marginTop: spacing.md,
  },
  input: {
    width: "100%",
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.slate200,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.ink,
  },
  symptomGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    width: "100%",
  },
  symptomChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: colors.redFaint,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  symptomChipActive: {
    backgroundColor: colors.red,
    borderColor: colors.red,
  },
  symptomText: { fontSize: 13, fontWeight: "500", color: colors.ink },
  symptomTextActive: { color: colors.white, fontWeight: "700" },
  error: { color: colors.red, fontSize: 13, fontWeight: "500", marginTop: spacing.sm, alignSelf: "flex-start" },
  cancelLink: { marginTop: spacing.md, paddingVertical: spacing.sm },
  cancelText: { color: colors.slate500, fontSize: 14, fontWeight: "500" },
  waitingIconWrap: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  statusTitle: { fontSize: 20, fontWeight: "700", color: colors.ink, marginTop: spacing.sm, marginBottom: 8 },
  statusText: { fontSize: 14, color: colors.slate500, textAlign: "center", lineHeight: 21 },
  countdownWrap: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.mist,
    borderRadius: radius.md,
    alignItems: "center",
  },
  countdownLabel: { fontSize: 11, color: colors.slate500, fontWeight: "500", textTransform: "uppercase", letterSpacing: 0.5 },
  countdownValue: { fontSize: 28, fontWeight: "800", color: colors.primary, fontVariant: ["tabular-nums"], letterSpacing: 1 },
  successIconWrap: { marginBottom: spacing.md },
  successTitle: { fontSize: 24, fontWeight: "800", color: colors.greenDark, marginBottom: spacing.md, letterSpacing: -0.3 },
  doctorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: spacing.md,
    width: "100%",
  },
  doctorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.mist,
    alignItems: "center",
    justifyContent: "center",
  },
  doctorName: { fontSize: 16, fontWeight: "700", color: colors.ink },
  doctorMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 3 },
  doctorDetail: { fontSize: 13, color: colors.slate500 },
});
