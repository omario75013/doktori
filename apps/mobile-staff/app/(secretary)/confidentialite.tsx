import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii } from "@doktori/mobile-core";

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <Text style={s.body}>{children}</Text>
    </View>
  );
}

export default function ConfidentialiteScreen() {
  return (
    <SafeAreaView edges={["top"]} style={s.root}>
      <View style={s.header}>
        <Pressable onPress={() => router.navigate("/(secretary)/parametres" as never)} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}>
          <Ionicons name="arrow-back" size={22} color={colors.foreground} />
        </Pressable>
        <Text style={s.title}>Politique de confidentialité</Text>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <View style={s.headerCard}>
          <Text style={s.cardTitle}>Politique de confidentialité</Text>
          <Text style={s.updated}>Dernière mise à jour : 1er janvier 2026</Text>
        </View>

        <Section title="1. Responsable du traitement">
          Le responsable du traitement des données est la société RandomWalkers, éditrice de l'application Doktori, dont le siège social est établi à Tunis, Tunisie. Contact : privacy@doktori.tn.
        </Section>

        <Section title="2. Données collectées">
          Dans le cadre de l'utilisation de Doktori, nous collectons : les informations d'identification professionnelles (nom, prénom, spécialité) ; les données de contact (email, téléphone) ; les informations relatives aux patients (dans le cadre de la relation médicale) ; les données d'utilisation de l'application (logs, actions) ; les données techniques (adresse IP, type d'appareil, version de l'OS).
        </Section>

        <Section title="3. Finalités du traitement">
          Vos données sont traitées pour : la gestion de votre compte professionnel et l'authentification ; la fourniture des fonctionnalités de gestion médicale ; l'amélioration de nos services et la détection des anomalies techniques ; le respect de nos obligations légales en matière de santé numérique.
        </Section>

        <Section title="4. Base légale du traitement">
          Le traitement de vos données repose sur : l'exécution du contrat de service conclu lors de votre inscription ; nos obligations légales conformément à la législation tunisienne sur les données de santé ; votre consentement explicite pour les traitements facultatifs.
        </Section>

        <Section title="5. Données des patients">
          Les données des patients enregistrées dans Doktori constituent des données de santé à caractère sensible. Elles sont traitées dans le strict respect du secret médical et de la loi tunisienne n°2004-63. Ces données ne sont jamais partagées avec des tiers sans consentement explicite.
        </Section>

        <Section title="6. Durée de conservation">
          Vos données professionnelles sont conservées pendant toute la durée de votre abonnement actif et 3 ans après sa résiliation. Les données médicales des patients sont conservées conformément aux durées légales applicables (10 ans minimum après le dernier acte médical).
        </Section>

        <Section title="7. Sécurité des données">
          Doktori met en œuvre des mesures de sécurité adaptées : chiffrement TLS en transit et AES-256 au repos ; authentification à deux facteurs disponible ; journalisation des accès ; hébergement sur des serveurs sécurisés. En cas de violation, nous nous engageons à vous notifier dans les délais légaux.
        </Section>

        <Section title="8. Vos droits">
          Conformément à la loi n°2004-63, vous disposez des droits suivants : droit d'accès à vos données personnelles ; droit de rectification des données inexactes ; droit à la limitation du traitement ; droit à la portabilité de vos données ; droit d'opposition au traitement. Pour exercer ces droits : privacy@doktori.tn.
        </Section>

        <Section title="9. Cookies et traceurs">
          L'application mobile Doktori n'utilise pas de cookies. Des identifiants techniques de session sont utilisés pour maintenir votre connexion. Ces identifiants sont stockés de manière sécurisée sur votre appareil.
        </Section>

        <Section title="10. Modifications">
          Nous nous réservons le droit de modifier cette politique à tout moment. La date de dernière mise à jour sera actualisée. Vous serez informé de toute modification substantielle via l'application.
        </Section>

        <Text style={s.footer}>© {new Date().getFullYear()} RandomWalkers — Doktori · privacy@doktori.tn</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.sm,
  },
  title: { fontSize: 18, fontWeight: "700", color: colors.foreground },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing["3xl"] },
  headerCard: {
    backgroundColor: colors.bgSecondary, borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.xs,
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: colors.foreground },
  updated: { fontSize: 12, color: colors.foregroundSecondary },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  body: { fontSize: 13, color: colors.foreground, lineHeight: 21 },
  footer: { textAlign: "center", fontSize: 11, color: colors.border, marginTop: spacing.md },
});
