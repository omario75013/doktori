import { View, Text, StyleSheet } from "react-native";
import { colors, spacing } from "@/lib/theme";
import { Button } from "./Button";

type Props = { icon: string; title: string; description?: string; ctaTitle?: string; onCta?: () => void };

export function EmptyState({ icon, title, description, ctaTitle, onCta }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.desc}>{description}</Text> : null}
      {ctaTitle && onCta ? <Button title={ctaTitle} onPress={onCta} style={{ marginTop: spacing.md }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 18, fontWeight: "700", color: colors.ink, textAlign: "center" },
  desc: { fontSize: 14, color: colors.slate500, textAlign: "center", marginTop: 8, lineHeight: 20 },
});
