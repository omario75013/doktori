import { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  StyleSheet,
  ScrollView,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { colors, spacing, radii } from "@doktori/mobile-core";

const STORAGE_KEY = "doktori.secretary.notif_prefs";

type NotifPrefs = {
  reminder15: boolean;
  reminder60: boolean;
  newAppointment: boolean;
  appointmentCancelled: boolean;
  messageReceived: boolean;
  leaveApproved: boolean;
  appUpdates: boolean;
};

const DEFAULT_PREFS: NotifPrefs = {
  reminder15: true,
  reminder60: true,
  newAppointment: true,
  appointmentCancelled: true,
  messageReceived: true,
  leaveApproved: true,
  appUpdates: true,
};

async function loadPrefs(): Promise<NotifPrefs> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AsyncStorage = require("@react-native-async-storage/async-storage").default;
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_PREFS, ...(JSON.parse(raw) as Partial<NotifPrefs>) };
  } catch {
    // AsyncStorage unavailable or parse error — fall through to defaults
  }
  return { ...DEFAULT_PREFS };
}

async function savePrefs(prefs: NotifPrefs): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AsyncStorage = require("@react-native-async-storage/async-storage").default;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // non-fatal
  }
}

type ToggleRowProps = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  sublabel: string;
  value: boolean;
  onChange: (v: boolean) => void;
  last?: boolean;
};

function ToggleRow({ icon, label, sublabel, value, onChange, last }: ToggleRowProps) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.rowIconWrap}>
        <Ionicons name={icon} size={18} color={colors.teal} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSublabel}>{sublabel}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.teal }}
        thumbColor="#FFF"
      />
    </View>
  );
}

export default function NotificationsScreen() {
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPrefs().then(setPrefs);
  }, []);

  const set = useCallback((key: keyof NotifPrefs) => (value: boolean) => {
    setPrefs((prev) => ({ ...prev, [key]: value }));
  }, []);

  async function handleSave() {
    setSaving(true);
    await savePrefs(prefs);
    setSaving(false);
    Alert.alert("Enregistré", "Vos préférences de notifications ont été sauvegardées.");
  }

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.navigate("/(secretary)/settings" as never)} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
            <Ionicons name="arrow-back" size={22} color={colors.foreground} />
          </Pressable>
          <Text style={styles.title}>Notifications</Text>
        </View>

        {/* Section: Rappels */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Rappels</Text>
          <View style={styles.card}>
            <ToggleRow
              icon="alarm-outline"
              label="Rappel avant RDV (15 min)"
              sublabel="Notification 15 minutes avant le rendez-vous"
              value={prefs.reminder15}
              onChange={set("reminder15")}
            />
            <ToggleRow
              icon="time-outline"
              label="Rappel avant RDV (1h)"
              sublabel="Notification 1 heure avant le rendez-vous"
              value={prefs.reminder60}
              onChange={set("reminder60")}
              last
            />
          </View>
        </View>

        {/* Section: Activité */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Activité</Text>
          <View style={styles.card}>
            <ToggleRow
              icon="calendar-outline"
              label="Nouveau rendez-vous"
              sublabel="Quand un patient réserve un créneau"
              value={prefs.newAppointment}
              onChange={set("newAppointment")}
            />
            <ToggleRow
              icon="close-circle-outline"
              label="RDV annulé"
              sublabel="Quand un rendez-vous est annulé"
              value={prefs.appointmentCancelled}
              onChange={set("appointmentCancelled")}
            />
            <ToggleRow
              icon="chatbubble-outline"
              label="Message reçu"
              sublabel="Quand vous recevez un nouveau message"
              value={prefs.messageReceived}
              onChange={set("messageReceived")}
            />
            <ToggleRow
              icon="checkmark-circle-outline"
              label="Congé approuvé"
              sublabel="Quand votre demande de congé est traitée"
              value={prefs.leaveApproved}
              onChange={set("leaveApproved")}
              last
            />
          </View>
        </View>

        {/* Section: Système */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Système</Text>
          <View style={styles.card}>
            <ToggleRow
              icon="download-outline"
              label="Mises à jour de l'application"
              sublabel="Nouveautés et améliorations disponibles"
              value={prefs.appUpdates}
              onChange={set("appUpdates")}
              last
            />
          </View>
        </View>

        {/* Save button */}
        <Pressable
          style={({ pressed }) => [styles.saveBtn, (saving || pressed) && { opacity: 0.75 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveBtnText}>Enregistrer les préférences</Text>
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

  section: { gap: spacing.sm, paddingHorizontal: spacing.xl },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingHorizontal: 4,
  },

  card: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: "hidden",
  },

  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.bgSecondary,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowIconWrap: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  rowSublabel: { fontSize: 12, color: colors.foregroundSecondary, marginTop: 1 },

  saveBtn: {
    marginHorizontal: spacing.xl,
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  saveBtnText: { color: "#FFF", fontWeight: "700", fontSize: 15 },
});
