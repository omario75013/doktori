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
  Image,
  Dimensions,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t } from "@doktori/mobile-core";
import { Screen, Loader, Empty } from "./_ui";

type Photo = { url: string; alt?: string };

type Practice = {
  id: string;
  name: string;
  address: string;
  city: string;
  phone: string | null;
  isPrimary: boolean;
  isActive: boolean;
  kind: "cabinet" | "clinic";
  photos?: Photo[] | null;
};

const MAX_CABINET_PHOTOS = 5;

export default function Cabinets() {
  const [rows, setRows] = useState<Practice[] | null>(null);
  const [editing, setEditing] = useState<Partial<Practice> | null>(null);
  const [viewer, setViewer] = useState<{ practiceId: string; index: number } | null>(null);
  const [uploadingPracticeId, setUploadingPracticeId] = useState<string | null>(null);

  // Lookups so child components can find latest photos array (after optimistic updates).
  const findPractice = useCallback(
    (id: string): Practice | undefined => rows?.find((p) => p.id === id),
    [rows]
  );

  function setPracticePhotos(id: string, photos: Photo[]) {
    setRows((prev) => (prev ?? []).map((p) => (p.id === id ? { ...p, photos } : p)));
  }

  async function pickAndUploadPhoto(practiceId: string) {
    const practice = findPractice(practiceId);
    if (!practice) return;
    if ((practice.photos ?? []).length >= MAX_CABINET_PHOTOS) {
      Alert.alert(
        t("common.error"),
        t("doctor.cabinetGallery.limitReached", { max: MAX_CABINET_PHOTOS })
      );
      return;
    }
    // expo-image-picker is not installed in this app yet — load dynamically.
    let ImagePicker: typeof import("expo-image-picker") | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      ImagePicker = require("expo-image-picker");
    } catch {
      Alert.alert(t("common.error"), t("doctor.cabinetGallery.pickerMissing"));
      return;
    }
    if (!ImagePicker) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t("common.error"), t("doctor.cabinetGallery.permDenied"));
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      setUploadingPracticeId(practiceId);
      const form = new FormData();
      const filename = asset.fileName ?? `cabinet-${Date.now()}.jpg`;
      const mime = asset.mimeType ?? "image/jpeg";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      form.append("file", { uri: asset.uri, name: filename, type: mime } as any);

      const res = await api<{ url: string; photos: Photo[] }>(
        `/api/medecin/cabinets/${practiceId}/photos`,
        { method: "POST", body: form, noRedirect: true }
      );
      setPracticePhotos(practiceId, res.photos);
    } catch (e) {
      Alert.alert(
        t("common.error"),
        e instanceof Error ? e.message : t("doctor.cabinetGallery.uploadError")
      );
    } finally {
      setUploadingPracticeId(null);
    }
  }

  async function deletePhoto(practiceId: string, index: number) {
    try {
      const res = await api<{ ok: boolean; photos: Photo[] }>(
        `/api/medecin/cabinets/${practiceId}/photos?index=${index}`,
        { method: "DELETE", noRedirect: true }
      );
      setPracticePhotos(practiceId, res.photos);
    } catch (e) {
      Alert.alert(
        t("common.error"),
        e instanceof Error ? e.message : t("doctor.cabinetGallery.deleteError")
      );
    }
  }

  function confirmDeletePhoto(practiceId: string, index: number, onAfter?: () => void) {
    Alert.alert(
      t("doctor.cabinetGallery.deleteTitle"),
      t("doctor.cabinetGallery.deleteConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            await deletePhoto(practiceId, index);
            onAfter?.();
          },
        },
      ]
    );
  }

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
    Alert.alert(t("doctor.cabinets.delete"), t("doctor.cabinets.deleteConfirm", { name }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/api/doctor/practices/${id}`, { method: "DELETE" });
            await load();
          } catch (e) {
            Alert.alert(t("common.error"), e instanceof Error ? e.message : "");
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
      Alert.alert(t("common.error"), e instanceof Error ? e.message : "");
    }
  }

  if (!rows) {
    return (
      <>
        <Stack.Screen options={{ title: t("doctor.cabinets.title") }} />
        <Loader />
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t("doctor.cabinets.title"),
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
          <Empty icon="business-outline" title={t("doctor.cabinets.noCabinets")} />
        ) : (
          rows.map((p) => (
            <View
              key={p.id}
              style={[
                styles.rowWrap,
                p.isPrimary && { borderColor: colors.teal, borderWidth: 1.5 },
              ]}
            >
            <View style={styles.row}>
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
                      <Text style={styles.primaryBadgeText}>{t("doctor.cabinets.main")}</Text>
                    </View>
                  )}
                  {p.kind === "clinic" && (
                    <View style={styles.clinicBadge}>
                      <Text style={styles.clinicText}>{t("doctor.cabinets.clinic")}</Text>
                    </View>
                  )}
                  {!p.isActive && (
                    <View style={styles.inactive}>
                      <Text style={styles.inactiveText}>{t("doctor.cabinets.inactive")}</Text>
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
            <PhotoStrip
              photos={p.photos ?? []}
              uploading={uploadingPracticeId === p.id}
              onAdd={() => pickAndUploadPhoto(p.id)}
              onOpen={(idx) => setViewer({ practiceId: p.id, index: idx })}
            />
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
            practice={
              // hydrate with latest photos from rows
              editing.id
                ? { ...editing, photos: findPractice(editing.id)?.photos ?? editing.photos ?? [] }
                : editing
            }
            uploading={uploadingPracticeId === editing.id}
            onAddPhoto={editing.id ? () => pickAndUploadPhoto(editing.id!) : undefined}
            onDeletePhoto={
              editing.id
                ? (idx) => confirmDeletePhoto(editing.id!, idx)
                : undefined
            }
            onClose={() => setEditing(null)}
            onSaved={async () => {
              setEditing(null);
              await load();
            }}
          />
        )}
      </Modal>

      <Modal
        visible={!!viewer}
        animationType="fade"
        transparent
        onRequestClose={() => setViewer(null)}
      >
        {viewer && (() => {
          const practice = findPractice(viewer.practiceId);
          const photo = practice?.photos?.[viewer.index];
          if (!photo) return null;
          return (
            <View style={styles.viewerRoot}>
              <Pressable
                onPress={() => setViewer(null)}
                style={styles.viewerClose}
                hitSlop={12}
              >
                <Ionicons name="close" size={26} color="#FFFFFF" />
              </Pressable>
              <Image
                source={{ uri: photo.url }}
                style={styles.viewerImage}
                resizeMode="contain"
              />
              <Pressable
                onPress={() =>
                  confirmDeletePhoto(viewer.practiceId, viewer.index, () =>
                    setViewer(null)
                  )
                }
                style={styles.viewerDelete}
              >
                <Ionicons name="trash" size={18} color="#FFFFFF" />
                <Text style={styles.viewerDeleteText}>{t("common.delete")}</Text>
              </Pressable>
            </View>
          );
        })()}
      </Modal>
    </>
  );
}

function PhotoStrip({
  photos,
  uploading,
  onAdd,
  onOpen,
}: {
  photos: Photo[];
  uploading: boolean;
  onAdd: () => void;
  onOpen: (index: number) => void;
}) {
  const canAdd = photos.length < MAX_CABINET_PHOTOS;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.stripContent}
      style={styles.strip}
    >
      {photos.map((p, i) => (
        <Pressable key={`${p.url}-${i}`} onPress={() => onOpen(i)} style={styles.thumb}>
          <Image source={{ uri: p.url }} style={styles.thumbImg} />
        </Pressable>
      ))}
      {canAdd && (
        <Pressable
          onPress={onAdd}
          disabled={uploading}
          style={[styles.addTile, uploading && { opacity: 0.5 }]}
        >
          {uploading ? (
            <ActivityIndicator color={colors.teal} />
          ) : (
            <>
              <Ionicons name="add" size={20} color={colors.teal} />
              <Text style={styles.addTileText}>
                {t("doctor.cabinetGallery.addPhoto")}
              </Text>
            </>
          )}
        </Pressable>
      )}
    </ScrollView>
  );
}

function PracticeEditor({
  practice,
  uploading,
  onAddPhoto,
  onDeletePhoto,
  onClose,
  onSaved,
}: {
  practice: Partial<Practice>;
  uploading?: boolean;
  onAddPhoto?: () => void;
  onDeletePhoto?: (index: number) => void;
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
      return Alert.alert(t("common.error"), t("doctor.cabinets.validationError"));
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
      Alert.alert(t("common.error"), e instanceof Error ? e.message : "");
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
          {practice.id ? t("doctor.cabinets.editTitle") : t("doctor.cabinets.newTitle")}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
        <Field label={t("doctor.cabinets.name")}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={t("doctor.cabinets.namePlaceholder")}
            style={styles.input}
          />
        </Field>
        <Field label={t("doctor.cabinets.address")}>
          <TextInput
            value={address}
            onChangeText={setAddress}
            placeholder={t("doctor.cabinets.addressPlaceholder")}
            style={styles.input}
          />
        </Field>
        <Field label={t("doctor.cabinets.city")}>
          <TextInput
            value={city}
            onChangeText={setCity}
            placeholder={t("doctor.cabinets.cityPlaceholder")}
            style={styles.input}
          />
        </Field>
        <Field label={t("doctor.cabinets.phone")}>
          <TextInput
            value={phone}
            onChangeText={setPhone}
            placeholder={t("doctor.cabinets.phonePlaceholder")}
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
            {t("doctor.cabinets.markAsMain")}
          </Text>
        </Pressable>

        {practice.id && onAddPhoto && (
          <View style={{ gap: spacing.sm, marginTop: spacing.md }}>
            <Text style={styles.fieldLabel}>
              {t("doctor.cabinetGallery.manage")}
            </Text>
            <Text style={{ fontSize: 11, color: colors.foregroundSecondary }}>
              {t("doctor.cabinetGallery.sectionHint")}
            </Text>
            <View style={styles.grid}>
              {(practice.photos ?? []).map((ph, i, arr) => (
                <View key={`${ph.url}-${i}`} style={styles.gridCell}>
                  <Image source={{ uri: ph.url }} style={styles.gridImg} />
                  <View style={styles.gridActions}>
                    <Pressable
                      onPress={() =>
                        Alert.alert(
                          t("common.error"),
                          t("doctor.cabinetGallery.reorderUnavailable")
                        )
                      }
                      disabled={i === 0}
                      style={[styles.miniBtn, i === 0 && { opacity: 0.3 }]}
                      accessibilityLabel={t("doctor.cabinetGallery.moveUp")}
                    >
                      <Ionicons name="arrow-up" size={12} color={colors.foreground} />
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        Alert.alert(
                          t("common.error"),
                          t("doctor.cabinetGallery.reorderUnavailable")
                        )
                      }
                      disabled={i === arr.length - 1}
                      style={[styles.miniBtn, i === arr.length - 1 && { opacity: 0.3 }]}
                      accessibilityLabel={t("doctor.cabinetGallery.moveDown")}
                    >
                      <Ionicons name="arrow-down" size={12} color={colors.foreground} />
                    </Pressable>
                    <Pressable
                      onPress={() => onDeletePhoto?.(i)}
                      style={[styles.miniBtn, { borderColor: colors.danger }]}
                    >
                      <Ionicons name="trash" size={12} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>
              ))}
              {(practice.photos ?? []).length < MAX_CABINET_PHOTOS && (
                <Pressable
                  onPress={onAddPhoto}
                  disabled={!!uploading}
                  style={[styles.gridAdd, uploading && { opacity: 0.5 }]}
                >
                  {uploading ? (
                    <ActivityIndicator color={colors.teal} />
                  ) : (
                    <>
                      <Ionicons name="add" size={20} color={colors.teal} />
                      <Text style={styles.addTileText}>
                        {t("doctor.cabinetGallery.addPhoto")}
                      </Text>
                    </>
                  )}
                </Pressable>
              )}
              {(practice.photos ?? []).length === 0 && !uploading && (
                <Text style={{ fontSize: 12, color: colors.foregroundSecondary }}>
                  {t("doctor.cabinetGallery.noPhotos")}
                </Text>
              )}
            </View>
          </View>
        )}

        <Pressable
          onPress={submit}
          disabled={saving}
          style={[styles.primary, saving && { opacity: 0.6 }]}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryText}>
              {practice.id ? t("doctor.cabinets.save") : t("doctor.cabinets.create")}
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
  rowWrap: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
  },
  strip: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgSecondary,
  },
  stripContent: {
    padding: spacing.sm,
    gap: spacing.sm,
    flexDirection: "row",
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radii.md,
    overflow: "hidden",
    backgroundColor: colors.bg,
  },
  thumbImg: { width: "100%", height: "100%" },
  addTile: {
    width: 64,
    height: 64,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bg,
    gap: 2,
  },
  addTileText: { fontSize: 9, fontWeight: "700", color: colors.teal },
  viewerRoot: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerImage: {
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height * 0.75,
  },
  viewerClose: {
    position: "absolute",
    top: 40,
    right: 16,
    zIndex: 2,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  viewerDelete: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.danger,
  },
  viewerDeleteText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  gridCell: {
    width: 100,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    overflow: "hidden",
    backgroundColor: colors.bg,
  },
  gridImg: { width: "100%", height: 70 },
  gridActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 4,
    gap: 2,
  },
  miniBtn: {
    width: 24,
    height: 24,
    borderRadius: radii.sm ?? 6,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  gridAdd: {
    width: 100,
    height: 100,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
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
