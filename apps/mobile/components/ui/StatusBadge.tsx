import { View, Text, StyleSheet } from "react-native";
import { radius } from "@/lib/theme";

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string; dot: string }> = {
  pending:   { bg: "#FEF3C7", text: "#92400E", label: "En attente",  dot: "#F59E0B" },
  confirmed: { bg: "#DBEAFE", text: "#1E40AF", label: "Confirmé",   dot: "#3B82F6" },
  completed: { bg: "#DCFCE7", text: "#166534", label: "Terminé",    dot: "#22C55E" },
  cancelled: { bg: "#FEE2E2", text: "#991B1B", label: "Annulé",     dot: "#EF4444" },
  no_show:   { bg: "#F1F5F9", text: "#475569", label: "Absent",     dot: "#94A3B8" },
};

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { bg: "#F1F5F9", text: "#475569", label: status, dot: "#94A3B8" };
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <View style={[styles.dot, { backgroundColor: s.dot }]} />
      <Text style={[styles.text, { color: s.text }]}>{s.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full },
  dot: { width: 6, height: 6, borderRadius: 3 },
  text: { fontSize: 12, fontWeight: "600" },
});
