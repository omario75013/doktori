import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "@doktori/mobile-core";

export default function SearchScreen() {
  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <View style={styles.content}>
        <Text style={styles.title}>Rechercher un médecin</Text>
        <Text style={styles.sub}>Liste + filtres — à construire</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, gap: spacing.sm },
  title: { fontSize: 22, fontWeight: "700", color: colors.foreground },
  sub: { fontSize: 14, color: colors.foregroundSecondary },
});
