import { View, Pressable, StyleSheet } from "react-native";
import { Star } from "lucide-react-native";
import { colors } from "@/lib/theme";

type Props = {
  rating: number;
  size?: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
};

export function StarRating({ rating, size = 18, interactive = false, onChange }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= Math.round(rating);
        const star = (
          <Star
            key={i}
            size={size}
            color={filled ? colors.orange : colors.slate200}
            fill={filled ? colors.orange : "transparent"}
          />
        );
        if (interactive && onChange) {
          return (
            <Pressable key={i} onPress={() => onChange(i)} hitSlop={8}>
              {star}
            </Pressable>
          );
        }
        return star;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 3 },
});
