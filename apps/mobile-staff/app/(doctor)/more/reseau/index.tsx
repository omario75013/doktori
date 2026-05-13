import { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
  FlatList,
  SafeAreaView,
} from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t, useLocale } from "@doktori/mobile-core";
import { Loader, Empty } from "../_ui";

// ─── Types ────────────────────────────────────────────────────────────────────

type Connection = {
  id: string;
  doctorId: string;
  name: string;
  specialty: string;
  city: string | null;
  photoUrl: string | null;
  status: string;
};

type SearchResult = {
  id: string;
  name: string;
  specialty: string;
  city: string | null;
  photoUrl: string | null;
  averageRating?: number | null;
  reviewCount?: number | null;
};

type FullProfile = SearchResult & {
  slug?: string;
  bio?: string | null;
  consultationFee?: number | null;
  teleconsultFee?: number | null;
  yearsOfExperience?: number | null;
  languages?: string[] | null;
  expertise?: string[] | null;
  reviewCount?: number | null;
};

type SearchResponse = { hits?: SearchResult[]; doctors?: SearchResult[] };

type Tab = "mon-reseau" | "decouvrir";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseDoctors(r: SearchResponse | null | undefined): SearchResult[] {
  if (!r) return [];
  return r.hits ?? r.doctors ?? [];
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function renderStars(rating: number): string {
  const full = Math.round(rating);
  return "★".repeat(full) + "☆".repeat(Math.max(0, 5 - full));
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ photoUrl, name, size = 44 }: { photoUrl: string | null; name: string; size?: number }) {
  const initials = getInitials(name);
  const borderRadius = size / 2;
  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={[styles.avatar, { width: size, height: size, borderRadius }]}
      />
    );
  }
  return (
    <View
      style={[
        styles.avatar,
        styles.avatarPlaceholder,
        { width: size, height: size, borderRadius },
      ]}
    >
      <Text style={[styles.avatarText, { fontSize: size * 0.3 }]}>{initials}</Text>
    </View>
  );
}

// ─── Doctor Profile Modal ─────────────────────────────────────────────────────

function DoctorProfileModal({
  doctor,
  isConnected,
  onClose,
  onConnected,
}: {
  doctor: FullProfile;
  isConnected: boolean;
  onClose: () => void;
  onConnected: () => void;
}) {
  const [profile, setProfile] = useState<FullProfile>(doctor);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [connectState, setConnectState] = useState<"idle" | "sending" | "sent">(
    isConnected ? "sent" : "idle"
  );
  const [messageSending, setMessageSending] = useState(false);

  useEffect(() => {
    // Try to fetch full profile by slug if we have limited data
    if (!doctor.bio && !doctor.consultationFee) {
      setLoadingProfile(true);
      api<FullProfile>(`/api/doctor/network/connections`)
        .catch(() => null)
        .finally(() => setLoadingProfile(false));
    }
  }, [doctor.bio, doctor.consultationFee]);

  async function handleConnect() {
    if (connectState !== "idle") return;
    setConnectState("sending");
    try {
      await api("/api/doctor/network/connect", {
        method: "POST",
        body: { addresseeId: profile.id },
      });
      setConnectState("sent");
      onConnected();
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("common.error"));
      setConnectState("idle");
    }
  }

  async function handleMessage() {
    setMessageSending(true);
    try {
      const res = await api<{ id: string; conversation?: { id: string } }>(
        "/api/doctor/peer-conversations",
        { method: "POST", body: { peerId: profile.id } }
      );
      const convId = res.conversation?.id ?? res.id;
      onClose();
      router.push({
        pathname: "/(doctor)/chat/[id]",
        params: {
          id: convId,
          kind: "peer",
          peerName: profile.name,
          peerId: profile.id,
        },
      });
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : t("common.error"));
    } finally {
      setMessageSending(false);
    }
  }

  function handleRefer() {
    Alert.alert(t("doctor.reseau.comingSoon"), t("doctor.reseau.referComingSoon"));
  }

  const rating = Number(profile.averageRating ?? 0);
  const reviewCount = Number(profile.reviewCount ?? 0);

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <Pressable onPress={onClose} style={styles.modalCloseBtn} hitSlop={10}>
            <Ionicons name="close" size={20} color={colors.foreground} />
          </Pressable>
          <Text style={styles.modalHeaderTitle}>{t("doctor.reseau.doctorProfile")}</Text>
          <View style={styles.modalHeaderSpacer} />
        </View>

        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={styles.modalScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile hero */}
          <View style={styles.profileHero}>
            <Avatar photoUrl={profile.photoUrl} name={profile.name} size={72} />
            <Text style={styles.profileName}>{profile.name}</Text>
            {profile.specialty ? (
              <View style={styles.profileSpecRow}>
                <Ionicons name="medkit-outline" size={13} color={colors.teal} />
                <Text style={styles.profileSpecText}>{profile.specialty}</Text>
              </View>
            ) : null}
            {profile.city ? (
              <View style={styles.profileSpecRow}>
                <Ionicons name="location-outline" size={13} color={colors.foregroundSecondary} />
                <Text style={styles.profileCityText}>{profile.city}</Text>
              </View>
            ) : null}

            {/* Rating */}
            {rating > 0 ? (
              <View style={styles.ratingRow}>
                <Text style={styles.ratingStars}>{renderStars(rating)}</Text>
                <Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
                {reviewCount > 0 ? (
                  <Text style={styles.ratingCount}>{t("doctor.reseau.reviews", { count: reviewCount })}</Text>
                ) : null}
              </View>
            ) : null}
          </View>

          {loadingProfile && (
            <ActivityIndicator size="small" color={colors.teal} style={{ marginVertical: spacing.md }} />
          )}

          {/* Bio */}
          {profile.bio ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t("doctor.reseau.aboutSection")}</Text>
              <Text style={styles.bioText}>{profile.bio}</Text>
            </View>
          ) : null}

          {/* Info grid */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>{t("doctor.reseau.infoSection")}</Text>
            <View style={styles.infoGrid}>
              {profile.yearsOfExperience != null ? (
                <View style={styles.infoChip}>
                  <Ionicons name="time-outline" size={14} color={colors.teal} />
                  <Text style={styles.infoChipText}>{profile.yearsOfExperience} {t("doctor.reseau.yearsExp")}</Text>
                </View>
              ) : null}
              {profile.consultationFee != null ? (
                <View style={styles.infoChip}>
                  <Ionicons name="cash-outline" size={14} color={colors.teal} />
                  <Text style={styles.infoChipText}>
                    Consultation {(profile.consultationFee / 1000).toFixed(3)} DT
                  </Text>
                </View>
              ) : null}
              {profile.teleconsultFee != null ? (
                <View style={styles.infoChip}>
                  <Ionicons name="videocam-outline" size={14} color={colors.teal} />
                  <Text style={styles.infoChipText}>
                    Téléconsult {(profile.teleconsultFee / 1000).toFixed(3)} DT
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Languages */}
          {profile.languages && profile.languages.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t("doctor.reseau.languagesSection")}</Text>
              <View style={styles.tagRow}>
                {profile.languages.map((lang) => (
                  <View key={lang} style={styles.tag}>
                    <Text style={styles.tagText}>{lang}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* Expertise */}
          {profile.expertise && profile.expertise.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>{t("doctor.reseau.expertiseSection")}</Text>
              <View style={styles.tagRow}>
                {profile.expertise.map((ex) => (
                  <View key={ex} style={[styles.tag, styles.tagTeal]}>
                    <Text style={[styles.tagText, styles.tagTealText]}>{ex}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </ScrollView>

        {/* Action buttons */}
        <View style={styles.modalActions}>
          {!isConnected && (
            <Pressable
              onPress={handleConnect}
              disabled={connectState !== "idle"}
              style={[
                styles.actionBtn,
                styles.actionBtnPrimary,
                connectState !== "idle" && styles.actionBtnDisabled,
              ]}
            >
              {connectState === "sending" ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons
                    name={connectState === "sent" ? "checkmark" : "person-add-outline"}
                    size={16}
                    color="#FFFFFF"
                  />
                  <Text style={styles.actionBtnPrimaryText}>
                    {connectState === "sent" ? t("doctor.reseau.inviteSent") : t("doctor.reseau.connect")}
                  </Text>
                </>
              )}
            </Pressable>
          )}

          <Pressable
            onPress={handleMessage}
            disabled={messageSending}
            style={[styles.actionBtn, styles.actionBtnSecondary, messageSending && styles.actionBtnDisabled]}
          >
            {messageSending ? (
              <ActivityIndicator size="small" color={colors.teal} />
            ) : (
              <>
                <Ionicons name="chatbubble-outline" size={16} color={colors.teal} />
                <Text style={styles.actionBtnSecondaryText}>{t("doctor.reseau.sendMessage")}</Text>
              </>
            )}
          </Pressable>

          <Pressable onPress={handleRefer} style={[styles.actionBtn, styles.actionBtnGhost]}>
            <Ionicons name="arrow-redo-outline" size={16} color={colors.foregroundSecondary} />
            <Text style={styles.actionBtnGhostText}>{t("doctor.reseau.referPatient")}</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function Reseau() {
  const { locale } = useLocale();
  const [activeTab, setActiveTab] = useState<Tab>("mon-reseau");
  const [query, setQuery] = useState("");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pending, setPending] = useState<Connection[]>([]);
  const [discover, setDiscover] = useState<SearchResult[]>([]);
  const [me, setMe] = useState<{ id: string; slug: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState<FullProfile | null>(null);
  const [sending, setSending] = useState<string | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [pendingSentIds, setPendingSentIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const [acc, pen, meRes] = await Promise.all([
        api<Connection[]>("/api/doctor/network/connections").catch(() => []),
        api<Connection[]>("/api/doctor/network/pending").catch(() => []),
        api<{ id: string; slug: string }>("/api/doctor/me").catch(() => null),
      ]);
      setConnections(acc ?? []);
      setPending(pen ?? []);
      if (meRes) setMe(meRes);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Search for discover tab
  useEffect(() => {
    const trimmed = query.trim();
    if (activeTab !== "decouvrir") return;

    const timer = setTimeout(async () => {
      setDiscoverLoading(true);
      try {
        const searchQuery = trimmed || (me?.slug ? "" : "médecin");
        const r = await api<SearchResponse>(
          `/api/search?q=${encodeURIComponent(searchQuery || "médecin")}`
        );
        setDiscover(parseDoctors(r));
      } catch {
        // ignore
      } finally {
        setDiscoverLoading(false);
      }
    }, trimmed ? 400 : 0);

    return () => clearTimeout(timer);
  }, [query, activeTab, me?.slug]);

  const connectedIds = useMemo(() => {
    const s = new Set<string>();
    if (me?.id) s.add(me.id);
    connections.forEach((c) => s.add(c.doctorId));
    pending.forEach((p) => s.add(p.doctorId));
    return s;
  }, [me, connections, pending]);

  // Filter connections for Mon réseau tab
  const filteredConnections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return connections;
    return connections.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.specialty ?? "").toLowerCase().includes(q) ||
        (c.city ?? "").toLowerCase().includes(q)
    );
  }, [connections, query]);

  // Filter pending invites
  const filteredPending = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return pending;
    return pending.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.specialty ?? "").toLowerCase().includes(q)
    );
  }, [pending, query]);

  // Filter discover results (exclude connected/accepted, keep pending-sent so we can show "En attente")
  const filteredDiscover = useMemo(() => {
    const q = query.trim().toLowerCase();
    const results = discover.filter(
      (d) => !connectedIds.has(d.id) || pendingSentIds.has(d.id)
    );
    if (!q) return results;
    return results.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.specialty ?? "").toLowerCase().includes(q) ||
        (d.city ?? "").toLowerCase().includes(q)
    );
  }, [discover, connectedIds, pendingSentIds, query]);

  async function respond(id: string, action: "accept" | "decline") {
    setRespondingId(id);
    try {
      await api(`/api/doctor/network/connect/${id}/respond`, {
        method: "POST",
        body: { action },
      });
      await load();
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : "");
    } finally {
      setRespondingId(null);
    }
  }

  async function sendInvite(id: string) {
    setSending(id);
    try {
      await api("/api/doctor/network/connect", {
        method: "POST",
        body: { addresseeId: id },
      });
      setPendingSentIds((prev) => new Set(prev).add(id));
      await load();
    } catch (e) {
      Alert.alert(t("common.error"), e instanceof Error ? e.message : "");
    } finally {
      setSending(null);
    }
  }

  async function openDoctorProfile(doctor: SearchResult | Connection) {
    // Build a FullProfile from what we have, then try to enrich it
    const base: FullProfile = "doctorId" in doctor
      ? {
          id: doctor.doctorId,
          name: doctor.name,
          specialty: doctor.specialty,
          city: doctor.city,
          photoUrl: doctor.photoUrl,
        }
      : { ...doctor };

    setSelectedDoctor(base);

    // Try to get the full profile in the background
    try {
      // First get slug via search or connections
      const searchRes = await api<SearchResponse>(
        `/api/search?q=${encodeURIComponent(doctor.name)}`
      );
      const hits = parseDoctors(searchRes);
      const match = hits.find((h) => h.id === base.id);
      if (match) {
        setSelectedDoctor((prev) => (prev ? { ...prev, ...match } : prev));
      }
    } catch {
      // ignore, use what we have
    }
  }

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: t("doctor.reseau.title") }} />
        <Loader />
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t("doctor.reseau.title"),
          headerShadowVisible: false,
          headerRight: () => (
            <Pressable
              onPress={() => router.push("/(doctor)/more/reseau/messagerie")}
              hitSlop={10}
              style={{ paddingHorizontal: spacing.sm }}
            >
              <Ionicons name="chatbubbles-outline" size={22} color={colors.foreground} />
            </Pressable>
          ),
        }}
      />

      <View style={styles.root}>
        {/* Tab bar */}
        <View style={styles.tabBar}>
          <Pressable
            style={[styles.tab, activeTab === "mon-reseau" && styles.tabActive]}
            onPress={() => { setActiveTab("mon-reseau"); setQuery(""); }}
          >
            <Ionicons
              name="people"
              size={16}
              color={activeTab === "mon-reseau" ? "#FFFFFF" : colors.foregroundSecondary}
            />
            <Text style={[styles.tabText, activeTab === "mon-reseau" && styles.tabTextActive]}>
              {t("doctor.reseau.tabMyNetwork")}
            </Text>
            {connections.length > 0 && (
              <View style={[styles.tabBadge, activeTab === "mon-reseau" && styles.tabBadgeActive]}>
                <Text style={[styles.tabBadgeText, activeTab === "mon-reseau" && styles.tabBadgeTextActive]}>
                  {connections.length}
                </Text>
              </View>
            )}
          </Pressable>

          <Pressable
            style={[styles.tab, activeTab === "decouvrir" && styles.tabActive]}
            onPress={() => { setActiveTab("decouvrir"); setQuery(""); }}
          >
            <Ionicons
              name="compass"
              size={16}
              color={activeTab === "decouvrir" ? "#FFFFFF" : colors.foregroundSecondary}
            />
            <Text style={[styles.tabText, activeTab === "decouvrir" && styles.tabTextActive]}>
              {t("doctor.reseau.tabDiscover")}
            </Text>
          </Pressable>
        </View>

        {/* Search bar */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={colors.foregroundSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("doctor.reseau.searchPlaceholder")}
            placeholderTextColor={colors.foregroundSecondary}
            returnKeyType="search"
            style={styles.searchInput}
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={10}>
              <Ionicons name="close-circle" size={16} color={colors.foregroundSecondary} />
            </Pressable>
          )}
        </View>

        {/* Tab content */}
        {activeTab === "mon-reseau" ? (
          <MonReseauTab
            connections={filteredConnections}
            pending={filteredPending}
            respondingId={respondingId}
            onRespond={respond}
            onOpenProfile={openDoctorProfile}
          />
        ) : (
          <DecouvrirTab
            doctors={filteredDiscover}
            loading={discoverLoading}
            sending={sending}
            pendingSentIds={pendingSentIds}
            onConnect={sendInvite}
            onOpenProfile={openDoctorProfile}
          />
        )}
      </View>

      {/* Doctor profile modal */}
      {selectedDoctor && (
        <DoctorProfileModal
          doctor={selectedDoctor}
          isConnected={connectedIds.has(selectedDoctor.id)}
          onClose={() => setSelectedDoctor(null)}
          onConnected={load}
        />
      )}
    </>
  );
}

// ─── Mon Réseau Tab ───────────────────────────────────────────────────────────

function MonReseauTab({
  connections,
  pending,
  respondingId,
  onRespond,
  onOpenProfile,
}: {
  connections: Connection[];
  pending: Connection[];
  respondingId: string | null;
  onRespond: (id: string, action: "accept" | "decline") => void;
  onOpenProfile: (doctor: Connection) => void;
}) {
  if (pending.length === 0 && connections.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Empty
          icon="people-outline"
          title={t("doctor.reseau.noConnections")}
          sub={t("doctor.reseau.noConnectionsHint")}
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.tabContent}
      contentContainerStyle={styles.tabContentInner}
      showsVerticalScrollIndicator={false}
    >
      {/* Pending invites */}
      {pending.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("doctor.reseau.pendingRequests", { count: pending.length })}</Text>
          {pending.map((c) => (
            <View key={c.id} style={styles.pendingCard}>
              <Pressable
                style={styles.doctorRow}
                onPress={() => onOpenProfile(c)}
              >
                <Avatar photoUrl={c.photoUrl} name={c.name} size={44} />
                <View style={styles.doctorInfo}>
                  <Text style={styles.doctorName}>{c.name}</Text>
                  <Text style={styles.doctorSub}>
                    {c.specialty}{c.city ? ` · ${c.city}` : ""}
                  </Text>
                </View>
              </Pressable>
              <View style={styles.pendingActions}>
                <Pressable
                  onPress={() => onRespond(c.id, "accept")}
                  disabled={respondingId === c.id}
                  style={[styles.actionPill, styles.actionPillAccept]}
                >
                  {respondingId === c.id ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                      <Text style={styles.actionPillAcceptText}>{t("doctor.reseau.accept")}</Text>
                    </>
                  )}
                </Pressable>
                <Pressable
                  onPress={() => onRespond(c.id, "decline")}
                  disabled={respondingId === c.id}
                  style={[styles.actionPill, styles.actionPillDecline]}
                >
                  <Ionicons name="close" size={13} color={colors.danger} />
                  <Text style={styles.actionPillDeclineText}>{t("doctor.reseau.decline")}</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Connected doctors */}
      {connections.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>{t("doctor.reseau.myConnections", { count: connections.length })}</Text>
          {connections.map((c) => (
            <Pressable
              key={c.id}
              style={styles.connectionCard}
              onPress={() => router.push({ pathname: "/(doctor)/more/reseau/[id]", params: { id: c.doctorId } })}
            >
              <Avatar photoUrl={c.photoUrl} name={c.name} size={44} />
              <View style={styles.doctorInfo}>
                <Text style={styles.doctorName}>{c.name}</Text>
                <Text style={styles.doctorSub}>
                  {c.specialty}{c.city ? ` · ${c.city}` : ""}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.foregroundSecondary} />
            </Pressable>
          ))}
        </View>
      )}

      {connections.length === 0 && pending.length > 0 && (
        <Empty
          icon="git-network-outline"
          title={t("doctor.reseau.noConnectionsAlt")}
          sub={t("doctor.reseau.noConnectionsAltHint")}
        />
      )}
    </ScrollView>
  );
}

// ─── Découvrir Tab ────────────────────────────────────────────────────────────

function DecouvrirTab({
  doctors,
  loading,
  sending,
  pendingSentIds,
  onConnect,
  onOpenProfile,
}: {
  doctors: SearchResult[];
  loading: boolean;
  sending: string | null;
  pendingSentIds: Set<string>;
  onConnect: (id: string) => void;
  onOpenProfile: (doctor: SearchResult) => void;
}) {
  if (loading) {
    return (
      <View style={styles.emptyContainer}>
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    );
  }

  if (doctors.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Empty
          icon="compass-outline"
          title={t("doctor.reseau.noDoctors")}
          sub={t("doctor.reseau.noDoctorsHint")}
        />
      </View>
    );
  }

  return (
    <FlatList
      data={doctors}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.discoverList}
      showsVerticalScrollIndicator={false}
      renderItem={({ item: d }) => {
        const rating = Number(d.averageRating ?? 0);
        const isPending = pendingSentIds.has(d.id);
        const isSending = sending === d.id;
        return (
          <Pressable style={styles.discoverCard} onPress={() => onOpenProfile(d)}>
            <Avatar photoUrl={d.photoUrl} name={d.name} size={50} />
            <View style={styles.discoverInfo}>
              <Text style={styles.doctorName} numberOfLines={1}>{d.name}</Text>
              {d.specialty ? (
                <View style={styles.doctorSpecRow}>
                  <Ionicons name="medkit-outline" size={11} color={colors.teal} />
                  <Text style={styles.discoverSpec} numberOfLines={1}>{d.specialty}</Text>
                </View>
              ) : null}
              {d.city ? (
                <View style={styles.doctorSpecRow}>
                  <Ionicons name="location-outline" size={11} color={colors.foregroundSecondary} />
                  <Text style={styles.discoverCity} numberOfLines={1}>{d.city}</Text>
                </View>
              ) : null}
              {rating > 0 ? (
                <View style={styles.ratingInline}>
                  <Text style={styles.ratingStarsSmall}>{renderStars(rating)}</Text>
                  <Text style={styles.ratingValueSmall}>{rating.toFixed(1)}</Text>
                </View>
              ) : null}
            </View>
            {isPending ? (
              <View style={styles.pendingBtn}>
                <Ionicons name="time-outline" size={13} color={colors.foregroundSecondary} />
                <Text style={styles.pendingBtnText}>{t("doctor.reseau.pending")}</Text>
              </View>
            ) : (
              <Pressable
                onPress={() => onConnect(d.id)}
                disabled={isSending}
                style={[styles.connectBtn, isSending && { opacity: 0.6 }]}
                hitSlop={8}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="person-add" size={13} color="#FFFFFF" />
                    <Text style={styles.connectBtnText}>{t("doctor.reseau.connect")}</Text>
                  </>
                )}
              </Pressable>
            )}
          </Pressable>
        );
      }}
    />
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },

  // Tab bar
  tabBar: {
    flexDirection: "row",
    padding: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  tabActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  tabText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.foregroundSecondary,
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.bgSecondary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  tabBadgeActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.foregroundSecondary,
  },
  tabBadgeTextActive: {
    color: "#FFFFFF",
  },

  // Search bar
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.foreground,
    padding: 0,
  },

  // Tab content
  tabContent: {
    flex: 1,
  },
  tabContentInner: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing["2xl"],
  },

  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Section
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
  },

  // Avatar
  avatar: {
    backgroundColor: colors.bgSecondary,
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.tealDark,
  },
  avatarText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },

  // Doctor row shared
  doctorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  doctorInfo: {
    flex: 1,
    gap: 2,
  },
  doctorName: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.foreground,
  },
  doctorSub: {
    fontSize: 12,
    color: colors.foregroundSecondary,
  },
  doctorSpecRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },

  // Pending invites
  pendingCard: {
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    gap: spacing.sm,
  },
  pendingActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 7,
    borderRadius: radii.md,
  },
  actionPillAccept: {
    backgroundColor: colors.teal,
  },
  actionPillAcceptText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  actionPillDecline: {
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: colors.bg,
  },
  actionPillDeclineText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: "700",
  },

  // Connection card
  connectionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },

  // Discover list
  discoverList: {
    padding: spacing.md,
    gap: spacing.sm,
    paddingBottom: spacing["2xl"],
  },
  discoverCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  discoverInfo: {
    flex: 1,
    gap: 2,
  },
  discoverSpec: {
    fontSize: 11,
    color: colors.teal,
  },
  discoverCity: {
    fontSize: 11,
    color: colors.foregroundSecondary,
  },
  ratingInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 1,
  },
  ratingStarsSmall: {
    fontSize: 10,
    color: colors.amber,
  },
  ratingValueSmall: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.foreground,
  },
  connectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
  },
  connectBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  pendingBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSecondary,
  },
  pendingBtnText: {
    color: colors.foregroundSecondary,
    fontSize: 12,
    fontWeight: "600",
  },

  // Doctor Profile Modal
  modalContainer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.bgSecondary,
  },
  modalHeaderTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    color: colors.foreground,
    textAlign: "center",
  },
  modalHeaderSpacer: {
    width: 34,
  },
  modalScroll: {
    flex: 1,
  },
  modalScrollContent: {
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing["2xl"],
  },

  // Profile hero
  profileHero: {
    alignItems: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.foreground,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  profileSpecRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  profileSpecText: {
    fontSize: 14,
    color: colors.teal,
    fontWeight: "600",
  },
  profileCityText: {
    fontSize: 13,
    color: colors.foregroundSecondary,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  ratingStars: {
    fontSize: 14,
    color: colors.amber,
  },
  ratingValue: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.foreground,
  },
  ratingCount: {
    fontSize: 12,
    color: colors.foregroundSecondary,
  },

  // Bio
  bioText: {
    fontSize: 14,
    color: colors.foreground,
    lineHeight: 21,
  },

  // Info grid
  infoGrid: {
    gap: spacing.sm,
  },
  infoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoChipText: {
    fontSize: 13,
    color: colors.foreground,
    fontWeight: "600",
  },

  // Tags
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  tag: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: {
    fontSize: 12,
    color: colors.foreground,
    fontWeight: "600",
  },
  tagTeal: {
    backgroundColor: "#CFFAFE",
    borderColor: "#A5F3FC",
  },
  tagTealText: {
    color: colors.tealDark,
  },

  // Modal action buttons
  modalActions: {
    padding: spacing.md,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: 13,
    borderRadius: radii.md,
  },
  actionBtnPrimary: {
    backgroundColor: colors.teal,
  },
  actionBtnPrimaryText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  actionBtnSecondary: {
    borderWidth: 1,
    borderColor: colors.teal,
    backgroundColor: colors.bg,
  },
  actionBtnSecondaryText: {
    color: colors.teal,
    fontSize: 15,
    fontWeight: "700",
  },
  actionBtnGhost: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  actionBtnGhostText: {
    color: colors.foregroundSecondary,
    fontSize: 15,
    fontWeight: "600",
  },
  actionBtnDisabled: {
    opacity: 0.6,
  },
});
