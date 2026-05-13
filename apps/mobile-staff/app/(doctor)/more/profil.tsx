import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Share,
  Image,
  Modal,
  TextInput,
  ScrollView,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t, useLocale } from "@doktori/mobile-core";
import { Screen, Card, Kv, Loader } from "./_ui";

type Me = {
  id: string;
  name: string;
  email: string;
  slug: string;
  totpEnabled: boolean;
};

type DoctorPublic = {
  name: string;
  specialty: string;
  city: string;
  bio: string | null;
  photoUrl: string | null;
  averageRating: number | null;
  reviewCount: number;
  yearsOfExperience: number | null;
  consultationFee: number | null;
  teleconsultFee: number | null;
  languages: string[];
  expertise: string[];
};

const WEB_BASE = "https://doktori.tn";

export default function Profil() {
  const { locale } = useLocale();
  const [me, setMe] = useState<Me | null>(null);
  const [pub, setPub] = useState<DoctorPublic | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editFee, setEditFee] = useState("");
  const [editTeleFee, setEditTeleFee] = useState("");
  const [editMode, setEditMode] = useState<"cabinet" | "teleconsult" | "both" | "home">("cabinet");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const meRes = await api<Me>("/api/doctor/me");
        setMe(meRes);
        setEditName(meRes.name);
        if (meRes?.slug) {
          try {
            const p = await api<DoctorPublic>(
              `/api/doctors/by-slug/${meRes.slug}`
            );
            setPub(p);
            setEditBio(p.bio ?? "");
            setEditFee(p.consultationFee != null ? String(Math.round(p.consultationFee / 1000)) : "");
            setEditTeleFee(p.teleconsultFee != null ? String(Math.round(p.teleconsultFee / 1000)) : "");
          } catch {
            /* ignore */
          }
        }
      } catch {
        /* ignore */
      }
    })();
  }, []);

  if (!me) {
    return (
      <>
        <Stack.Screen options={{ title: t("doctor.profil.title") }} />
        <Loader />
      </>
    );
  }

  const publicUrl = `${WEB_BASE}/${me.slug}`;

  async function saveProfile() {
    setSaving(true);
    try {
      await api("/api/doctor/profile", {
        method: "PATCH",
        body: {
          name: editName.trim() || undefined,
          bio: editBio || null,
          consultationFee: editFee ? Number(editFee) * 1000 : undefined,
          teleconsultFee: editTeleFee ? Number(editTeleFee) * 1000 : undefined,
          consultationMode: editMode,
        },
      });
      setMe((prev) => prev ? { ...prev, name: editName.trim() || prev.name } : prev);
      Alert.alert(t("common.ok"), t("doctor.profil.title"));
      setEditOpen(false);
      // Refresh pub data
      if (me?.slug) {
        const p = await api<DoctorPublic>(`/api/doctors/by-slug/${me.slug}`);
        setPub(p);
      }
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  async function shareProfile() {
    try {
      await Share.share({
        title: me ? `Dr. ${me.name}` : t("doctor.profil.defaultTitle"),
        message: `Prenez RDV avec ${me ? me.name : "moi"} sur Doktori :\n${publicUrl}`,
        url: publicUrl,
      });
    } catch {
      /* user cancelled */
    }
  }

  async function shareWhatsApp() {
    try {
      await Share.share({
        message: `Prenez RDV avec ${me ? me.name : "moi"} sur Doktori :\n${publicUrl}`,
      });
    } catch {
      /* ignored */
    }
  }

  function copyLink() {
    Alert.alert(t("doctor.profil.publicUrl"), publicUrl, [
      { text: t("common.close") },
      { text: t("doctor.profil.shareWhatsapp"), onPress: shareProfile },
    ]);
  }

  const initials = me.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(
    publicUrl
  )}&margin=10`;

  return (
    <>
      <Stack.Screen
        options={{
          title: t("doctor.profil.title"),
          headerRight: () => (
            <Pressable onPress={() => setEditOpen(true)} hitSlop={10} style={{ padding: spacing.xs, marginRight: spacing.sm }}>
              <Ionicons name="create-outline" size={22} color={colors.teal} />
            </Pressable>
          ),
        }}
      />
      <Screen>
        {/* Hero card */}
        <View style={styles.hero}>
          {pub?.photoUrl ? (
            <Image source={{ uri: pub.photoUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          <Text style={styles.name}>{me.name}</Text>
          {pub && (
            <Text style={styles.specialty}>
              {pub.specialty}
              {pub.city ? ` · ${pub.city}` : ""}
            </Text>
          )}
          {pub?.averageRating != null && (
            <View style={styles.rating}>
              <Ionicons name="star" size={14} color="#F59E0B" />
              <Text style={styles.ratingValue}>
                {pub.averageRating.toFixed(1)}
              </Text>
              <Text style={styles.ratingCount}>({pub.reviewCount} avis)</Text>
            </View>
          )}
        </View>

        {/* Quick share actions */}
        <View style={styles.actionRow}>
          <ShareBtn
            icon="share-social"
            label={t("doctor.profil.shareWhatsapp")}
            onPress={shareProfile}
          />
          <ShareBtn
            icon="logo-whatsapp"
            label="WhatsApp"
            tint="#25D366"
            onPress={shareWhatsApp}
          />
          <ShareBtn icon="link" label={t("doctor.profil.shareCopy")} onPress={copyLink} />
        </View>

        {/* QR Code */}
        <Card title={t("doctor.profil.qrTitle")}>
          <View style={styles.qrWrap}>
            <Image source={{ uri: qrUrl }} style={styles.qr} />
            <Text style={styles.qrHint}>
              {t("doctor.profil.qrDesc")}
            </Text>
            <Pressable onPress={copyLink} style={styles.urlPill}>
              <Ionicons name="globe-outline" size={14} color={colors.teal} />
              <Text style={styles.urlText} numberOfLines={1}>
                {publicUrl.replace("https://", "")}
              </Text>
              <Ionicons name="copy-outline" size={14} color={colors.teal} />
            </Pressable>
          </View>
        </Card>

        {/* Profile info */}
        {pub && (
          <Card title={t("doctor.profil.bioSection")}>
            {pub.bio ? (
              <Text style={styles.bio}>{pub.bio}</Text>
            ) : (
              <Text style={styles.bioEmpty}>
                {t("doctor.profil.noBio")}
              </Text>
            )}
            {pub.yearsOfExperience != null && (
              <Kv
                label={t("doctor.profil.experience")}
                value={`${pub.yearsOfExperience} an${
                  pub.yearsOfExperience > 1 ? "s" : ""
                }`}
              />
            )}
            {pub.languages && pub.languages.length > 0 && (
              <Kv label={t("doctor.profil.languages")} value={pub.languages.join(", ")} />
            )}
            {pub.expertise && pub.expertise.length > 0 && (
              <View style={{ marginTop: spacing.sm }}>
                <Text style={styles.chipLabel}>{t("doctor.profil.expertise")}</Text>
                <View style={styles.chipsWrap}>
                  {pub.expertise.map((e) => (
                    <View key={e} style={styles.chip}>
                      <Text style={styles.chipText}>{e}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </Card>
        )}

        {/* Fees */}
        {pub && (pub.consultationFee || pub.teleconsultFee) && (
          <Card title={t("doctor.profil.fees")}>
            {pub.consultationFee != null && (
              <Kv
                label={t("doctor.profil.feeCabinet")}
                value={`${(pub.consultationFee / 1000).toFixed(0)} DT`}
              />
            )}
            {pub.teleconsultFee != null && (
              <Kv
                label={t("doctor.profil.feeTeleconsult")}
                value={`${(pub.teleconsultFee / 1000).toFixed(0)} DT`}
              />
            )}
          </Card>
        )}

        <Card title={t("doctor.profil.sectionAccount")}>
          <Kv label={t("doctor.profil.email")} value={me.email} />
          <Kv label={t("doctor.profil.publicUrl")} value={`/${me.slug}`} mono />
          <Kv label={t("doctor.profil.twoFa")} value={me.totpEnabled ? t("doctor.profil.twoFaEnabled") : t("doctor.profil.twoFaDisabled")} />
          <Pressable
            onPress={() => router.push("/(doctor)/more/parametres")}
            style={styles.settingsLink}
          >
            <Ionicons name="settings" size={14} color={colors.teal} />
            <Text style={styles.settingsLinkText}>
              {t("doctor.profil.editSettings")}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.push("/(doctor)/more/signature")}
            style={styles.settingsLink}
          >
            <Ionicons name="create-outline" size={14} color={colors.teal} />
            <Text style={styles.settingsLinkText}>
              {t("doctor.signature.section")}
            </Text>
          </Pressable>
        </Card>
      </Screen>

      {/* Edit profile modal */}
      <Modal visible={editOpen} animationType="slide" onRequestClose={() => setEditOpen(false)}>
        <View style={styles.modal}>
          <View style={styles.modalHead}>
            <Pressable onPress={() => setEditOpen(false)} style={styles.modalClose}>
              <Ionicons name="close" size={22} color={colors.foreground} />
            </Pressable>
            <Text style={styles.modalTitle}>{t("doctor.profil.editProfile")}</Text>
            <Pressable
              onPress={saveProfile}
              disabled={saving}
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            >
              <Text style={styles.saveBtnText}>{saving ? "…" : t("common.save")}</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={styles.fieldLabel}>{t("doctor.profil.fullName")}</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder={t("doctor.profil.fullNamePlaceholder")}
              placeholderTextColor={colors.foregroundSecondary}
              style={styles.input}
              autoCapitalize="words"
            />

            <Text style={styles.fieldLabel}>{t("doctor.profil.bio")}</Text>
            <TextInput
              value={editBio}
              onChangeText={setEditBio}
              placeholder={t("doctor.profil.bioPlaceholder")}
              placeholderTextColor={colors.foregroundSecondary}
              multiline
              numberOfLines={4}
              style={[styles.input, styles.inputMulti]}
            />

            <Text style={styles.fieldLabel}>{t("doctor.profil.cabinetFee")}</Text>
            <TextInput
              value={editFee}
              onChangeText={setEditFee}
              placeholder={t("doctor.profil.cabinetFeePlaceholder")}
              placeholderTextColor={colors.foregroundSecondary}
              keyboardType="number-pad"
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>{t("doctor.profil.teleconsultFee")}</Text>
            <TextInput
              value={editTeleFee}
              onChangeText={setEditTeleFee}
              placeholder={t("doctor.profil.teleconsultFeePlaceholder")}
              placeholderTextColor={colors.foregroundSecondary}
              keyboardType="number-pad"
              style={styles.input}
            />

            <Text style={styles.fieldLabel}>{t("doctor.profil.consultMode")}</Text>
            <View style={styles.modeGrid}>
              {(["cabinet", "teleconsult", "both", "home"] as const).map((m) => {
                const labels: Record<string, string> = {
                  cabinet: t("doctor.profil.modeCabinet"),
                  teleconsult: t("doctor.profil.modeTeleconsult"),
                  both: t("doctor.profil.modeBoth"),
                  home: t("doctor.profil.modeDomicile"),
                };
                return (
                  <Pressable
                    key={m}
                    onPress={() => setEditMode(m)}
                    style={[styles.modeBtn, editMode === m && styles.modeBtnActive]}
                  >
                    <Text style={[styles.modeBtnText, editMode === m && { color: "#FFFFFF" }]}>
                      {labels[m]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

function ShareBtn({
  icon,
  label,
  onPress,
  tint,
}: {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  tint?: string;
}) {
  const color = tint ?? colors.teal;
  return (
    <Pressable onPress={onPress} style={styles.shareBtn}>
      <View style={[styles.shareIcon, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.shareLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.bgSecondary,
  },
  avatarPlaceholder: { alignItems: "center", justifyContent: "center" },
  avatarInitials: { fontSize: 32, fontWeight: "800", color: colors.teal },
  name: { fontSize: 20, fontWeight: "800", color: colors.foreground },
  specialty: { fontSize: 13, color: colors.foregroundSecondary },
  rating: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.xs,
  },
  ratingValue: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  ratingCount: { fontSize: 12, color: colors.foregroundSecondary },

  actionRow: { flexDirection: "row", gap: spacing.sm },
  shareBtn: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    alignItems: "center",
    gap: spacing.xs,
  },
  shareIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  shareLabel: { fontSize: 11, fontWeight: "700", color: colors.foreground },

  qrWrap: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm },
  qr: {
    width: 180,
    height: 180,
    borderRadius: radii.md,
    backgroundColor: "#FFFFFF",
  },
  qrHint: {
    fontSize: 11,
    color: colors.foregroundSecondary,
    textAlign: "center",
    maxWidth: 260,
  },
  urlPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: colors.bgSecondary,
    maxWidth: "100%",
  },
  urlText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.teal,
    flexShrink: 1,
  },

  bio: {
    fontSize: 13,
    color: colors.foreground,
    lineHeight: 18,
    marginBottom: spacing.sm,
  },
  bioEmpty: {
    fontSize: 12,
    color: colors.foregroundSecondary,
    fontStyle: "italic",
    marginBottom: spacing.sm,
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.full,
    backgroundColor: colors.bgSecondary,
  },
  chipText: { fontSize: 11, color: colors.foreground, fontWeight: "600" },

  settingsLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: spacing.sm,
  },
  settingsLinkText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.teal,
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
    fontSize: 17,
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
  inputMulti: { minHeight: 100, textAlignVertical: "top" },
  modeGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  modeBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSecondary,
  },
  modeBtnActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  modeBtnText: { fontSize: 13, fontWeight: "600", color: colors.foreground },
});
