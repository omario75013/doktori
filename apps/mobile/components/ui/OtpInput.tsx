import { useRef, useState } from "react";
import { View, TextInput, StyleSheet, Animated } from "react-native";
import { colors, radius, shadow } from "@/lib/theme";

type Props = { length?: number; onComplete: (code: string) => void };

export function OtpInput({ length = 6, onComplete }: Props) {
  const [values, setValues] = useState(Array(length).fill(""));
  const refs = useRef<Array<TextInput | null>>([]);
  const scales = useRef(Array.from({ length }, () => new Animated.Value(1))).current;

  function animateBox(index: number) {
    Animated.sequence([
      Animated.spring(scales[index], { toValue: 1.1, useNativeDriver: true, speed: 50 }),
      Animated.spring(scales[index], { toValue: 1, useNativeDriver: true, speed: 50 }),
    ]).start();
  }

  function handleChange(text: string, index: number) {
    const next = [...values];
    next[index] = text.slice(-1);
    setValues(next);
    if (text) {
      animateBox(index);
      if (index < length - 1) refs.current[index + 1]?.focus();
    }
    const code = next.join("");
    if (code.length === length && next.every((v) => v)) onComplete(code);
  }

  function handleKeyPress(key: string, index: number) {
    if (key === "Backspace" && !values[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  return (
    <View style={styles.row}>
      {values.map((v, i) => (
        <Animated.View key={i} style={[{ transform: [{ scale: scales[i] }] }]}>
          <TextInput
            ref={(r) => { refs.current[i] = r; }}
            style={[styles.box, v ? styles.boxFilled : undefined, v && shadow.sm]}
            value={v}
            onChangeText={(t) => handleChange(t, i)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
            keyboardType="number-pad"
            maxLength={1}
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            selectionColor={colors.primary}
          />
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10, justifyContent: "center" },
  box: {
    width: 50,
    height: 60,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.slate200,
    backgroundColor: colors.bg,
    textAlign: "center",
    fontSize: 26,
    fontWeight: "700",
    color: colors.ink,
  },
  boxFilled: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryFaint,
  },
});
