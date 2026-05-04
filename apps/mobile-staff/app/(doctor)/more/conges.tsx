import { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  Alert, ActivityIndicator, Modal, TextInput,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t } from "@doktori/mobile-core";

type DayOff = {
  id: string;
  startDate: string;
  endDate: string;
  reason: string | null;
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("fr-TN", { day: "numeric", month: "short", year: "numeric" });
}

export default function CongesScreen() {
  const [rows, setRows] = useState<DayOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<DayOff[]>("/api/doctor/days-off", { noRedirect: true });
      setRows(Array.isArray(data) ? data : []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    if (!startDate || !endDate) {
      Alert.alert(t("doctor.conges.errorDates"));
      return;
    }
    if (endDate < startDate) {
      Alert.alert(t("doctor.conges.errorEndBeforeStart"));
      return;
    }
    setSaving(true);
    try {
      const row = await api<DayOff>("/api/doctor/days-off", {
        method: "POST",
        body: { startDate, endDate, reason: reason.trim() || null },
        noRedirect: true,
      });
      setRows((prev) => [...prev, row]);
      setShowModal(false);
      setStartDate("");
      setEndDate("");
      setReason("");
    } catch {
      Alert.alert(t("doctor.conges.errorSave"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    Alert.alert(
      t("doctor.conges.deleteTitle"),
      t("doctor.conges.deleteConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"), style: "destructive",
          onPress: async () => {
            try {
              await api(`/api/doctor/days-off/${id}`, { method: "DELETE", noRedirect: true });
              setRows((prev) => prev.filter((r) => r.id !== id));
            } catch {
              Alert.alert(t("doctor.conges.errorDelete"));
            }
          },
        },
      ]
    );
  }

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = rows.filter((r) => r.endDate >= today);
  const past = rows.filter((r) => r.endDate < today);

  return (
    <>
      <Stack.Screen
        options={{
          title: t("doctor.conges.title"),
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={10} style={{ paddingHorizontal: spacing.sm }}>
              <Ionicons name="chevron-back" size={24} color={colors.foreground} />
            </Pressable>
          ),
          headerRight: () => (
            <Pressable onPress={() => setShowModal(true)} hitSlop={10} style={{ paddingHorizontal: spacing.sm }}>
              <Ionicons name="add" size={26} color={colors.teal} />
            </Pressable>
          ),
        }}
      />

      <ScrollView style={s.root} contentContainerStyle={s.content}>
        {loading ? (
          <ActivityIndicator color={colors.teal} style={{ marginTop: spacing["2xl"] }} />
        ) : (
          <>
            {upcoming.length === 0 && past.length === 0 && (
              <View style={s.empty}>
                <Ionicons name="calendar-outline" size={48} color={colors.border} />
                <Text style={s.emptyText}>{t("doctor.conges.empty")}</Text>
                <Pressable style={s.addBtn} onPress={() => setShowModal(true)}>
                  <Text style={s.addBtnText}>{t("doctor.conges.add")}</Text>
                </Pressable>
              </View>
            )}

            {upcoming.length > 0 && (
              <>
                <Text style={s.sectionLabel}>{t("doctor.conges.upcoming")}</Text>
                {upcoming.map((r) => (
                  <View key={r.id} style={s.card}>
                    <View style={s.cardLeft}>
                      <View style={s.dot} />
                      <View>
                        <Text style={s.dateRange}>{fmtDate(r.startDate)} → {fmtDate(r.endDate)}</Text>
                        {r.reason ? <Text style={s.reason}>{r.reason}</Text> : null}
                      </View>
                    </View>
                    <Pressable onPress={() => handleDelete(r.id)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </Pressable>
                  </View>
                ))}
              </>
            )}

            {past.length > 0 && (
              <>
                <Text style={[s.sectionLabel, { marginTop: spacing.xl }]}>{t("doctor.conges.past")}</Text>
                {past.map((r) => (
                  <View key={r.id} style={[s.card, s.cardPast]}>
                    <View style={s.cardLeft}>
                      <View style={[s.dot, s.dotPast]} />
                      <Text style={[s.dateRange, s.textPast]}>{fmtDate(r.startDate)} → {fmtDate(r.endDate)}</Text>
                    </View>
                  </View>
                ))}
              </>
            )}
          </>
        )}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={s.overlay}>
          <View style={s.sheet}>
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{t("doctor.conges.add")}</Text>
              <Pressable onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={22} color={colors.foreground} />
              </Pressable>
            </View>

            <Text style={s.inputLabel}>{t("doctor.conges.from")}</Text>
            <TextInput
              style={s.input}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.foregroundSecondary}
              keyboardType="numeric"
            />

            <Text style={s.inputLabel}>{t("doctor.conges.to")}</Text>
            <TextInput
              style={s.input}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.foregroundSecondary}
              keyboardType="numeric"
            />

            <Text style={s.inputLabel}>{t("doctor.conges.reason")}</Text>
            <TextInput
              style={[s.input, { height: 72, textAlignVertical: "top" }]}
              value={reason}
              onChangeText={setReason}
              placeholder={t("doctor.conges.reasonPlaceholder")}
              placeholderTextColor={colors.foregroundSecondary}
              multiline
            />

            <Pressable
              style={[s.saveBtn, saving && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.saveBtnText}>{t("doctor.conges.save")}</Text>
              }
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingBottom: spacing["3xl"], gap: spacing.sm },
  sectionLabel: { fontSize: 11, fontWeight: "700", color: colors.foregroundSecondary, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: spacing.xs },
  card: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: colors.bgSecondary, borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md,
  },
  cardPast: { opacity: 0.5 },
  cardLeft: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#EF4444", marginTop: 4 },
  dotPast: { backgroundColor: colors.border },
  dateRange: { fontSize: 14, fontWeight: "600", color: colors.foreground },
  reason: { fontSize: 12, color: colors.foregroundSecondary, marginTop: 2 },
  textPast: { color: colors.foregroundSecondary },
  empty: { alignItems: "center", paddingVertical: spacing["3xl"], gap: spacing.md },
  emptyText: { fontSize: 14, color: colors.foregroundSecondary, textAlign: "center" },
  addBtn: { backgroundColor: colors.teal, borderRadius: radii.md, paddingHorizontal: spacing.xl, paddingVertical: spacing.sm },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, padding: spacing.xl, gap: spacing.md, paddingBottom: spacing["3xl"] },
  sheetHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sheetTitle: { fontSize: 17, fontWeight: "700", color: colors.foreground },
  inputLabel: { fontSize: 13, fontWeight: "600", color: colors.foreground },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 14, color: colors.foreground, backgroundColor: colors.bgSecondary },
  saveBtn: { backgroundColor: colors.teal, borderRadius: radii.md, paddingVertical: spacing.md, alignItems: "center", marginTop: spacing.sm },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
