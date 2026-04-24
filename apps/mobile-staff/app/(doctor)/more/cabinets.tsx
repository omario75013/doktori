import { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api } from "@doktori/mobile-core";
import { Screen, Loader, Empty } from "./_ui";

type Practice = {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string | null;
  isPrimary: boolean;
  isActive: boolean;
  kind: "cabinet" | "clinic";
};

export default function Cabinets() {
  const [rows, setRows] = useState<Practice[] | null>(null);
  const [editing, setEditing] = useState<Partial<Practice> | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<Practice[]>("/api/doctor/practices");
      setRows(r);
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function deletePractice(id: string, name: string) {
    Alert.alert("Supprimer", `Supprimer "${name}" ?`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer",
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/api/doctor/practices/${id}`, { method: "DELETE" });
            await load();
          } catch (e) {
            Alert.alert("Erreur", e instanceof Error ? e.message : "");
          }
        },
      },
    ]);
  }

  async function setPrimary(id: string) {
    try {
      await api(`/api/doctor/practices/${id}`, {
        method: "PATCH",
        body: { isPrimary: true },
      });
      await load();
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "");
    }
  }

  if (!rows) {
    return (
      <>
        <Stack.Screen options={{ title: "Cabinets" }} />
        <Loader />
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Cabinets",
          headerRight: () => (
            <Pressable
              onPress={() => setEditing({ name: "", address: "", city: "", phone: "" })}
              hitSlop={10}
              style={{ padding: spacing.xs, marginRight: spacing.sm }}
            >
              <Ionicons name="add" size={26} color={colors.teal} />
            </Pressable>
          ),
        }}
      />
      <Screen>
        {rows.length === 0 ? (
          <Empty icon="business-outline" title="Aucun cabinet" />
        ) : (
          rows.map((p) => (
            <View
              key={p.id}
              style={[
                styles.row,
                p.isPrimary && { borderColor: colors.teal, borderWidth: 1.5 },
              ]}
            >
              <View style={styles.icon}>
                <Ionicons
                  name={p.kind === "clinic" ? "medkit" : "business"}
                  size={18}
                  color={colors.teal}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.titleRow}>
                  <Text style={styles.title}>{p.name}</Text>
                  {p.isPrimary && (
                    <View style={styles.primaryBadge}>
                      <Text style={styles.primaryBadgeText}>Principal</Text>
                    </View>
                  )}
                  {p.kind === "clinic" && (
                    <View style={styles.clinicBadge}>
                      <Text style={styles.clinicText}>Clinique</Text>
                    </View>
                  )}
                  {!p.isActive && (
                    <View style={styles.inactive}>
                      <Text style={styles.inactiveText}>Inactif</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.address}>{p.address}</Text>
                <Text style={styles.sub}>
                  {p.city}
                  {p.phone ? ` · ${p.phone}` : ""}
                </Text>
              </View>
              <View style={{ gap: 6 }}>
                {!p.isPrimary && (
                  <Pressable onPress={() => setPrimary(p.id)} style={styles.iconBtn}>
                    <Ionicons name="star-outline" size={14} color={colors.teal} />
                  </Pressable>
                )}
                <Pressable onPress={() => setEditing(p)} style={styles.iconBtn}>
                  <Ionicons name="pencil" size={14} color={colors.teal} />
                </Pressable>
                {!p.isPrimary && (
                  <Pressable
                    onPress={() => deletePractice(p.id, p.name)}
                    style={[styles.iconBtn, { borderColor: colors.danger }]}
                  >
                    <Ionicons name="trash" size={14} color={colors.danger} />
                  </Pressable>
                )}
              </View>
            </View>
          ))
        )}
      </Screen>

      <Modal
        visible={!!editing}
        animationType="slide"
        onRequestClose={() => setEditing(null)}
      >
        {editing && (
          <PracticeEditor
            practice={editing}
            onClose={() => setEditing(null)}
            onSaved={async () => {
              setEditing(null);
              await load();
            }}
          />
        )}
      </Modal>
    </>
  );
}

function PracticeEditor({
  practice,
  onClose,
  onSaved,
}: {
  practice: Partial<Practice>;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [name, setName] = useState(practice.name ?? "");
  const [address, setAddress] = useState(practice.address ?? "");
  const [city, setCity] = useState(practice.city ?? "");
  const [phone, setPhone] = useState(practice.phone ?? "");
  const [isPrimary, setIsPrimary] = useState(!!practice.isPrimary);
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim() || !address.trim() || !city.trim())
      return Alert.alert("Erreur", "Nom, adresse et ville sont obligatoires");
    setSaving(true);
    try {
      const body = {
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        phone: phone.trim() || null,
        isPrimary,
      };
      if (practice.id) {
        await api(`/api/doctor/practices/${practice.id}`, {
          method: "PATCH",
          body,
        });
      } else {
        await api("/api/doctor/practices", { method: "POST", body });
      }
      await onSaved();
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.modalHead}>
        <Pressable onPress={onClose} style={styles.modalClose}>
          <Ionicons name="close" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={styles.modalTitle}>
          {practice.id ? "Modifier le cabinet" : "Nouveau cabinet"}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Field label="Nom">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="ex. Cabinet Médical Carthage"
            style={styles.input}
          />
        </Field>
        <Field label="Adresse">
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder="Rue + numéro"
            style={styles.input}
          />
        </Field>
        <Field label="Ville">
          <TextInput
            value={city}
            onChangeText={setCity}
            placeholder="Tunis, Sfax…"
            style={styles.input}
          />
        </Field>
        <Field label="Téléphone (optionnel)">
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder="+216 XX XXX XXX"
            keyboardType="phone-pad"
            style={styles.input}
          />
        </Field>

        <Pressable
          onPress={() => setIsPrimary((v) => !v)}
          style={styles.primaryToggle}
        >
          <View
            style={[
              styles.checkBox,
              isPrimary && { backgroundColor: colors.teal, borderColor: colors.teal },
            ]}
          >
            {isPrimary && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
          </View>
          <Text style={styles.toggleText}>
            Marquer comme cabinet principal
          </Text>
        </Pressable>

        <Pressable
          onPress={submit}
          disabled={saving}
          style={[styles.primary, saving && { opacity: 0.6 }]}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryText}>
              {practice.id ? "Enregistrer" : "Créer"}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  icon: {
    height: 40,
    width: 40,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  title: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  primaryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: colors.teal,
  },
  primaryBadgeText: { fontSize: 9, fontWeight: "700", color: "#FFFFFF" },
  clinicBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: "#DBEAFE",
  },
  clinicText: { fontSize: 9, fontWeight: "700", color: "#1E40AF" },
  inactive: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: "#E5E7EB",
  },
  inactiveText: { fontSize: 9, fontWeight: "700", color: "#4B5563" },
  address: { fontSize: 13, color: colors.foreground, marginTop: 4 },
  sub: { fontSize: 11, color: colors.foregroundSecondary, marginTop: 2 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },

  modalHead: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.bg,
  },
  modalClose: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgSecondary,
  },
  modalTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "800",
    color: colors.foreground,
    textAlign: "center",
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.sm + 2,
    fontSize: 14,
    backgroundColor: colors.bg,
    color: colors.foreground,
  },
  primaryToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  checkBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleText: { fontSize: 14, color: colors.foreground, flex: 1 },
  primary: {
    marginTop: spacing.md,
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  primaryText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
});
