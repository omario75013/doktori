import { View, Text, ScrollView, StyleSheet, Pressable } from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, t } from "@doktori/mobile-core";

function Section({ title, children }: { title: string; children: string }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <Text style={s.body}>{children}</Text>
    </View>
  );
}

export default function ConditionsScreen() {
  return (
    <>
      <Stack.Screen
        options={{
          title: t("doctor.conditions.title"),
          headerLeft: () => (
            <Pressable onPress={() => router.back()} hitSlop={10} style={{ paddingHorizontal: spacing.sm }}>
              <Ionicons name="chevron-back" size={24} color={colors.foreground} />
            </Pressable>
          ),
        }}
      />
      <ScrollView style={s.root} contentContainerStyle={s.content}>
        <View style={s.header}>
          <Text style={s.title}>{t("doctor.conditions.docTitle")}</Text>
          <Text style={s.updated}>{t("doctor.conditions.updated")}</Text>
        </View>

        <Section title="1. Acceptation des conditions">
          En accédant à l'application Doktori et en l'utilisant, vous acceptez d'être lié par les présentes conditions générales d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser l'application.
        </Section>

        <Section title="2. Description du service">
          Doktori est une plateforme de gestion médicale qui permet aux professionnels de santé de gérer leurs rendez-vous, de communiquer avec leurs équipes et d'assurer le suivi de leurs patients. Le service est destiné exclusivement aux professionnels de santé agréés et à leur personnel administratif en Tunisie.
        </Section>

        <Section title="3. Conditions d'accès">
          L'utilisation de Doktori est réservée aux médecins légalement habilités à exercer en Tunisie et à leur personnel (secrétaires, assistants). Tout utilisateur doit fournir des informations exactes lors de l'inscription et maintenir la confidentialité de ses identifiants de connexion.
        </Section>

        <Section title="4. Obligations de l'utilisateur">
          L'utilisateur s'engage à : utiliser l'application conformément à la réglementation tunisienne en matière de santé ; ne pas divulguer les données des patients à des tiers non autorisés ; signaler immédiatement toute violation de sécurité ou utilisation non autorisée de son compte ; respecter le secret médical et la confidentialité des données personnelles.
        </Section>

        <Section title="5. Données médicales et confidentialité">
          Les données médicales traitées via Doktori sont soumises aux dispositions de la loi tunisienne n°2004-63 du 27 juillet 2004 relative à la protection des données à caractère personnel. Doktori s'engage à mettre en œuvre les mesures techniques et organisationnelles appropriées pour protéger ces données.
        </Section>

        <Section title="6. Propriété intellectuelle">
          L'application Doktori, son contenu, ses fonctionnalités et son design sont protégés par les droits de propriété intellectuelle. Toute reproduction, modification ou distribution sans autorisation écrite préalable de RandomWalkers est strictement interdite.
        </Section>

        <Section title="7. Limitation de responsabilité">
          Doktori est un outil d'aide à la gestion et ne remplace pas le jugement médical professionnel. La société RandomWalkers ne peut être tenue responsable des décisions médicales prises par les utilisateurs, ni des interruptions de service liées à des causes indépendantes de sa volonté (force majeure, pannes réseau, etc.).
        </Section>

        <Section title="8. Modifications des conditions">
          RandomWalkers se réserve le droit de modifier les présentes conditions à tout moment. Les utilisateurs seront notifiés de toute modification substantielle via l'application. La poursuite de l'utilisation de l'application après notification vaut acceptation des nouvelles conditions.
        </Section>

        <Section title="9. Droit applicable et juridiction">
          Les présentes conditions sont régies par le droit tunisien. Tout litige relatif à leur interprétation ou exécution sera soumis aux tribunaux compétents de Tunis, Tunisie.
        </Section>

        <Section title="10. Contact">
          Pour toute question relative aux présentes conditions, vous pouvez nous contacter à l'adresse suivante : legal@doktori.tn ou par courrier à RandomWalkers, Tunis, Tunisie.
        </Section>

        <Text style={s.footer}>© {new Date().getFullYear()} RandomWalkers — Doktori</Text>
      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.lg, paddingBottom: spacing["3xl"] },
  header: {
    backgroundColor: colors.bgSecondary, borderRadius: radii.lg,
    borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.xs,
  },
  title: { fontSize: 18, fontWeight: "800", color: colors.foreground },
  updated: { fontSize: 12, color: colors.foregroundSecondary },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  body: { fontSize: 13, color: colors.foreground, lineHeight: 21 },
  footer: { textAlign: "center", fontSize: 11, color: colors.border, marginTop: spacing.md },
});
