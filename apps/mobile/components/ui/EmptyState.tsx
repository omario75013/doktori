import { View, Text, StyleSheet } from "react-native";
import { colors, spacing } from "@/lib/theme";
import { Button } from "./Button";

type Props = {
  icon: React.ReactNode;
  title: string;
  description?: string;
  ctaTitle?: string;
  onCta?: () => void;
};

export function EmptyState({ icon, title, description, ctaTitle, onCta }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.desc}>{description}</Text> : null}
      {ctaTitle && onCta ? (
        <Button title={ctaTitle} onPress={onCta} size="sm" style={{ marginTop: spacing.lg }} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  iconWrap: { marginBottom: spacing.md },
  title: { fontSize: 18, fontWeight: "700", color: colors.ink, textAlign: "center", letterSpacing: -0.2 },
  desc: { fontSize: 14, color: colors.slate500, textAlign: "center", marginTop: 8, lineHeight: 21 },
});
