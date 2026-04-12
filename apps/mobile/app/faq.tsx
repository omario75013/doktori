import { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { Stack } from "expo-router";
import { ChevronDown, ChevronUp, HelpCircle, MessageSquare, Phone, Calendar, Shield, CreditCard } from "lucide-react-native";
import { colors, spacing, radius, shadow } from "@/lib/theme";

type FaqItem = { q: string; a: string; icon: any; color: string };

const FAQ_SECTIONS: { title: string; items: FaqItem[] }[] = [
  {
    title: "Rendez-vous",
    items: [
      { q: "Comment prendre rendez-vous ?", a: "Recherchez un médecin par spécialité ou nom, sélectionnez un créneau disponible et confirmez. Vous recevrez un SMS de rappel la veille.", icon: Calendar, color: colors.primary },
      { q: "Comment annuler un rendez-vous ?", a: "Allez dans l'onglet \"Mes RDV\", trouvez le rendez-vous à annuler et appuyez sur \"Annuler\". L'annulation est possible jusqu'à 2h avant le RDV.", icon: Calendar, color: colors.red },
      { q: "Qu'est-ce que la téléconsultation ?", a: "C'est une consultation vidéo avec votre médecin. Vous recevez un lien sécurisé avant le RDV. La vidéo s'ouvre dans votre navigateur pour une meilleure qualité.", icon: MessageSquare, color: colors.purple },
    ],
  },
  {
    title: "SOS Docteur",
    items: [
      { q: "Comment fonctionne SOS Docteur ?", a: "Remplissez le formulaire d'urgence, nous localisons les médecins disponibles autour de vous et l'un d'entre eux vous contacte en moins de 2 minutes.", icon: Phone, color: colors.red },
      { q: "SOS est-il pour les urgences vitales ?", a: "Non. Pour une urgence vitale (malaise, accident), composez le 190 (SAMU). SOS Docteur est pour les consultations urgentes non-vitales (fièvre, douleur, enfant malade).", icon: Phone, color: colors.red },
    ],
  },
  {
    title: "Compte & sécurité",
    items: [
      { q: "Comment me connecter ?", a: "Entrez votre numéro de téléphone (+216). Vous recevez un code par SMS à saisir pour accéder à votre compte. Aucun mot de passe nécessaire.", icon: Shield, color: colors.green },
      { q: "Mes données sont-elles protégées ?", a: "Oui. Vos données médicales sont chiffrées et stockées de manière sécurisée. Nous ne partageons jamais vos informations avec des tiers.", icon: Shield, color: colors.green },
    ],
  },
  {
    title: "Tarifs",
    items: [
      { q: "Doktori est-il gratuit ?", a: "Oui, 100% gratuit pour les patients. Pas de frais d'inscription, pas de frais de réservation. Les tarifs des consultations sont fixés par chaque médecin.", icon: CreditCard, color: colors.primary },
    ],
  },
];

function AccordionItem({ item, expanded, onToggle }: { item: FaqItem; expanded: boolean; onToggle: () => void }) {
  const Icon = item.icon;
  return (
    <Pressable style={[styles.item, expanded && styles.itemExpanded]} onPress={onToggle}>
      <View style={styles.itemHeader}>
        <View style={[styles.itemIcon, { backgroundColor: item.color + "15" }]}>
          <Icon size={16} color={item.color} />
        </View>
        <Text style={styles.question}>{item.q}</Text>
        {expanded ? <ChevronUp size={18} color={colors.slate400} /> : <ChevronDown size={18} color={colors.slate400} />}
      </View>
      {expanded && <Text style={styles.answer}>{item.a}</Text>}
    </Pressable>
  );
}

export default function FaqScreen() {
  const [openIndex, setOpenIndex] = useState<string | null>(null);

  function toggle(key: string) {
    setOpenIndex(openIndex === key ? null : key);
  }

  return (
    <>
      <Stack.Screen options={{ title: "Aide & FAQ" }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={[styles.headerIcon, shadow.md]}>
            <HelpCircle size={28} color={colors.primary} />
          </View>
          <Text style={styles.title}>Comment pouvons-nous vous aider ?</Text>
          <Text style={styles.subtitle}>Trouvez des réponses aux questions les plus fréquentes</Text>
        </View>

        {FAQ_SECTIONS.map((section, si) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={[styles.sectionCard, shadow.sm]}>
              {section.items.map((item, ii) => {
                const key = `${si}-${ii}`;
                return (
                  <AccordionItem
                    key={key}
                    item={item}
                    expanded={openIndex === key}
                    onToggle={() => toggle(key)}
                  />
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { paddingBottom: spacing.xxl },
  header: { alignItems: "center", paddingVertical: spacing.xl, paddingHorizontal: spacing.md },
  headerIcon: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: colors.primaryFaint,
    alignItems: "center", justifyContent: "center", marginBottom: spacing.md,
  },
  title: { fontSize: 22, fontWeight: "800", color: colors.ink, textAlign: "center", letterSpacing: -0.3 },
  subtitle: { fontSize: 14, color: colors.slate500, textAlign: "center", marginTop: 4 },
  section: { paddingHorizontal: spacing.md, marginBottom: spacing.md },
  sectionTitle: {
    fontSize: 13, fontWeight: "700", color: colors.slate400,
    textTransform: "uppercase", letterSpacing: 0.8, marginBottom: spacing.sm,
  },
  sectionCard: {
    backgroundColor: colors.white, borderRadius: radius.lg,
    borderWidth: 1, borderColor: colors.border, overflow: "hidden",
  },
  item: { borderBottomWidth: 1, borderBottomColor: colors.border },
  itemExpanded: { backgroundColor: colors.primaryFaint },
  itemHeader: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    padding: spacing.md,
  },
  itemIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  question: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.ink, lineHeight: 20 },
  answer: {
    fontSize: 14, color: colors.slate500, lineHeight: 21,
    paddingHorizontal: spacing.md, paddingBottom: spacing.md,
    paddingLeft: spacing.md + 32 + spacing.sm,
  },
});
