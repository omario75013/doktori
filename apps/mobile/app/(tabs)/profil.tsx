import { View, Text, StyleSheet } from "react-native";
import { colors } from "@/lib/theme";

export default function ProfilScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Profil — à venir</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.bg },
  text: { fontSize: 16, color: colors.slate500 },
});
