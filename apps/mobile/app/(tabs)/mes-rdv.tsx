import { View, Text, StyleSheet } from "react-native";

export default function MesRdvScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📅</Text>
      <Text style={styles.title}>Mes rendez-vous</Text>
      <Text style={styles.text}>
        Cette fonctionnalité arrive bientôt.{"\n"}
        En attendant, retrouvez vos RDV sur{"\n"}
        <Text style={styles.link}>doktori.tn/mes-rdv</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20, backgroundColor: "#f9fafb" },
  icon: { fontSize: 48, marginBottom: 16 },
  title: { fontSize: 24, fontWeight: "700", color: "#111827", marginBottom: 8 },
  text: { fontSize: 15, color: "#6b7280", textAlign: "center", lineHeight: 22 },
  link: { color: "#2563eb", fontWeight: "600" },
});
