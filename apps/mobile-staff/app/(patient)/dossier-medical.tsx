import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import {
  ApiError,
  api,
  colors,
  radii,
  spacing,
  t,
  useLocale,
} from "@doktori/mobile-core";

const PATIENT_TOKEN_KEY = "doktori.patient.token";

// ---------- Types ----------
type TabId = "allergies" | "traitements" | "analyses" | "vaccinations" | "rappels" | "enfants";

type Allergy = {
  id: string;
  allergen: string;
  severity: "mild" | "moderate" | "severe";
  reaction: string | null;
  diagnosedAt: string | null;
};

type Medication = {
  id: string;
  medicationName: string;
  dosage: string | null;
  frequency: string | null;
  startedAt: string | null;
  endedAt: string | null;
  notes: string | null;
};

type Analysis = {
  id: string;
  title: string;
  labName: string | null;
  testDate: string | null;
  fileUrl: string | null;
};

type Vaccination = {
  id: string;
  vaccineName: string;
  dateReceived: string;
  batchNumber: string | null;
  givenBy: string | null;
  notes: string | null;
};

type Reminder = {
  id: string;
  medicationName: string;
  dosage: string | null;
  frequencyHours: number;
  nextReminderAt: string | null;
  active: boolean;
};

type Dependent = {
  id: string;
  name: string;
  dateOfBirth: string | null;
  gender: "M" | "F" | null;
  relation: string | null;
};

async function getPatientToken(): Promise<string | null> {
  const SS = await import("expo-secure-store").catch(() => null);
  return SS ? SS.getItemAsync(PATIENT_TOKEN_KEY) : null;
}

// ---------- Main screen ----------
export default function PatientDossierMedical() {
  useLocale();
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("allergies");

  const tabs: Array<{ id: TabId; icon: React.ComponentProps<typeof Ionicons>["name"] }> = [
    { id: "allergies", icon: "warning" },
    { id: "traitements", icon: "medkit" },
    { id: "analyses", icon: "flask" },
    { id: "vaccinations", icon: "shield-checkmark" },
    { id: "rappels", icon: "alarm" },
    { id: "enfants", icon: "people" },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityLabel={t("patient.dossier.back")}
        >
          <Ionicons name="chevron-back" size={26} color={colors.foreground} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("patient.dossier.title")}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsBarScroll}
        contentContainerStyle={styles.tabsBar}
      >
        {tabs.map((tt) => {
          const active = tab === tt.id;
          return (
            <Pressable
              key={tt.id}
              onPress={() => setTab(tt.id)}
              style={[styles.tabBtn, active && styles.tabBtnActive]}
            >
              <Ionicons
                name={tt.icon}
                size={14}
                color={active ? "#fff" : colors.foregroundSecondary}
              />
              <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                {t(`patient.dossier.tabs.${tt.id}`)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ flex: 1 }}>
        {tab === "allergies" && <AllergiesTab />}
        {tab === "traitements" && <TraitementsTab />}
        {tab === "analyses" && <AnalysesTab />}
        {tab === "vaccinations" && <VaccinationsTab />}
        {tab === "rappels" && <RappelsTab />}
        {tab === "enfants" && <EnfantsTab />}
      </View>
    </SafeAreaView>
  );
}

// ---------- Shared helpers ----------
function useList<T>(loader: (token: string | null) => Promise<T[]>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getPatientToken();
      const list = await loader(token);
      setItems(list);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : t("patient.dossier.loadError")
      );
    } finally {
      setLoading(false);
    }
  }, [loader]);

  useEffect(() => {
    load();
  }, [load]);

  return { items, setItems, loading, error, reload: load };
}

function ListShell({
  loading,
  error,
  empty,
  onAdd,
  onRetry,
  children,
}: {
  loading: boolean;
  error: string | null;
  empty: boolean;
  onAdd: () => void;
  onRetry: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={{ flex: 1 }}>
      <View style={styles.actionsRow}>
        <Pressable style={styles.addBtn} onPress={onAdd}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={styles.addBtnText}>{t("patient.dossier.add")}</Text>
        </Pressable>
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.teal} />
          <Text style={styles.muted}>{t("patient.dossier.loading")}</Text>
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errText}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={onRetry}>
            <Text style={styles.retryText}>{t("patient.dossier.retry")}</Text>
          </Pressable>
        </View>
      ) : empty ? (
        <View style={styles.center}>
          <Ionicons name="folder-open-outline" size={40} color={colors.foregroundSecondary} />
          <Text style={styles.muted}>{t("patient.dossier.empty")}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent}>{children}</ScrollView>
      )}
    </View>
  );
}

function confirmDelete(onYes: () => void) {
  Alert.alert(
    t("patient.dossier.deleteConfirmTitle"),
    t("patient.dossier.deleteConfirmBody"),
    [
      { text: t("patient.dossier.cancel"), style: "cancel" },
      {
        text: t("patient.dossier.delete"),
        style: "destructive",
        onPress: onYes,
      },
    ]
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: "default" | "numeric";
}) {
  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={colors.foregroundSecondary}
        multiline={multiline}
        keyboardType={keyboardType ?? "default"}
      />
    </View>
  );
}

function ModalShell({
  visible,
  title,
  onClose,
  onSave,
  saving,
  children,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  children: React.ReactNode;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet">
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.header}>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.linkText}>{t("patient.dossier.cancel")}</Text>
          </Pressable>
          <Text style={styles.headerTitle}>{title}</Text>
          <Pressable onPress={onSave} hitSlop={12} disabled={saving}>
            <Text style={[styles.linkText, { color: colors.teal }]}>
              {saving ? t("patient.dossier.saving") : t("patient.dossier.save")}
            </Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.modalBody}>{children}</ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function ItemCard({
  title,
  subtitle,
  meta,
  onEdit,
  onDelete,
  children,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  onEdit: () => void;
  onDelete: () => void;
  children?: React.ReactNode;
}) {
  return (
    <Pressable
      style={styles.card}
      onPress={onEdit}
      onLongPress={() => confirmDelete(onDelete)}
      delayLongPress={500}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        {subtitle ? <Text style={styles.cardSubtitle}>{subtitle}</Text> : null}
        {meta ? <Text style={styles.cardMeta}>{meta}</Text> : null}
        {children}
      </View>
      <Pressable
        hitSlop={10}
        onPress={() => confirmDelete(onDelete)}
        style={styles.cardDeleteBtn}
      >
        <Ionicons name="trash-outline" size={18} color={colors.danger} />
      </Pressable>
    </Pressable>
  );
}

// ---------- Allergies ----------
function AllergiesTab() {
  const { items, setItems, loading, error, reload } = useList<Allergy>(
    useCallback(async (token) => {
      const res = await api<{ allergies: Allergy[] }>("/api/me/allergies", {
        token: token ?? undefined,
      });
      return res.allergies ?? [];
    }, [])
  );
  const [editing, setEditing] = useState<Allergy | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <>
      <ListShell
        loading={loading}
        error={error}
        empty={items.length === 0}
        onAdd={() => setAdding(true)}
        onRetry={reload}
      >
        {items.map((a) => (
          <ItemCard
            key={a.id}
            title={a.allergen}
            subtitle={t(`patient.dossier.allergies.${a.severity}`)}
            meta={[a.reaction, a.diagnosedAt].filter(Boolean).join(" • ") || undefined}
            onEdit={() => setEditing(a)}
            onDelete={async () => {
              try {
                const token = await getPatientToken();
                await api(`/api/me/allergies/${a.id}`, {
                  method: "DELETE",
                  token: token ?? undefined,
                });
                setItems((prev) => prev.filter((x) => x.id !== a.id));
              } catch {
                Alert.alert(t("patient.dossier.loadError"));
              }
            }}
          />
        ))}
      </ListShell>
      {(adding || editing) && (
        <AllergyModal
          item={editing}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSaved={() => {
            setAdding(false);
            setEditing(null);
            reload();
          }}
        />
      )}
    </>
  );
}

function AllergyModal({
  item,
  onClose,
  onSaved,
}: {
  item: Allergy | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [allergen, setAllergen] = useState(item?.allergen ?? "");
  const [severity, setSeverity] = useState<Allergy["severity"]>(item?.severity ?? "moderate");
  const [reaction, setReaction] = useState(item?.reaction ?? "");
  const [diagnosedAt, setDiagnosedAt] = useState(item?.diagnosedAt ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!allergen.trim()) {
      Alert.alert(t("patient.dossier.required"));
      return;
    }
    setSaving(true);
    try {
      const token = await getPatientToken();
      const body: Record<string, unknown> = {
        allergen: allergen.trim(),
        severity,
        reaction: reaction.trim() || null,
        diagnosedAt: /^\d{4}-\d{2}-\d{2}$/.test(diagnosedAt) ? diagnosedAt : null,
      };
      if (item) {
        await api(`/api/me/allergies/${item.id}`, {
          method: "PATCH",
          body,
          token: token ?? undefined,
        });
      } else {
        await api("/api/me/allergies", {
          method: "POST",
          body,
          token: token ?? undefined,
        });
      }
      onSaved();
    } catch (e) {
      Alert.alert(e instanceof ApiError ? e.message : t("patient.dossier.loadError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      visible
      title={
        item ? t("patient.dossier.allergies.modalEdit") : t("patient.dossier.allergies.modalAdd")
      }
      onClose={onClose}
      onSave={save}
      saving={saving}
    >
      <Field
        label={t("patient.dossier.allergies.allergen")}
        value={allergen}
        onChange={setAllergen}
        placeholder={t("patient.dossier.allergies.allergenPh")}
      />
      <Text style={styles.fieldLabel}>{t("patient.dossier.allergies.severity")}</Text>
      <View style={styles.segment}>
        {(["mild", "moderate", "severe"] as const).map((s) => (
          <Pressable
            key={s}
            onPress={() => setSeverity(s)}
            style={[styles.segmentBtn, severity === s && styles.segmentBtnActive]}
          >
            <Text style={[styles.segmentText, severity === s && styles.segmentTextActive]}>
              {t(`patient.dossier.allergies.${s}`)}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={{ height: spacing.md }} />
      <Field
        label={t("patient.dossier.allergies.reaction")}
        value={reaction}
        onChange={setReaction}
        placeholder={t("patient.dossier.allergies.reactionPh")}
        multiline
      />
      <Field
        label={t("patient.dossier.allergies.diagnosedAt")}
        value={diagnosedAt}
        onChange={setDiagnosedAt}
        placeholder={t("patient.dossier.allergies.datePh")}
      />
    </ModalShell>
  );
}

// ---------- Traitements ----------
function TraitementsTab() {
  const { items, setItems, loading, error, reload } = useList<Medication>(
    useCallback(async (token) => {
      const res = await api<{ medications: Medication[] }>("/api/me/medications", {
        token: token ?? undefined,
      });
      return res.medications ?? [];
    }, [])
  );
  const [editing, setEditing] = useState<Medication | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <>
      <ListShell
        loading={loading}
        error={error}
        empty={items.length === 0}
        onAdd={() => setAdding(true)}
        onRetry={reload}
      >
        {items.map((m) => {
          const sub = [m.dosage, m.frequency].filter(Boolean).join(" • ") || undefined;
          const meta =
            m.startedAt && !m.endedAt
              ? `${m.startedAt} • ${t("patient.dossier.traitements.ongoing")}`
              : [m.startedAt, m.endedAt].filter(Boolean).join(" → ") || undefined;
          return (
            <ItemCard
              key={m.id}
              title={m.medicationName}
              subtitle={sub}
              meta={meta}
              onEdit={() => setEditing(m)}
              onDelete={async () => {
                try {
                  const token = await getPatientToken();
                  await api(`/api/me/medications/${m.id}`, {
                    method: "DELETE",
                    token: token ?? undefined,
                  });
                  setItems((prev) => prev.filter((x) => x.id !== m.id));
                } catch {
                  Alert.alert(t("patient.dossier.loadError"));
                }
              }}
            />
          );
        })}
      </ListShell>
      {(adding || editing) && (
        <MedicationModal
          item={editing}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSaved={() => {
            setAdding(false);
            setEditing(null);
            reload();
          }}
        />
      )}
    </>
  );
}

function MedicationModal({
  item,
  onClose,
  onSaved,
}: {
  item: Medication | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [medicationName, setMedicationName] = useState(item?.medicationName ?? "");
  const [dosage, setDosage] = useState(item?.dosage ?? "");
  const [frequency, setFrequency] = useState(item?.frequency ?? "");
  const [startedAt, setStartedAt] = useState(item?.startedAt ?? "");
  const [endedAt, setEndedAt] = useState(item?.endedAt ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!medicationName.trim()) {
      Alert.alert(t("patient.dossier.required"));
      return;
    }
    setSaving(true);
    try {
      const token = await getPatientToken();
      const body: Record<string, unknown> = {
        medicationName: medicationName.trim(),
        dosage: dosage.trim() || null,
        frequency: frequency.trim() || null,
        startedAt: /^\d{4}-\d{2}-\d{2}$/.test(startedAt) ? startedAt : null,
        endedAt: /^\d{4}-\d{2}-\d{2}$/.test(endedAt) ? endedAt : null,
        notes: notes.trim() || null,
      };
      if (item) {
        await api(`/api/me/medications/${item.id}`, {
          method: "PATCH",
          body,
          token: token ?? undefined,
        });
      } else {
        await api("/api/me/medications", {
          method: "POST",
          body,
          token: token ?? undefined,
        });
      }
      onSaved();
    } catch (e) {
      Alert.alert(e instanceof ApiError ? e.message : t("patient.dossier.loadError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      visible
      title={
        item
          ? t("patient.dossier.traitements.modalEdit")
          : t("patient.dossier.traitements.modalAdd")
      }
      onClose={onClose}
      onSave={save}
      saving={saving}
    >
      <Field
        label={t("patient.dossier.traitements.medication")}
        value={medicationName}
        onChange={setMedicationName}
        placeholder={t("patient.dossier.traitements.medicationPh")}
      />
      <Field
        label={t("patient.dossier.traitements.dosage")}
        value={dosage}
        onChange={setDosage}
        placeholder={t("patient.dossier.traitements.dosagePh")}
      />
      <Field
        label={t("patient.dossier.traitements.frequency")}
        value={frequency}
        onChange={setFrequency}
        placeholder={t("patient.dossier.traitements.frequencyPh")}
      />
      <Field
        label={t("patient.dossier.traitements.startedAt")}
        value={startedAt}
        onChange={setStartedAt}
        placeholder={t("patient.dossier.allergies.datePh")}
      />
      <Field
        label={t("patient.dossier.traitements.endedAt")}
        value={endedAt}
        onChange={setEndedAt}
        placeholder={t("patient.dossier.allergies.datePh")}
      />
      <Field
        label={t("patient.dossier.traitements.notes")}
        value={notes}
        onChange={setNotes}
        placeholder={t("patient.dossier.traitements.notesPh")}
        multiline
      />
    </ModalShell>
  );
}

// ---------- Analyses ----------
function AnalysesTab() {
  const { items, setItems, loading, error, reload } = useList<Analysis>(
    useCallback(async (token) => {
      const res = await api<{ analyses: Analysis[] }>("/api/me/analyses", {
        token: token ?? undefined,
      });
      return res.analyses ?? [];
    }, [])
  );
  const [editing, setEditing] = useState<Analysis | null>(null);

  return (
    <>
      <ListShell
        loading={loading}
        error={error}
        empty={items.length === 0}
        onAdd={() => {
          Alert.alert(t("patient.dossier.analyses.uploadHint"));
        }}
        onRetry={reload}
      >
        {items.map((a) => (
          <ItemCard
            key={a.id}
            title={a.title}
            subtitle={[a.labName, a.testDate].filter(Boolean).join(" • ") || undefined}
            onEdit={() => setEditing(a)}
            onDelete={async () => {
              try {
                const token = await getPatientToken();
                await api(`/api/me/analyses/${a.id}`, {
                  method: "DELETE",
                  token: token ?? undefined,
                });
                setItems((prev) => prev.filter((x) => x.id !== a.id));
              } catch {
                Alert.alert(t("patient.dossier.loadError"));
              }
            }}
          >
            {a.fileUrl ? (
              <Pressable
                onPress={() => Linking.openURL(a.fileUrl!).catch(() => undefined)}
                style={styles.linkRow}
              >
                <Ionicons name="document-attach" size={14} color={colors.teal} />
                <Text style={styles.linkText}>{t("patient.dossier.analyses.openFile")}</Text>
              </Pressable>
            ) : (
              <Text style={styles.cardMeta}>{t("patient.dossier.analyses.noFile")}</Text>
            )}
          </ItemCard>
        ))}
      </ListShell>
      {editing && (
        <AnalysisModal
          item={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            reload();
          }}
        />
      )}
    </>
  );
}

function AnalysisModal({
  item,
  onClose,
  onSaved,
}: {
  item: Analysis;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [labName, setLabName] = useState(item.labName ?? "");
  const [testDate, setTestDate] = useState(item.testDate ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) {
      Alert.alert(t("patient.dossier.required"));
      return;
    }
    setSaving(true);
    try {
      const token = await getPatientToken();
      await api(`/api/me/analyses/${item.id}`, {
        method: "PATCH",
        body: {
          title: title.trim(),
          labName: labName.trim() || null,
          testDate: /^\d{4}-\d{2}-\d{2}$/.test(testDate) ? testDate : null,
        },
        token: token ?? undefined,
      });
      onSaved();
    } catch (e) {
      Alert.alert(e instanceof ApiError ? e.message : t("patient.dossier.loadError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      visible
      title={t("patient.dossier.analyses.modalEdit")}
      onClose={onClose}
      onSave={save}
      saving={saving}
    >
      <Field
        label={t("patient.dossier.analyses.label")}
        value={title}
        onChange={setTitle}
        placeholder={t("patient.dossier.analyses.labelPh")}
      />
      <Field
        label={t("patient.dossier.analyses.labName")}
        value={labName}
        onChange={setLabName}
        placeholder={t("patient.dossier.analyses.labNamePh")}
      />
      <Field
        label={t("patient.dossier.analyses.testDate")}
        value={testDate}
        onChange={setTestDate}
        placeholder={t("patient.dossier.allergies.datePh")}
      />
      <Text style={[styles.muted, { marginTop: spacing.sm }]}>
        {t("patient.dossier.analyses.uploadHint")}
      </Text>
    </ModalShell>
  );
}

// ---------- Vaccinations ----------
function VaccinationsTab() {
  const { items, setItems, loading, error, reload } = useList<Vaccination>(
    useCallback(async (token) => {
      const res = await api<{ vaccinations: Vaccination[] }>("/api/me/vaccinations", {
        token: token ?? undefined,
      });
      return res.vaccinations ?? [];
    }, [])
  );
  const [editing, setEditing] = useState<Vaccination | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <>
      <ListShell
        loading={loading}
        error={error}
        empty={items.length === 0}
        onAdd={() => setAdding(true)}
        onRetry={reload}
      >
        {items.map((v) => (
          <ItemCard
            key={v.id}
            title={v.vaccineName}
            subtitle={v.dateReceived}
            meta={[v.batchNumber, v.givenBy].filter(Boolean).join(" • ") || undefined}
            onEdit={() => setEditing(v)}
            onDelete={async () => {
              try {
                const token = await getPatientToken();
                await api(`/api/me/vaccinations/${v.id}`, {
                  method: "DELETE",
                  token: token ?? undefined,
                });
                setItems((prev) => prev.filter((x) => x.id !== v.id));
              } catch {
                Alert.alert(t("patient.dossier.loadError"));
              }
            }}
          />
        ))}
      </ListShell>
      {(adding || editing) && (
        <VaccinationModal
          item={editing}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSaved={() => {
            setAdding(false);
            setEditing(null);
            reload();
          }}
        />
      )}
    </>
  );
}

function VaccinationModal({
  item,
  onClose,
  onSaved,
}: {
  item: Vaccination | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [vaccineName, setVaccineName] = useState(item?.vaccineName ?? "");
  const [dateReceived, setDateReceived] = useState(item?.dateReceived ?? "");
  const [batchNumber, setBatchNumber] = useState(item?.batchNumber ?? "");
  const [givenBy, setGivenBy] = useState(item?.givenBy ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!vaccineName.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(dateReceived)) {
      Alert.alert(t("patient.dossier.required"));
      return;
    }
    setSaving(true);
    try {
      const token = await getPatientToken();
      const body: Record<string, unknown> = {
        vaccineName: vaccineName.trim(),
        dateReceived,
        batchNumber: batchNumber.trim() || null,
        givenBy: givenBy.trim() || null,
      };
      if (item) {
        await api(`/api/me/vaccinations/${item.id}`, {
          method: "PATCH",
          body,
          token: token ?? undefined,
        });
      } else {
        await api("/api/me/vaccinations", {
          method: "POST",
          body,
          token: token ?? undefined,
        });
      }
      onSaved();
    } catch (e) {
      Alert.alert(e instanceof ApiError ? e.message : t("patient.dossier.loadError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      visible
      title={
        item
          ? t("patient.dossier.vaccinations.modalEdit")
          : t("patient.dossier.vaccinations.modalAdd")
      }
      onClose={onClose}
      onSave={save}
      saving={saving}
    >
      <Field
        label={t("patient.dossier.vaccinations.vaccine")}
        value={vaccineName}
        onChange={setVaccineName}
        placeholder={t("patient.dossier.vaccinations.vaccinePh")}
      />
      <Field
        label={t("patient.dossier.vaccinations.dateReceived")}
        value={dateReceived}
        onChange={setDateReceived}
        placeholder={t("patient.dossier.allergies.datePh")}
      />
      <Field
        label={t("patient.dossier.vaccinations.batchNumber")}
        value={batchNumber}
        onChange={setBatchNumber}
        placeholder={t("patient.dossier.vaccinations.batchNumberPh")}
      />
      <Field
        label={t("patient.dossier.vaccinations.givenBy")}
        value={givenBy}
        onChange={setGivenBy}
        placeholder={t("patient.dossier.vaccinations.givenByPh")}
      />
    </ModalShell>
  );
}

// ---------- Rappels (chronic reminders) ----------
function RappelsTab() {
  const { items, setItems, loading, error, reload } = useList<Reminder>(
    useCallback(async (token) => {
      const res = await api<{ reminders: Reminder[] }>("/api/me/chronic-reminders", {
        token: token ?? undefined,
      });
      return res.reminders ?? [];
    }, [])
  );
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <>
      <ListShell
        loading={loading}
        error={error}
        empty={items.length === 0}
        onAdd={() => setAdding(true)}
        onRetry={reload}
      >
        {items.map((r) => {
          const nextLabel = r.nextReminderAt
            ? `${t("patient.dossier.rappels.nextReminder")}: ${new Date(
                r.nextReminderAt
              ).toLocaleString()}`
            : undefined;
          const status = r.active
            ? t("patient.dossier.rappels.active")
            : t("patient.dossier.rappels.inactive");
          return (
            <ItemCard
              key={r.id}
              title={r.medicationName}
              subtitle={[r.dosage, `${r.frequencyHours}h`].filter(Boolean).join(" • ")}
              meta={[nextLabel, status].filter(Boolean).join(" • ")}
              onEdit={() => setEditing(r)}
              onDelete={async () => {
                try {
                  const token = await getPatientToken();
                  await api(`/api/me/chronic-reminders/${r.id}`, {
                    method: "DELETE",
                    token: token ?? undefined,
                  });
                  setItems((prev) => prev.filter((x) => x.id !== r.id));
                } catch {
                  Alert.alert(t("patient.dossier.loadError"));
                }
              }}
            />
          );
        })}
      </ListShell>
      {(adding || editing) && (
        <ReminderModal
          item={editing}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSaved={() => {
            setAdding(false);
            setEditing(null);
            reload();
          }}
        />
      )}
    </>
  );
}

function ReminderModal({
  item,
  onClose,
  onSaved,
}: {
  item: Reminder | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [medicationName, setMedicationName] = useState(item?.medicationName ?? "");
  const [dosage, setDosage] = useState(item?.dosage ?? "");
  const [frequencyHours, setFrequencyHours] = useState(String(item?.frequencyHours ?? 24));
  const [active, setActive] = useState(item?.active ?? true);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const freq = parseInt(frequencyHours, 10);
    if (!medicationName.trim() || !Number.isFinite(freq) || freq < 1 || freq > 24 * 30) {
      Alert.alert(t("patient.dossier.required"));
      return;
    }
    setSaving(true);
    try {
      const token = await getPatientToken();
      if (item) {
        const body: Record<string, unknown> = {
          medicationName: medicationName.trim(),
          dosage: dosage.trim() || null,
          frequencyHours: freq,
          active,
        };
        await api(`/api/me/chronic-reminders/${item.id}`, {
          method: "PATCH",
          body,
          token: token ?? undefined,
        });
      } else {
        await api("/api/me/chronic-reminders", {
          method: "POST",
          body: {
            medicationName: medicationName.trim(),
            dosage: dosage.trim() || null,
            frequencyHours: freq,
          },
          token: token ?? undefined,
        });
      }
      onSaved();
    } catch (e) {
      Alert.alert(e instanceof ApiError ? e.message : t("patient.dossier.loadError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      visible
      title={
        item ? t("patient.dossier.rappels.modalEdit") : t("patient.dossier.rappels.modalAdd")
      }
      onClose={onClose}
      onSave={save}
      saving={saving}
    >
      <Field
        label={t("patient.dossier.rappels.medication")}
        value={medicationName}
        onChange={setMedicationName}
        placeholder={t("patient.dossier.rappels.medicationPh")}
      />
      <Field
        label={t("patient.dossier.rappels.dosage")}
        value={dosage}
        onChange={setDosage}
        placeholder={t("patient.dossier.traitements.dosagePh")}
      />
      <Field
        label={t("patient.dossier.rappels.frequencyHours")}
        value={frequencyHours}
        onChange={setFrequencyHours}
        placeholder={t("patient.dossier.rappels.frequencyHoursPh")}
        keyboardType="numeric"
      />
      {item && (
        <View style={styles.switchRow}>
          <Text style={styles.fieldLabel}>
            {active
              ? t("patient.dossier.rappels.active")
              : t("patient.dossier.rappels.inactive")}
          </Text>
          <Switch value={active} onValueChange={setActive} />
        </View>
      )}
    </ModalShell>
  );
}

// ---------- Enfants (dependents) ----------
function EnfantsTab() {
  const { items, setItems, loading, error, reload } = useList<Dependent>(
    useCallback(async (token) => {
      const res = await api<{ dependents?: Dependent[] } | Dependent[]>(
        "/api/me/dependents",
        { token: token ?? undefined }
      );
      // route returns either an array or a wrapped object — handle both
      if (Array.isArray(res)) return res;
      return res.dependents ?? [];
    }, [])
  );
  const [editing, setEditing] = useState<Dependent | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <>
      <ListShell
        loading={loading}
        error={error}
        empty={items.length === 0}
        onAdd={() => setAdding(true)}
        onRetry={reload}
      >
        {items.map((d) => (
          <ItemCard
            key={d.id}
            title={d.name}
            subtitle={[
              d.relation,
              d.gender === "M"
                ? t("patient.dossier.enfants.male")
                : d.gender === "F"
                ? t("patient.dossier.enfants.female")
                : null,
            ]
              .filter(Boolean)
              .join(" • ")}
            meta={d.dateOfBirth ?? undefined}
            onEdit={() => setEditing(d)}
            onDelete={async () => {
              try {
                const token = await getPatientToken();
                await api(`/api/me/dependents/${d.id}`, {
                  method: "DELETE",
                  token: token ?? undefined,
                });
                setItems((prev) => prev.filter((x) => x.id !== d.id));
              } catch {
                Alert.alert(t("patient.dossier.loadError"));
              }
            }}
          />
        ))}
      </ListShell>
      {(adding || editing) && (
        <DependentModal
          item={editing}
          onClose={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSaved={() => {
            setAdding(false);
            setEditing(null);
            reload();
          }}
        />
      )}
    </>
  );
}

function DependentModal({
  item,
  onClose,
  onSaved,
}: {
  item: Dependent | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  // split name into first/last for editing
  const initialParts = item ? item.name.split(/\s+/) : [];
  const [firstName, setFirstName] = useState(initialParts[0] ?? "");
  const [lastName, setLastName] = useState(initialParts.slice(1).join(" "));
  const [dob, setDob] = useState(item?.dateOfBirth ?? "");
  const [gender, setGender] = useState<"M" | "F" | null>(item?.gender ?? null);
  const [relationship, setRelationship] = useState(item?.relation ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert(t("patient.dossier.required"));
      return;
    }
    setSaving(true);
    try {
      const token = await getPatientToken();
      const body: Record<string, unknown> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dob: /^\d{4}-\d{2}-\d{2}$/.test(dob) ? dob : null,
        gender,
        relationship: relationship.trim() || null,
      };
      if (item) {
        await api(`/api/me/dependents/${item.id}`, {
          method: "PATCH",
          body,
          token: token ?? undefined,
        });
      } else {
        await api("/api/me/dependents", {
          method: "POST",
          body,
          token: token ?? undefined,
        });
      }
      onSaved();
    } catch (e) {
      Alert.alert(e instanceof ApiError ? e.message : t("patient.dossier.loadError"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell
      visible
      title={
        item ? t("patient.dossier.enfants.modalEdit") : t("patient.dossier.enfants.modalAdd")
      }
      onClose={onClose}
      onSave={save}
      saving={saving}
    >
      <Field
        label={t("patient.dossier.enfants.firstName")}
        value={firstName}
        onChange={setFirstName}
      />
      <Field
        label={t("patient.dossier.enfants.lastName")}
        value={lastName}
        onChange={setLastName}
      />
      <Field
        label={t("patient.dossier.enfants.dob")}
        value={dob}
        onChange={setDob}
        placeholder={t("patient.dossier.allergies.datePh")}
      />
      <Text style={styles.fieldLabel}>{t("patient.dossier.enfants.gender")}</Text>
      <View style={styles.segment}>
        {(["M", "F"] as const).map((g) => (
          <Pressable
            key={g}
            onPress={() => setGender(g)}
            style={[styles.segmentBtn, gender === g && styles.segmentBtnActive]}
          >
            <Text style={[styles.segmentText, gender === g && styles.segmentTextActive]}>
              {g === "M"
                ? t("patient.dossier.enfants.male")
                : t("patient.dossier.enfants.female")}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={{ height: spacing.md }} />
      <Field
        label={t("patient.dossier.enfants.relationship")}
        value={relationship}
        onChange={setRelationship}
        placeholder={t("patient.dossier.enfants.relationshipPh")}
      />
    </ModalShell>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  tabsBarScroll: { flexGrow: 0, flexShrink: 0 },
  tabsBar: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
    alignItems: "center",
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radii.full ?? 999,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabBtnActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  tabLabel: { fontSize: 13, fontWeight: "600", color: colors.foregroundSecondary },
  tabLabelActive: { color: "#fff" },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.teal,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  card: {
    flexDirection: "row",
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: colors.foreground },
  cardSubtitle: { fontSize: 13, color: colors.foregroundSecondary, marginTop: 2 },
  cardMeta: { fontSize: 12, color: colors.foregroundSecondary, marginTop: 4 },
  cardDeleteBtn: { padding: spacing.xs },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
    gap: spacing.sm,
  },
  muted: { color: colors.foregroundSecondary, fontSize: 13, textAlign: "center" },
  errText: { color: colors.danger, fontSize: 14, textAlign: "center" },
  retryBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.teal,
    borderRadius: radii.md,
  },
  retryText: { color: "#fff", fontWeight: "600" },
  modalBody: { padding: spacing.lg, gap: spacing.sm },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.foregroundSecondary,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    color: colors.foreground,
  },
  inputMultiline: { minHeight: 80, textAlignVertical: "top" },
  linkText: { color: colors.teal, fontWeight: "600", fontSize: 14 },
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: spacing.xs,
  },
  segment: {
    flexDirection: "row",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: "center",
    backgroundColor: colors.bgSecondary,
  },
  segmentBtnActive: { backgroundColor: colors.teal },
  segmentText: { fontSize: 13, fontWeight: "600", color: colors.foregroundSecondary },
  segmentTextActive: { color: "#fff" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
});
