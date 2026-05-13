import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  Linking,
  ActivityIndicator,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t } from "@doktori/mobile-core";
import { Screen, Card, Loader } from "./_ui";

type VerificationStatus =
  | "pending"
  | "documents_submitted"
  | "approved"
  | "rejected";

type DoctorDocument = {
  id: string;
  type: string;
  fileName: string;
  fileUrl: string;
  uploadedAt: string;
};

type DocumentsResponse = {
  documents: DoctorDocument[];
  verificationStatus: VerificationStatus;
  verificationNote: string | null;
};

type Slot = {
  type: "diplome" | "carte_cnom" | "cin" | "autre";
  required: boolean;
};

const SLOTS: Slot[] = [
  { type: "diplome", required: true },
  { type: "carte_cnom", required: true },
  { type: "cin", required: true },
  { type: "autre", required: false },
];

const REQUIRED_TYPES = SLOTS.filter((s) => s.required).map((s) => s.type);

function slotLabel(type: Slot["type"]): string {
  return t(`doctor.verification.slots.${type}.label`);
}
function slotHint(type: Slot["type"]): string {
  return t(`doctor.verification.slots.${type}.hint`);
}

export default function VerificationScreen() {
  const [docs, setDocs] = useState<DoctorDocument[]>([]);
  const [status, setStatus] = useState<VerificationStatus>("pending");
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api<DocumentsResponse>("/api/doctor/documents", {
        noRedirect: true,
      });
      setDocs(Array.isArray(data.documents) ? data.documents : []);
      setStatus(data.verificationStatus ?? "pending");
      setNote(data.verificationNote ?? null);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const canEdit = status === "pending" || status === "rejected";

  function getDocForType(type: string): DoctorDocument | undefined {
    return [...docs]
      .filter((d) => d.type === type)
      .sort(
        (a, b) =>
          new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
      )[0];
  }

  async function pickAndUpload(type: Slot["type"]) {
    // expo-image-picker is not installed in this app yet. We require it
    // dynamically so the screen still renders if the user hasn't added the
    // dependency, and we show a clear error otherwise.
    let ImagePicker: typeof import("expo-image-picker") | null = null;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      ImagePicker = require("expo-image-picker");
    } catch {
      Alert.alert(
        t("common.error"),
        t("doctor.verification.pickerMissing")
      );
      return;
    }
    if (!ImagePicker) return;

    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t("common.error"), t("doctor.verification.permDenied"));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      setUploadingType(type);
      const form = new FormData();
      // RN FormData expects { uri, name, type } as an object
      const filename = asset.fileName ?? `${type}-${Date.now()}.jpg`;
      const mime = asset.mimeType ?? "image/jpeg";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      form.append("file", {
        uri: asset.uri,
        name: filename,
        type: mime,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
      form.append("type", type);

      const res = await api<{ document: DoctorDocument }>(
        "/api/doctor/documents",
        { method: "POST", body: form, noRedirect: true }
      );
      setDocs((prev) => [...prev, res.document]);
    } catch (e) {
      Alert.alert(
        t("common.error"),
        e instanceof Error ? e.message : t("doctor.verification.uploadError")
      );
    } finally {
      setUploadingType(null);
    }
  }

  async function handleDelete(docId: string) {
    Alert.alert(
      t("doctor.verification.deleteTitle"),
      t("doctor.verification.deleteConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await api(`/api/doctor/documents?id=${docId}`, {
                method: "DELETE",
                noRedirect: true,
              });
              setDocs((prev) => prev.filter((d) => d.id !== docId));
            } catch {
              Alert.alert(t("doctor.verification.deleteError"));
            }
          },
        },
      ]
    );
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await api("/api/doctor/documents/submit", {
        method: "POST",
        noRedirect: true,
      });
      setStatus("documents_submitted");
      Alert.alert(
        t("doctor.verification.submittedTitle"),
        t("doctor.verification.submittedMessage")
      );
    } catch (e) {
      Alert.alert(
        t("common.error"),
        e instanceof Error ? e.message : t("doctor.verification.submitError")
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: t("doctor.verification.title") }} />
        <Loader />
      </>
    );
  }

  const allRequiredUploaded = REQUIRED_TYPES.every(
    (type) => !!getDocForType(type)
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: t("doctor.verification.title"),
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={10}
              style={{ paddingHorizontal: spacing.sm }}
            >
              <Ionicons
                name="chevron-back"
                size={24}
                color={colors.foreground}
              />
            </Pressable>
          ),
        }}
      />
      <Screen>
        {/* Status banner */}
        <StatusBanner status={status} note={note} />

        {/* Documents */}
        <Card title={t("doctor.verification.requiredDocsSection")}>
          {SLOTS.map((slot) => {
            const uploaded = getDocForType(slot.type);
            const isUploading = uploadingType === slot.type;
            return (
              <View key={slot.type} style={styles.slot}>
                <View style={styles.slotHead}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <View style={styles.labelRow}>
                      <Text style={styles.slotLabel}>
                        {slotLabel(slot.type)}
                      </Text>
                      {slot.required ? (
                        <Text style={styles.required}>
                          {t("doctor.verification.required")}
                        </Text>
                      ) : (
                        <Text style={styles.optional}>
                          {t("doctor.verification.optional")}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.slotHint}>{slotHint(slot.type)}</Text>
                  </View>
                  {uploaded && (
                    <View style={styles.uploadedBadge}>
                      <Ionicons
                        name="checkmark-circle"
                        size={12}
                        color="#047857"
                      />
                      <Text style={styles.uploadedBadgeText}>
                        {t("doctor.verification.uploadedBadge")}
                      </Text>
                    </View>
                  )}
                </View>

                {uploaded ? (
                  <View style={styles.fileRow}>
                    <Ionicons
                      name="document-text"
                      size={16}
                      color={colors.teal}
                    />
                    <Pressable
                      style={{ flex: 1, minWidth: 0 }}
                      onPress={() =>
                        Linking.openURL(uploaded.fileUrl).catch(() => {})
                      }
                    >
                      <Text
                        style={styles.fileName}
                        numberOfLines={1}
                        ellipsizeMode="middle"
                      >
                        {uploaded.fileName}
                      </Text>
                    </Pressable>
                    {canEdit && (
                      <Pressable
                        onPress={() => handleDelete(uploaded.id)}
                        hitSlop={8}
                        style={styles.deleteBtn}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={16}
                          color="#DC2626"
                        />
                      </Pressable>
                    )}
                  </View>
                ) : canEdit ? (
                  <Pressable
                    onPress={() => pickAndUpload(slot.type)}
                    disabled={isUploading}
                    style={({ pressed }) => [
                      styles.uploadBtn,
                      pressed && { opacity: 0.7 },
                      isUploading && { opacity: 0.6 },
                    ]}
                  >
                    {isUploading ? (
                      <ActivityIndicator size="small" color={colors.teal} />
                    ) : (
                      <Ionicons
                        name="cloud-upload-outline"
                        size={16}
                        color={colors.teal}
                      />
                    )}
                    <Text style={styles.uploadBtnText}>
                      {isUploading
                        ? t("doctor.verification.uploading")
                        : t("doctor.verification.uploadButton")}
                    </Text>
                  </Pressable>
                ) : (
                  <View style={styles.notProvided}>
                    <Ionicons name="alert-circle-outline" size={14} color="#A16207" />
                    <Text style={styles.notProvidedText}>
                      {t("doctor.verification.notProvided")}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </Card>

        {/* Submit */}
        {canEdit && (
          <View style={{ gap: spacing.sm }}>
            <Pressable
              onPress={handleSubmit}
              disabled={
                !allRequiredUploaded || submitting || !!uploadingType
              }
              style={({ pressed }) => [
                styles.submitBtn,
                (!allRequiredUploaded || submitting || !!uploadingType) && {
                  opacity: 0.5,
                },
                pressed &&
                  allRequiredUploaded &&
                  !submitting && { opacity: 0.85 },
              ]}
            >
              <Ionicons name="send" size={16} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>
                {submitting
                  ? t("doctor.verification.submitting")
                  : t("doctor.verification.submitButton")}
              </Text>
            </Pressable>
            {!allRequiredUploaded && (
              <Text style={styles.submitHint}>
                {t("doctor.verification.submitDisabledMessage")}
              </Text>
            )}
          </View>
        )}

        {/* FAQ */}
        <Card title={t("doctor.verification.faqTitle")}>
          <Text style={styles.faqText}>
            {t("doctor.verification.faqTrust")}
          </Text>
          <Text style={[styles.faqText, { marginTop: spacing.xs }]}>
            {t("doctor.verification.faqTimeline")}
          </Text>
        </Card>
      </Screen>
    </>
  );
}

function StatusBanner({
  status,
  note,
}: {
  status: VerificationStatus;
  note: string | null;
}) {
  let bg = "#FEF3C7";
  let fg = "#92400E";
  let icon: React.ComponentProps<typeof Ionicons>["name"] = "alert-circle";
  let title = t("doctor.verification.waitingTitle");
  let msg = t("doctor.verification.waitingMessage");

  if (status === "approved") {
    bg = "#D1FAE5";
    fg = "#065F46";
    icon = "checkmark-circle";
    title = t("doctor.verification.approvedTitle");
    msg = t("doctor.verification.approvedMessage");
  } else if (status === "documents_submitted") {
    bg = "#DBEAFE";
    fg = "#1E40AF";
    icon = "time";
    title = t("doctor.verification.pendingDocsTitle");
    msg = t("doctor.verification.pendingDocsMessage");
  } else if (status === "rejected") {
    bg = "#FEE2E2";
    fg = "#991B1B";
    icon = "close-circle";
    title = t("doctor.verification.rejectedTitle");
    msg = t("doctor.verification.rejectedResubmit");
  }

  return (
    <View style={[styles.banner, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={18} color={fg} style={{ marginTop: 1 }} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.bannerTitle, { color: fg }]}>{title}</Text>
        {status === "rejected" && note ? (
          <Text style={[styles.bannerText, { color: fg }]}>
            <Text style={{ fontWeight: "700" }}>
              {t("doctor.verification.rejectedReason")}
            </Text>{" "}
            {note}
          </Text>
        ) : null}
        <Text style={[styles.bannerText, { color: fg }]}>{msg}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
  },
  bannerTitle: { fontSize: 14, fontWeight: "800", marginBottom: 2 },
  bannerText: { fontSize: 12, lineHeight: 16 },

  slot: {
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  slotHead: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexWrap: "wrap",
  },
  slotLabel: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  slotHint: {
    fontSize: 11,
    color: colors.foregroundSecondary,
    marginTop: 2,
  },
  required: { fontSize: 10, fontWeight: "700", color: "#DC2626" },
  optional: { fontSize: 10, color: colors.foregroundSecondary },

  uploadedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: "#D1FAE5",
    borderRadius: radii.full,
  },
  uploadedBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#047857",
  },

  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm + 2,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    backgroundColor: colors.bgSecondary,
  },
  uploadBtnText: { fontSize: 13, fontWeight: "700", color: colors.teal },

  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
  },
  fileName: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.teal,
  },
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: radii.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEE2E2",
  },

  notProvided: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
  },
  notProvidedText: {
    fontSize: 12,
    color: colors.foregroundSecondary,
  },

  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.teal,
  },
  submitBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  submitHint: {
    fontSize: 11,
    color: colors.foregroundSecondary,
    textAlign: "center",
  },

  faqText: { fontSize: 12, color: colors.foreground, lineHeight: 16 },
});
