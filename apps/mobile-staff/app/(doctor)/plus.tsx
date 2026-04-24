import { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, clearStoredToken, api } from "@doktori/mobile-core";

const ROLE_KEY = "doktori.staff.role";

type DoctorMe = { id: string; name: string; email: string; slug: string };
type DoctorPub = { photoUrl: string | null; specialty: string };

type EntryIcon = React.ComponentProps<typeof Ionicons>["name"];
type Entry = {
  label: string;
  icon: EntryIcon;
  tint?: string;
  onPress: () => void;
  description?: string;
  badge?: string;
};

export default function PlusScreen() {
  const [me, setMe] = useState<DoctorMe | null>(null);
  const [pub, setPub] = useState<DoctorPub | null>(null);

  useEffect(() => {
    api<DoctorMe>("/api/doctor/me")
      .then((m) => {
        setMe(m);
        if (m?.slug) {
          api<DoctorPub>(`/api/doctors/by-slug/${m.slug}`)
            .then(setPub)
            .catch(() => null);
        }
      })
      .catch(() => null);
  }, []);

  const initials = (me?.name ?? "Dr")
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  async function logout() {
    Alert.alert("Déconnexion", "Vous allez être déconnecté.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Se déconnecter",
        style: "destructive",
        onPress: async () => {
          await clearStoredToken();
          const SS = await import("expo-secure-store").catch(() => null);
          if (SS) await SS.deleteItemAsync(ROLE_KEY);
          router.replace("/(auth)/patient-login");
        },
      },
    ]);
  }

  async function changeRole() {
    Alert.alert(
      "Changer de rôle",
      "Vous allez retourner au choix du rôle (déconnexion).",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Continuer",
          onPress: async () => {
            await clearStoredToken();
            const SecureStore = await import("expo-secure-store").catch(() => null);
            if (SecureStore) await SecureStore.deleteItemAsync(ROLE_KEY);
            router.replace("/(auth)/role");
          },
        },
      ]
    );
  }

  const go = (path: string) => router.push(path as never);

  const groups: Array<{ title: string; entries: Entry[] }> = [
    {
      title: "Activité",
      entries: [
        {
          label: "Rendez-vous",
          icon: "calendar-number",
          description: "Tous les RDV + filtres",
          onPress: () => go("/(doctor)/more/rendez-vous"),
        },
        {
          label: "Téléconsultation",
          icon: "videocam",
          description: "Sessions vidéo à venir",
          onPress: () => go("/(doctor)/more/teleconsultation"),
        },
        {
          label: "Stats",
          icon: "stats-chart",
          description: "KPIs & performance",
          onPress: () => go("/(doctor)/more/stats"),
        },
      ],
    },
    {
      title: "Cabinet",
      entries: [
        {
          label: "Motifs",
          icon: "list",
          description: "Types de consultation",
          onPress: () => go("/(doctor)/more/motifs"),
        },
        {
          label: "Cabinets",
          icon: "business",
          description: "Lieux de consultation",
          onPress: () => go("/(doctor)/more/cabinets"),
        },
        {
          label: "Secrétaires",
          icon: "people-circle",
          description: "Gérer votre équipe",
          onPress: () => go("/(doctor)/more/secretaires"),
        },
        {
          label: "CNAM",
          icon: "document-attach",
          description: "Feuilles de soins",
          onPress: () => go("/(doctor)/more/cnam"),
        },
      ],
    },
    {
      title: "Réseau",
      entries: [
        {
          label: "Réseau confrères",
          icon: "git-network",
          description: "Connexions médecins",
          onPress: () => go("/(doctor)/more/reseau"),
        },
        {
          label: "Référencements",
          icon: "swap-horizontal",
          description: "Patients référés",
          onPress: () => go("/(doctor)/more/referencements"),
        },
        {
          label: "Parrainage",
          icon: "gift",
          description: "Code de parrainage",
          onPress: () => go("/(doctor)/more/parrainage"),
        },
      ],
    },
    {
      title: "Finances",
      entries: [
        {
          label: "Wallet",
          icon: "wallet",
          description: "Solde & transactions",
          onPress: () => go("/(doctor)/more/wallet"),
        },
        {
          label: "Factures",
          icon: "receipt",
          description: "Historique des factures",
          onPress: () => go("/(doctor)/more/factures"),
        },
        {
          label: "Abonnement",
          icon: "card",
          description: "Plan actuel & limites",
          onPress: () => go("/(doctor)/more/abonnement"),
        },
      ],
    },
    {
      title: "Compte",
      entries: [
        {
          label: "Profil",
          icon: "person",
          description: "Informations publiques",
          onPress: () => go("/(doctor)/more/profil"),
        },
        {
          label: "Paramètres",
          icon: "settings",
          description: "Notifications, 2FA, Système",
          onPress: () => go("/(doctor)/more/parametres"),
        },
        {
          label: "Se déconnecter",
          icon: "log-out",
          tint: colors.danger,
          onPress: logout,
        },
      ],
    },
  ];

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Plus</Text>
        <Text style={styles.sub}>Accéder à toutes les fonctionnalités</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Identity card */}
        <Pressable style={styles.identityCard} onPress={() => go("/(doctor)/more/profil")}>
          {pub?.photoUrl ? (
            <Image source={{ uri: pub.photoUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarInitials}>{initials}</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.identityName}>{me?.name ?? "Médecin"}</Text>
            <View style={styles.roleBadge}>
              <Ionicons name="medical-outline" size={11} color={colors.teal} />
              <Text style={styles.roleText}>Espace Médecin</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.foregroundSecondary} />
        </Pressable>

        {groups.map((g) => (
          <View key={g.title} style={{ gap: spacing.sm }}>
            <Text style={styles.groupTitle}>{g.title}</Text>
            <View style={styles.group}>
              {g.entries.map((entry, i) => (
                <EntryRow
                  key={entry.label}
                  entry={entry}
                  last={i === g.entries.length - 1}
                />
              ))}
            </View>
          </View>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

function EntryRow({ entry, last }: { entry: Entry; last: boolean }) {
  const tint = entry.tint ?? colors.teal;
  const labelColor = entry.tint ?? colors.foreground;
  return (
    <Pressable
      onPress={entry.onPress}
      style={[styles.entryRow, !last && styles.entryRowBorder]}
    >
      <View style={[styles.entryIcon, { backgroundColor: `${tint}22` }]}>
        <Ionicons name={entry.icon} size={18} color={tint} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.entryLabel, { color: labelColor }]}>{entry.label}</Text>
        {entry.description && (
          <Text style={styles.entryDesc}>{entry.description}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.foregroundSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: { padding: spacing.lg, paddingBottom: spacing.sm },
  title: { fontSize: 24, fontWeight: "800", color: colors.foreground },
  sub: { fontSize: 13, color: colors.foregroundSecondary, marginTop: 2 },

  scroll: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing["2xl"] },

  identityCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSecondary,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.bgSecondary,
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.teal,
  },
  avatarInitials: { fontSize: 18, fontWeight: "800", color: "#FFFFFF" },
  identityName: { fontSize: 16, fontWeight: "700", color: colors.foreground },
  roleBadge: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  roleText: { fontSize: 11, color: colors.teal, fontWeight: "600" },

  groupTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  group: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
    overflow: "hidden",
  },
  entryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  entryRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  entryIcon: {
    height: 36,
    width: 36,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  entryLabel: { fontSize: 14, fontWeight: "600" },
  entryDesc: { fontSize: 11, color: colors.foregroundSecondary, marginTop: 2 },

  footer: {
    textAlign: "center",
    color: colors.foregroundSecondary,
    fontSize: 11,
    marginTop: spacing.lg,
  },
});
