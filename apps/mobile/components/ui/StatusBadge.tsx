import { View, Text, StyleSheet } from "react-native";
import { radius } from "@/lib/theme";

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "#FEF3C7", text: "#92400E", label: "En attente" },
  confirmed: { bg: "#DBEAFE", text: "#1E40AF", label: "Confirmé" },
  completed: { bg: "#DCFCE7", text: "#166534", label: "Terminé" },
  cancelled: { bg: "#FEE2E2", text: "#991B1B", label: "Annulé" },
  no_show: { bg: "#F1F5F9", text: "#475569", label: "Absent" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { bg: "#F1F5F9", text: "#475569", label: status };
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.text, { color: s.text }]}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.full },
  text: { fontSize: 12, fontWeight: "600" },
});
