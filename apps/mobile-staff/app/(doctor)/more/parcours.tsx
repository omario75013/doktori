import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t } from "@doktori/mobile-core";
import { Screen, Card, Empty, Loader } from "./_ui";

type Education = { degree: string; institution: string; year: number };
type Experience = {
  role: string;
  place: string;
  startYear: number;
  endYear: number | null;
};

type Parcours = {
  educations: Education[];
  experiences: Experience[];
  languages: string[];
  expertise: string[];
  yearsOfExperience: number | null;
};

type Section = "edu" | "exp";

export default function ParcoursScreen() {
  const [data, setData] = useState<Parcours | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSection, setModalSection] = useState<Section>("edu");
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [fDegree, setFDegree] = useState("");
  const [fInstitution, setFInstitution] = useState("");
  const [fYear, setFYear] = useState("");
  const [fRole, setFRole] = useState("");
  const [fPlace, setFPlace] = useState("");
  const [fStart, setFStart] = useState("");
  const [fEnd, setFEnd] = useState("");

  async function load() {
    setLoading(true);
    try {
      const res = await api<Parcours>("/api/doctor/profile/parcours");
      setData(res);
    } catch {
      setData({
        educations: [],
        experiences: [],
        languages: [],
        expertise: [],
        yearsOfExperience: null,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function resetForm() {
    setFDegree("");
    setFInstitution("");
    setFYear(String(new Date().getFullYear()));
    setFRole("");
    setFPlace("");
    setFStart(String(new Date().getFullYear()));
    setFEnd("");
    setEditIndex(null);
  }

  function openAdd(section: Section) {
    resetForm();
    setModalSection(section);
    setModalOpen(true);
  }

  function openEdit(section: Section, index: number) {
    if (!data) return;
    resetForm();
    setModalSection(section);
    setEditIndex(index);
    if (section === "edu") {
      const e = data.educations[index];
      if (e) {
        setFDegree(e.degree);
        setFInstitution(e.institution);
        setFYear(String(e.year));
      }
    } else {
      const e = data.experiences[index];
      if (e) {
        setFRole(e.role);
        setFPlace(e.place);
        setFStart(String(e.startYear));
        setFEnd(e.endYear == null ? "" : String(e.endYear));
      }
    }
    setModalOpen(true);
  }

  async function persist(next: Parcours) {
    setSaving(true);
    try {
      await api("/api/doctor/profile/parcours", {
        method: "POST",
        body: {
          educations: next.educations,
          experiences: next.experiences,
          languages: next.languages,
          expertise: next.expertise,
          yearsOfExperience: next.yearsOfExperience,
        },
      });
      setData(next);
    } catch (e) {
      Alert.alert(
        t("common.error"),
        e instanceof Error ? e.message : t("common.error")
      );
      throw e;
    } finally {
      setSaving(false);
    }
  }

  async function saveModal() {
    if (!data) return;
    if (modalSection === "edu") {
      const degree = fDegree.trim();
      const institution = fInstitution.trim();
      if (!degree || !institution) {
        Alert.alert(t("common.error"), t("doctor.parcours.requiredFields"));
        return;
      }
      const item: Education = {
        degree,
        institution,
        year: Number(fYear) || new Date().getFullYear(),
      };
      const educations =
        editIndex == null
          ? [...data.educations, item]
          : data.educations.map((e, i) => (i === editIndex ? item : e));
      try {
        await persist({ ...data, educations });
        setModalOpen(false);
      } catch {
        /* handled */
      }
    } else {
      const role = fRole.trim();
      const place = fPlace.trim();
      if (!role || !place) {
        Alert.alert(t("common.error"), t("doctor.parcours.requiredFields"));
        return;
      }
      const item: Experience = {
        role,
        place,
        startYear: Number(fStart) || new Date().getFullYear(),
        endYear: fEnd.trim() === "" ? null : Number(fEnd) || null,
      };
      const experiences =
        editIndex == null
          ? [...data.experiences, item]
          : data.experiences.map((e, i) => (i === editIndex ? item : e));
      try {
        await persist({ ...data, experiences });
        setModalOpen(false);
      } catch {
        /* handled */
      }
    }
  }

  function confirmDelete(section: Section, index: number) {
    Alert.alert(
      t("doctor.parcours.deleteConfirmTitle"),
      t("doctor.parcours.deleteConfirmMsg"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: () => void doDelete(section, index),
        },
      ]
    );
  }

  async function doDelete(section: Section, index: number) {
    if (!data) return;
    const next: Parcours =
      section === "edu"
        ? {
            ...data,
            educations: data.educations.filter((_, i) => i !== index),
          }
        : {
            ...data,
            experiences: data.experiences.filter((_, i) => i !== index),
          };
    try {
      await persist(next);
    } catch {
      /* handled */
    }
  }

  if (loading || !data) {
    return (
      <>
        <Stack.Screen options={{ title: t("doctor.parcours.title") }} />
        <Loader />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: t("doctor.parcours.title") }} />
      <Screen>
        <Text style={styles.subtitle}>{t("doctor.parcours.subtitle")}</Text>

        {/* Education */}
        <Card
          title={t("doctor.parcours.educationSection")}
          right={
            <Pressable onPress={() => openAdd("edu")} hitSlop={8}>
              <Text style={styles.addBtn}>{t("doctor.parcours.add")}</Text>
            </Pressable>
          }
        >
          {data.educations.length === 0 ? (
            <Empty
              icon="school-outline"
              title={t("doctor.parcours.noEducation")}
              sub={t("doctor.parcours.noEducationSub")}
            />
          ) : (
            <View style={styles.timeline}>
              {data.educations.map((e, i) => (
                <Pressable
                  key={`edu-${i}`}
                  onLongPress={() => openEdit("edu", i)}
                  onPress={() => openEdit("edu", i)}
                  style={styles.tlItem}
                >
                  <View style={styles.tlDot} />
                  <View style={styles.tlBody}>
                    <Text style={styles.tlTitle}>{e.degree}</Text>
                    <Text style={styles.tlSub}>{e.institution}</Text>
                    <Text style={styles.tlYear}>{e.year}</Text>
                  </View>
                  <Pressable
                    onPress={() => confirmDelete("edu", i)}
                    hitSlop={10}
                    style={styles.delBtn}
                  >
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  </Pressable>
                </Pressable>
              ))}
            </View>
          )}
        </Card>

        {/* Experience */}
        <Card
          title={t("doctor.parcours.experienceSection")}
          right={
            <Pressable onPress={() => openAdd("exp")} hitSlop={8}>
              <Text style={styles.addBtn}>{t("doctor.parcours.add")}</Text>
            </Pressable>
          }
        >
          {data.experiences.length === 0 ? (
            <Empty
              icon="briefcase-outline"
              title={t("doctor.parcours.noExperience")}
              sub={t("doctor.parcours.noExperienceSub")}
            />
          ) : (
            <View style={styles.timeline}>
              {data.experiences.map((e, i) => (
                <Pressable
                  key={`exp-${i}`}
                  onLongPress={() => openEdit("exp", i)}
                  onPress={() => openEdit("exp", i)}
                  style={styles.tlItem}
                >
                  <View style={[styles.tlDot, { backgroundColor: "#8B5CF6" }]} />
                  <View style={styles.tlBody}>
                    <Text style={styles.tlTitle}>{e.role}</Text>
                    <Text style={styles.tlSub}>{e.place}</Text>
                    <Text style={styles.tlYear}>
                      {e.startYear} – {e.endYear ?? t("doctor.parcours.present")}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => confirmDelete("exp", i)}
                    hitSlop={10}
                    style={styles.delBtn}
                  >
                    <Ionicons name="trash-outline" size={18} color="#DC2626" />
                  </Pressable>
                </Pressable>
              ))}
            </View>
          )}
        </Card>
      </Screen>

      {/* Add/Edit modal */}
      <Modal
        visible={modalOpen}
        animationType="slide"
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={styles.modal}>
          <View style={styles.modalHead}>
            <Pressable
              onPress={() => setModalOpen(false)}
              style={styles.modalClose}
            >
              <Ionicons name="close" size={22} color={colors.foreground} />
            </Pressable>
            <Text style={styles.modalTitle}>
              {editIndex == null
                ? modalSection === "edu"
                  ? t("doctor.parcours.addEducation")
                  : t("doctor.parcours.addExperience")
                : modalSection === "edu"
                  ? t("doctor.parcours.editEducation")
                  : t("doctor.parcours.editExperience")}
            </Text>
            <Pressable
              onPress={saveModal}
              disabled={saving}
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            >
              <Text style={styles.saveBtnText}>
                {saving ? "…" : t("common.save")}
              </Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            {modalSection === "edu" ? (
              <>
                <Text style={styles.fieldLabel}>
                  {t("doctor.parcours.degreeLabel")}
                </Text>
                <TextInput
                  value={fDegree}
                  onChangeText={setFDegree}
                  placeholder={t("doctor.parcours.degreePlaceholder")}
                  placeholderTextColor={colors.foregroundSecondary}
                  style={styles.input}
                />

                <Text style={styles.fieldLabel}>
                  {t("doctor.parcours.institutionLabel")}
                </Text>
                <TextInput
                  value={fInstitution}
                  onChangeText={setFInstitution}
                  placeholder={t("doctor.parcours.institutionPlaceholder")}
                  placeholderTextColor={colors.foregroundSecondary}
                  style={styles.input}
                />

                <Text style={styles.fieldLabel}>
                  {t("doctor.parcours.yearLabel")}
                </Text>
                <TextInput
                  value={fYear}
                  onChangeText={setFYear}
                  placeholder="2024"
                  placeholderTextColor={colors.foregroundSecondary}
                  keyboardType="number-pad"
                  style={styles.input}
                />
              </>
            ) : (
              <>
                <Text style={styles.fieldLabel}>
                  {t("doctor.parcours.roleLabel")}
                </Text>
                <TextInput
                  value={fRole}
                  onChangeText={setFRole}
                  placeholder={t("doctor.parcours.rolePlaceholder")}
                  placeholderTextColor={colors.foregroundSecondary}
                  style={styles.input}
                />

                <Text style={styles.fieldLabel}>
                  {t("doctor.parcours.placeLabel")}
                </Text>
                <TextInput
                  value={fPlace}
                  onChangeText={setFPlace}
                  placeholder={t("doctor.parcours.placePlaceholder")}
                  placeholderTextColor={colors.foregroundSecondary}
                  style={styles.input}
                />

                <View style={styles.row}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>
                      {t("doctor.parcours.startYearLabel")}
                    </Text>
                    <TextInput
                      value={fStart}
                      onChangeText={setFStart}
                      placeholder="2020"
                      placeholderTextColor={colors.foregroundSecondary}
                      keyboardType="number-pad"
                      style={styles.input}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fieldLabel}>
                      {t("doctor.parcours.endYearLabel")}
                    </Text>
                    <TextInput
                      value={fEnd}
                      onChangeText={setFEnd}
                      placeholder={t("doctor.parcours.present")}
                      placeholderTextColor={colors.foregroundSecondary}
                      keyboardType="number-pad"
                      style={styles.input}
                    />
                  </View>
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    fontSize: 13,
    color: colors.foregroundSecondary,
    marginBottom: spacing.sm,
  },
  addBtn: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.teal,
  },
  timeline: { gap: spacing.sm },
  tlItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  tlDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.teal,
    marginTop: 6,
  },
  tlBody: { flex: 1, gap: 2 },
  tlTitle: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  tlSub: { fontSize: 12, color: colors.foregroundSecondary },
  tlYear: { fontSize: 11, color: colors.foregroundSecondary, fontWeight: "600" },
  delBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
  },

  modal: { flex: 1, backgroundColor: colors.bg },
  modalHead: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
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
    fontSize: 16,
    fontWeight: "800",
    color: colors.foreground,
    textAlign: "center",
  },
  saveBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
  },
  saveBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  modalBody: { padding: spacing.lg, gap: spacing.md },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: -spacing.xs,
  },
  input: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: { flexDirection: "row", gap: spacing.sm },
});
