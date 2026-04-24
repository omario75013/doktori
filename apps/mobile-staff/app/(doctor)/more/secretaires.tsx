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
  Share,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api } from "@doktori/mobile-core";
import { Screen, Card, Loader, Empty, formatDate } from "./_ui";

type Secretary = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  permissions: Record<string, boolean>;
  dateOfBirth: string | null;
  yearsOfExperience: number | null;
  monthlySalary: number | null;
  monthlyDayOffAllowance: string | null;
  hireDate: string | null;
  lastActiveAt: string | null;
  createdAt: string;
};

type Schedule = {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

const SECTIONS = [
  { key: "agenda", label: "Agenda" },
  { key: "rendezVous", label: "Rendez-vous" },
  { key: "rendezVousCreate", label: "Créer RDV" },
  { key: "rendezVousEdit", label: "Modifier RDV" },
  { key: "rendezVousCancel", label: "Annuler RDV" },
  { key: "patients", label: "Patients (voir)" },
  { key: "patientsCreate", label: "Créer patient" },
  { key: "patientsEdit", label: "Modifier patient" },
  { key: "patientsDelete", label: "Supprimer patient" },
  { key: "messagerie", label: "Messagerie" },
  { key: "wallet", label: "Wallet" },
  { key: "factures", label: "Factures" },
  { key: "motifs", label: "Motifs" },
  { key: "cabinets", label: "Cabinets" },
  { key: "teleconsult", label: "Téléconsult" },
];

const DAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];

type Dialog =
  | { kind: "invite" }
  | { kind: "edit"; secretary: Secretary }
  | { kind: "perms"; secretary: Secretary }
  | { kind: "planning"; secretary: Secretary }
  | null;

export default function Secretaires() {
  const [rows, setRows] = useState<Secretary[] | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<Secretary[]>("/api/secretaries");
      setRows(r);
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleActive(s: Secretary) {
    try {
      await api(`/api/secretaries/${s.id}`, {
        method: "PATCH",
        body: { isActive: !s.isActive },
      });
      await load();
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "");
    }
  }

  async function deleteSecretary(s: Secretary) {
    Alert.alert("Désactiver", `${s.name} ne pourra plus se connecter.`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Désactiver",
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/api/secretaries/${s.id}`, { method: "DELETE" });
            await load();
          } catch (e) {
            Alert.alert("Erreur", e instanceof Error ? e.message : "");
          }
        },
      },
    ]);
  }

  if (!rows) {
    return (
      <>
        <Stack.Screen options={{ title: "Secrétaires" }} />
        <Loader />
      </>
    );
  }

  const active = rows.filter((r) => r.isActive).length;
  const inactive = rows.length - active;

  return (
    <>
      <Stack.Screen
        options={{
          title: "Secrétaires",
          headerRight: () => (
            <Pressable
              onPress={() => setDialog({ kind: "invite" })}
              hitSlop={10}
              style={{ padding: spacing.xs, marginRight: spacing.sm }}
            >
              <Ionicons name="person-add" size={22} color={colors.teal} />
            </Pressable>
          ),
        }}
      />
      <Screen>
        {/* KPIs */}
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Stat label="Équipe" value={String(rows.length)} />
          <Stat label="Actives" value={String(active)} accent="#16A34A" />
          <Stat label="Inactives" value={String(inactive)} accent="#4B5563" />
        </View>

        {/* Actions rapides */}
        <Card title="Actions rapides">
          <QuickRow
            icon="person-add"
            label="Inviter une secrétaire"
            sub="Créer un compte avec identifiants"
            onPress={() => setDialog({ kind: "invite" })}
          />
          <QuickRow
            icon="share-social"
            label="Partager un lien d'invitation"
            sub="Envoyer l'URL de connexion par SMS/WhatsApp"
            onPress={async () => {
              try {
                await Share.share({
                  message:
                    "Connectez-vous à Doktori en tant que secrétaire : https://doktori.tn/secretaire-login",
                });
              } catch {
                /* cancelled */
              }
            }}
          />
          <QuickRow
            icon="refresh"
            label="Rafraîchir la liste"
            onPress={load}
          />
        </Card>

        {/* List */}
        <Card title={`Liste de l'équipe (${rows.length})`}>
          {rows.length === 0 ? (
            <Empty icon="people-outline" title="Aucune secrétaire" />
          ) : (
            rows.map((s) => (
              <SecretaryRow
                key={s.id}
                secretary={s}
                onEdit={() => setDialog({ kind: "edit", secretary: s })}
                onPerms={() => setDialog({ kind: "perms", secretary: s })}
                onPlanning={() => setDialog({ kind: "planning", secretary: s })}
                onToggle={() => toggleActive(s)}
                onDelete={() => deleteSecretary(s)}
              />
            ))
          )}
        </Card>
      </Screen>

      {dialog?.kind === "invite" && (
        <Modal visible animationType="slide" onRequestClose={() => setDialog(null)}>
          <InviteSecretary
            onClose={() => setDialog(null)}
            onSaved={async () => {
              setDialog(null);
              await load();
            }}
          />
        </Modal>
      )}

      {dialog?.kind === "edit" && (
        <Modal visible animationType="slide" onRequestClose={() => setDialog(null)}>
          <EditSecretary
            secretary={dialog.secretary}
            onClose={() => setDialog(null)}
            onSaved={async () => {
              setDialog(null);
              await load();
            }}
          />
        </Modal>
      )}

      {dialog?.kind === "perms" && (
        <Modal visible animationType="slide" onRequestClose={() => setDialog(null)}>
          <PermissionsEditor
            secretary={dialog.secretary}
            onClose={() => setDialog(null)}
            onSaved={async () => {
              setDialog(null);
              await load();
            }}
          />
        </Modal>
      )}

      {dialog?.kind === "planning" && (
        <Modal visible animationType="slide" onRequestClose={() => setDialog(null)}>
          <PlanningEditor
            secretary={dialog.secretary}
            onClose={() => setDialog(null)}
          />
        </Modal>
      )}
    </>
  );
}

function SecretaryRow({
  secretary,
  onEdit,
  onPerms,
  onPlanning,
  onToggle,
  onDelete,
}: {
  secretary: Secretary;
  onEdit: () => void;
  onPerms: () => void;
  onPlanning: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const initials = secretary.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initials}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <View style={styles.rowHead}>
          <Text style={styles.name}>{secretary.name}</Text>
          {secretary.isActive ? (
            <View style={styles.active}>
              <Text style={styles.activeText}>Active</Text>
            </View>
          ) : (
            <View style={styles.inactive}>
              <Text style={styles.inactiveText}>Inactive</Text>
            </View>
          )}
        </View>
        <Text style={styles.sub}>{secretary.email}</Text>
        {secretary.phone && <Text style={styles.sub}>{secretary.phone}</Text>}
        <View style={styles.actions}>
          <ActionPill icon="pencil" label="Modifier" onPress={onEdit} />
          <ActionPill
            icon="shield-checkmark"
            label="Permissions"
            onPress={onPerms}
          />
          <ActionPill icon="calendar" label="Planning" onPress={onPlanning} />
          <ActionPill
            icon={secretary.isActive ? "pause" : "play"}
            label={secretary.isActive ? "Désactiver" : "Activer"}
            onPress={onToggle}
          />
          {secretary.isActive && (
            <ActionPill
              icon="trash"
              label="Supprimer"
              tone="danger"
              onPress={onDelete}
            />
          )}
        </View>
      </View>
    </View>
  );
}

function ActionPill({
  icon,
  label,
  tone,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  tone?: "danger";
  onPress: () => void;
}) {
  const color = tone === "danger" ? colors.danger : colors.teal;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.pill, { borderColor: color }]}
    >
      <Ionicons name={icon} size={11} color={color} />
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </Pressable>
  );
}

function QuickRow({
  icon,
  label,
  sub,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  sub?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.quickRow}>
      <View style={styles.quickIcon}>
        <Ionicons name={icon} size={18} color={colors.teal} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.quickLabel}>{label}</Text>
        {sub && <Text style={styles.quickSub}>{sub}</Text>}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.foregroundSecondary} />
    </Pressable>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, accent && { color: accent }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

// ─── Invite dialog ──────────────────────────────────────────────────────────
function InviteSecretary({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      return Alert.alert("Erreur", "Nom, email et mot de passe obligatoires");
    }
    if (password.length < 8) {
      return Alert.alert("Erreur", "Mot de passe : 8 caractères minimum");
    }
    setSaving(true);
    try {
      await api("/api/secretaries", {
        method: "POST",
        body: {
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim() || null,
          password,
        },
      });
      await onSaved();
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title="Nouvelle secrétaire" onClose={onClose}>
      <Field label="Nom complet">
        <TextInput value={name} onChangeText={setName} style={styles.input} />
      </Field>
      <Field label="Email">
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="secretaire@doktori.tn"
          style={styles.input}
        />
      </Field>
      <Field label="Téléphone (optionnel)">
        <TextInput
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          style={styles.input}
        />
      </Field>
      <Field label="Mot de passe initial">
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Min. 8 caractères"
          style={styles.input}
        />
        <Text style={styles.hint}>
          Communique-le à la secrétaire pour sa première connexion.
        </Text>
      </Field>

      <SubmitBtn label="Créer le compte" onPress={submit} busy={saving} />
    </ModalShell>
  );
}

// ─── Edit personal info ─────────────────────────────────────────────────────
function EditSecretary({
  secretary,
  onClose,
  onSaved,
}: {
  secretary: Secretary;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [name, setName] = useState(secretary.name);
  const [phone, setPhone] = useState(secretary.phone ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(secretary.dateOfBirth ?? "");
  const [hireDate, setHireDate] = useState(secretary.hireDate ?? "");
  const [yearsOfExperience, setYears] = useState(
    secretary.yearsOfExperience != null ? String(secretary.yearsOfExperience) : ""
  );
  const [monthlySalary, setSalary] = useState(
    secretary.monthlySalary != null ? String(secretary.monthlySalary / 1000) : ""
  );
  const [dayOffAllowance, setDayOff] = useState(
    secretary.monthlyDayOffAllowance ?? ""
  );
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!name.trim()) return Alert.alert("Erreur", "Nom requis");
    setSaving(true);
    try {
      await api(`/api/secretaries/${secretary.id}`, {
        method: "PATCH",
        body: {
          name: name.trim(),
          phone: phone.trim() || null,
          dateOfBirth: dateOfBirth.trim() || null,
          hireDate: hireDate.trim() || null,
          yearsOfExperience: yearsOfExperience ? Number(yearsOfExperience) : null,
          monthlySalary: monthlySalary ? Math.round(Number(monthlySalary) * 1000) : null,
          monthlyDayOffAllowance: dayOffAllowance ? Number(dayOffAllowance) : null,
        },
      });
      await onSaved();
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title={`Modifier ${secretary.name}`} onClose={onClose}>
      <Field label="Nom complet">
        <TextInput value={name} onChangeText={setName} style={styles.input} />
      </Field>
      <Field label="Téléphone">
        <TextInput
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          style={styles.input}
        />
      </Field>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Field label="Date naissance">
          <TextInput
            value={dateOfBirth}
            onChangeText={setDateOfBirth}
            placeholder="YYYY-MM-DD"
            style={styles.input}
          />
        </Field>
        <Field label="Date embauche">
          <TextInput
            value={hireDate}
            onChangeText={setHireDate}
            placeholder="YYYY-MM-DD"
            style={styles.input}
          />
        </Field>
      </View>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Field label="Années exp.">
          <TextInput
            value={yearsOfExperience}
            onChangeText={setYears}
            keyboardType="numeric"
            style={styles.input}
          />
        </Field>
        <Field label="Salaire (DT)">
          <TextInput
            value={monthlySalary}
            onChangeText={setSalary}
            keyboardType="numeric"
            style={styles.input}
          />
        </Field>
      </View>
      <Field label="Congés / mois (jours)">
        <TextInput
          value={dayOffAllowance}
          onChangeText={setDayOff}
          keyboardType="numeric"
          placeholder="ex. 2.0"
          style={styles.input}
        />
      </Field>

      <SubmitBtn label="Enregistrer" onPress={submit} busy={saving} />
    </ModalShell>
  );
}

// ─── Permissions ────────────────────────────────────────────────────────────
function PermissionsEditor({
  secretary,
  onClose,
  onSaved,
}: {
  secretary: Secretary;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [perms, setPerms] = useState<Record<string, boolean>>(
    secretary.permissions ?? {}
  );
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    try {
      await api(`/api/secretaries/${secretary.id}`, {
        method: "PATCH",
        body: { permissions: perms },
      });
      await onSaved();
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title={`Permissions · ${secretary.name}`} onClose={onClose}>
      {SECTIONS.map((s) => {
        const on = !!perms[s.key];
        return (
          <Pressable
            key={s.key}
            onPress={() => setPerms((prev) => ({ ...prev, [s.key]: !on }))}
            style={[styles.permRow, on && styles.permRowActive]}
          >
            <Text style={styles.permLabel}>{s.label}</Text>
            <View
              style={[
                styles.switch,
                { backgroundColor: on ? colors.teal : "#CBD5E1" },
              ]}
            >
              <View
                style={[
                  styles.knob,
                  { transform: [{ translateX: on ? 20 : 0 }] },
                ]}
              />
            </View>
          </Pressable>
        );
      })}

      <SubmitBtn label="Enregistrer" onPress={submit} busy={saving} />
    </ModalShell>
  );
}

// ─── Planning ───────────────────────────────────────────────────────────────
function PlanningEditor({
  secretary,
  onClose,
}: {
  secretary: Secretary;
  onClose: () => void;
}) {
  const [schedule, setSchedule] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api<Schedule[]>(
        `/api/secretaries/${secretary.id}/schedule`
      );
      // Normalize: 7 days, one per DOW
      const byDow: Record<number, Schedule> = {};
      for (const s of r ?? []) byDow[s.dayOfWeek] = s;
      const full = Array.from({ length: 7 }, (_, i) =>
        byDow[i]
          ? { ...byDow[i], startTime: byDow[i].startTime.slice(0, 5), endTime: byDow[i].endTime.slice(0, 5) }
          : {
              dayOfWeek: i,
              startTime: "08:00",
              endTime: "17:00",
              isActive: false,
            }
      );
      setSchedule(full);
    } catch {
      setSchedule(
        Array.from({ length: 7 }, (_, i) => ({
          dayOfWeek: i,
          startTime: "08:00",
          endTime: "17:00",
          isActive: false,
        }))
      );
    } finally {
      setLoading(false);
    }
  }, [secretary.id]);

  useEffect(() => {
    void load();
  }, [load]);

  function update(i: number, patch: Partial<Schedule>) {
    setSchedule((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  }

  async function submit() {
    setSaving(true);
    try {
      const active = schedule.filter((s) => s.isActive);
      await api(`/api/secretaries/${secretary.id}/schedule`, {
        method: "PUT",
        body: { slots: active },
      });
      Alert.alert("Enregistré", "Planning mis à jour");
      onClose();
    } catch (e) {
      Alert.alert("Erreur", e instanceof Error ? e.message : "");
    } finally {
      setSaving(false);
    }
  }

  return (
    <ModalShell title={`Planning · ${secretary.name}`} onClose={onClose}>
      {loading ? (
        <ActivityIndicator color={colors.teal} />
      ) : (
        <>
          <Text style={styles.hint}>
            Sélectionnez les jours travaillés et leurs horaires.
          </Text>
          {schedule.map((s, i) => (
            <View
              key={i}
              style={[
                styles.dayRow,
                s.isActive && {
                  borderColor: colors.teal,
                  backgroundColor: colors.bgSecondary,
                },
              ]}
            >
              <Pressable
                onPress={() => update(i, { isActive: !s.isActive })}
                style={styles.dayToggle}
              >
                <View
                  style={[
                    styles.checkBox,
                    s.isActive && {
                      backgroundColor: colors.teal,
                      borderColor: colors.teal,
                    },
                  ]}
                >
                  {s.isActive && (
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  )}
                </View>
                <Text style={styles.dayLabel}>{DAYS[s.dayOfWeek]}</Text>
              </Pressable>
              {s.isActive && (
                <View style={styles.timeRow}>
                  <TextInput
                    value={s.startTime}
                    onChangeText={(v) => update(i, { startTime: v })}
                    placeholder="08:00"
                    style={styles.timeInput}
                  />
                  <Text style={styles.timeSep}>–</Text>
                  <TextInput
                    value={s.endTime}
                    onChangeText={(v) => update(i, { endTime: v })}
                    placeholder="17:00"
                    style={styles.timeInput}
                  />
                </View>
              )}
            </View>
          ))}

          <SubmitBtn label="Enregistrer le planning" onPress={submit} busy={saving} />
        </>
      )}
    </ModalShell>
  );
}

// ─── Primitives ─────────────────────────────────────────────────────────────
function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.modalHead}>
        <Pressable onPress={onClose} style={styles.modalClose}>
          <Ionicons name="close" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={styles.modalTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={{ width: 36 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        {children}
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
    <View style={{ flex: 1, gap: 4 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function SubmitBtn({
  label,
  onPress,
  busy,
}: {
  label: string;
  onPress: () => void;
  busy: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={[styles.primary, busy && { opacity: 0.6 }]}
    >
      {busy ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={styles.primaryText}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  stat: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
  },
  statValue: { fontSize: 22, fontWeight: "800", color: colors.teal },
  statLabel: {
    fontSize: 10,
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.3,
    marginTop: 2,
  },

  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  avatar: {
    height: 42,
    width: 42,
    borderRadius: radii.full,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.teal, fontWeight: "800" },
  name: { fontSize: 14, fontWeight: "700", color: colors.foreground, flex: 1 },
  sub: { fontSize: 11, color: colors.foregroundSecondary, marginTop: 2 },
  active: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: "#DCFCE7",
  },
  activeText: { fontSize: 9, fontWeight: "700", color: "#166534" },
  inactive: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full,
    backgroundColor: "#E5E7EB",
  },
  inactiveText: { fontSize: 9, fontWeight: "700", color: "#4B5563" },

  actions: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  pillText: { fontSize: 10, fontWeight: "700" },

  quickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  quickIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: { fontSize: 13, fontWeight: "700", color: colors.foreground },
  quickSub: { fontSize: 11, color: colors.foregroundSecondary, marginTop: 2 },

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
  hint: { fontSize: 11, color: colors.foregroundSecondary, marginTop: 2 },

  permRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: spacing.sm + 2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  permRowActive: { borderColor: colors.teal, backgroundColor: colors.bgSecondary },
  permLabel: { fontSize: 14, color: colors.foreground, flex: 1 },
  switch: { width: 44, height: 24, borderRadius: radii.full, padding: 2 },
  knob: {
    width: 20,
    height: 20,
    borderRadius: radii.full,
    backgroundColor: "#FFFFFF",
  },

  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  dayToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flex: 1,
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
  dayLabel: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  timeInput: {
    width: 62,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: 6,
    fontSize: 13,
    textAlign: "center",
    color: colors.foreground,
    fontFamily: "monospace",
  },
  timeSep: {
    color: colors.foregroundSecondary,
    fontWeight: "700",
  },

  primary: {
    marginTop: spacing.md,
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  primaryText: { color: "#FFFFFF", fontWeight: "800", fontSize: 14 },
});
