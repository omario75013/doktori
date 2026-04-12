import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { colors } from "@/lib/theme";

type Props = { message?: string };

export function LoadingSpinner({ message }: Props) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  message: { fontSize: 14, color: colors.slate500, marginTop: 4 },
});
