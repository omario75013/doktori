import { useRef, useState } from "react";
import { View, TextInput, StyleSheet } from "react-native";
import { colors, radius } from "@/lib/theme";

type Props = { length?: number; onComplete: (code: string) => void };

export function OtpInput({ length = 6, onComplete }: Props) {
  const [values, setValues] = useState(Array(length).fill(""));
  const refs = useRef<Array<TextInput | null>>([]);

  function handleChange(text: string, index: number) {
    const next = [...values];
    next[index] = text.slice(-1);
    setValues(next);
    if (text && index < length - 1) refs.current[index + 1]?.focus();
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
        <TextInput
          key={i}
          ref={(r) => { refs.current[i] = r; }}
          style={[styles.box, v ? styles.boxFilled : undefined]}
          value={v}
          onChangeText={(t) => handleChange(t, i)}
          onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
          keyboardType="number-pad"
          maxLength={1}
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10, justifyContent: "center" },
  box: {
    width: 48, height: 56, borderRadius: radius.sm, borderWidth: 2,
    borderColor: colors.slate200, textAlign: "center", fontSize: 24,
    fontWeight: "700", color: colors.ink,
  },
  boxFilled: { borderColor: colors.primary },
});
