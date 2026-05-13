import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Alert,
  Image,
  TextInput,
  ScrollView,
  PanResponder,
  type GestureResponderEvent,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Path, Text as SvgText, G } from "react-native-svg";
import { colors, spacing, radii, api, t } from "@doktori/mobile-core";
import { Screen, Card, Loader } from "./_ui";

// Doctor signature editor — two modes:
//   1) "Dessiner" — finger-drawn strokes captured via PanResponder,
//      rendered with react-native-svg <Path>. On save the SVG XML is
//      built client-side and uploaded as image/svg+xml.
//   2) "Galerie" — type doctor's name, pick one of 8 styled previews,
//      build an SVG <text> + decorator and upload.
//
// We stick to SVG (no PNG rasterization) to avoid adding any native
// dependency that would break Expo Go. The /api/doctor/signature route
// accepts image/svg+xml uploads and stores them on R2 alongside the
// PNG signatures created from the web app.

type SigState = { signatureUrl: string | null };

type LineStyle = "solid" | "dashed" | "dotted";

const SVG_W = 320;
const SVG_H = 160;

type Stroke = { d: string; style: LineStyle };

export default function SignatureScreen() {
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState<string | null>(null);
  const [tab, setTab] = useState<"draw" | "gallery">("draw");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await api<SigState>("/api/doctor/signature");
        setCurrent(r.signatureUrl ?? null);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function uploadSvg(svg: string) {
    setSaving(true);
    try {
      const fd = new FormData();
      // React Native FormData accepts {uri,name,type} but we have raw
      // text; wrap it in a Blob so the server sees a real File.
      const blob = new Blob([svg], { type: "image/svg+xml" });
      // Some RN versions don't support File constructor — pass blob
      // with filename via the 3rd arg.
      (fd as unknown as { append: (k: string, v: Blob, f: string) => void })
        .append("file", blob, "signature.svg");
      const res = await api<{ signatureUrl: string }>(
        "/api/doctor/signature",
        { method: "POST", body: fd }
      );
      setCurrent(res.signatureUrl);
      Alert.alert(t("common.ok"), t("doctor.signature.saved"));
    } catch (e) {
      Alert.alert(
        t("common.error"),
        e instanceof Error ? e.message : t("doctor.signature.saveError")
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteSig() {
    Alert.alert(
      t("doctor.signature.title"),
      t("doctor.signature.deleteConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("doctor.signature.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await api("/api/doctor/signature", { method: "DELETE" });
              setCurrent(null);
              Alert.alert(t("common.ok"), t("doctor.signature.deleted"));
            } catch (e) {
              Alert.alert(
                t("common.error"),
                e instanceof Error ? e.message : t("doctor.signature.saveError")
              );
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ title: t("doctor.signature.title") }} />
        <Loader />
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: t("doctor.signature.title") }} />
      <Screen>
        <Card title={t("doctor.signature.current")}>
          {current ? (
            <View style={styles.currentWrap}>
              <Image
                source={{ uri: current }}
                style={styles.currentImage}
                resizeMode="contain"
              />
              <Pressable onPress={deleteSig} style={styles.deleteBtn}>
                <Ionicons name="trash-outline" size={14} color="#DC2626" />
                <Text style={styles.deleteBtnText}>
                  {t("doctor.signature.delete")}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Text style={styles.empty}>{t("doctor.signature.none")}</Text>
          )}
          <Text style={styles.intro}>{t("doctor.signature.intro")}</Text>
        </Card>

        <View style={styles.tabs}>
          <TabBtn
            active={tab === "draw"}
            label={t("doctor.signature.drawTab")}
            icon="brush"
            onPress={() => setTab("draw")}
          />
          <TabBtn
            active={tab === "gallery"}
            label={t("doctor.signature.galleryTab")}
            icon="text"
            onPress={() => setTab("gallery")}
          />
        </View>

        {tab === "draw" ? (
          <DrawPad onSave={uploadSvg} saving={saving} />
        ) : (
          <GalleryPicker onSave={uploadSvg} saving={saving} />
        )}
      </Screen>
    </>
  );
}

function TabBtn({
  active,
  label,
  icon,
  onPress,
}: {
  active: boolean;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tab, active && styles.tabActive]}
    >
      <Ionicons
        name={icon}
        size={14}
        color={active ? "#FFFFFF" : colors.foreground}
      />
      <Text style={[styles.tabText, active && { color: "#FFFFFF" }]}>
        {label}
      </Text>
    </Pressable>
  );
}

// --- Draw pad ----------------------------------------------------------

function DrawPad({
  onSave,
  saving,
}: {
  onSave: (svg: string) => void;
  saving: boolean;
}) {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [current, setCurrent] = useState<string>("");
  const [lineStyle, setLineStyle] = useState<LineStyle>("solid");
  const padOriginRef = useRef<{ x: number; y: number } | null>(null);
  const padRef = useRef<View | null>(null);

  function localXY(e: GestureResponderEvent) {
    // PageX/pageY minus the pad's measured top-left → SVG coords.
    const origin = padOriginRef.current;
    if (!origin) {
      return { x: e.nativeEvent.locationX, y: e.nativeEvent.locationY };
    }
    return {
      x: e.nativeEvent.pageX - origin.x,
      y: e.nativeEvent.pageY - origin.y,
    };
  }

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => {
        const p = localXY(e);
        setCurrent(`M${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
      },
      onPanResponderMove: (e) => {
        const p = localXY(e);
        setCurrent((d) => `${d} L${p.x.toFixed(1)} ${p.y.toFixed(1)}`);
      },
      onPanResponderRelease: () => {
        setCurrent((d) => {
          if (d) {
            setStrokes((s) => [...s, { d, style: lineStyle }]);
          }
          return "";
        });
      },
      onPanResponderTerminate: () => {
        setCurrent("");
      },
    })
  ).current;

  function clear() {
    setStrokes([]);
    setCurrent("");
  }

  function buildSvg(): string {
    const all = [...strokes];
    if (current) all.push({ d: current, style: lineStyle });
    const paths = all
      .map((s) => {
        const dash =
          s.style === "dashed"
            ? ' stroke-dasharray="8 5"'
            : s.style === "dotted"
              ? ' stroke-dasharray="1 4"'
              : "";
        return `<path d="${s.d}" stroke="#0F172A" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"${dash}/>`;
      })
      .join("");
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_W} ${SVG_H}" width="${SVG_W}" height="${SVG_H}">${paths}</svg>`;
  }

  function save() {
    if (strokes.length === 0 && !current) {
      Alert.alert(t("common.error"), t("doctor.signature.empty"));
      return;
    }
    onSave(buildSvg());
  }

  function measure() {
    padRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
      padOriginRef.current = { x: pageX, y: pageY };
    });
  }

  return (
    <Card>
      <Text style={styles.hint}>{t("doctor.signature.drawHint")}</Text>

      <View style={styles.lineStyleRow}>
        <Text style={styles.fieldLabel}>
          {t("doctor.signature.lineStyle")}
        </Text>
        {(
          [
            { id: "solid", label: t("doctor.signature.lineSolid") },
            { id: "dashed", label: t("doctor.signature.lineDashed") },
            { id: "dotted", label: t("doctor.signature.lineDotted") },
          ] as const
        ).map((opt) => (
          <Pressable
            key={opt.id}
            onPress={() => setLineStyle(opt.id)}
            style={[
              styles.styleChip,
              lineStyle === opt.id && styles.styleChipActive,
            ]}
          >
            <Text
              style={[
                styles.styleChipText,
                lineStyle === opt.id && { color: "#FFFFFF" },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View
        ref={padRef}
        onLayout={measure}
        style={styles.pad}
        {...responder.panHandlers}
      >
        <Svg width="100%" height={SVG_H} viewBox={`0 0 ${SVG_W} ${SVG_H}`}>
          {strokes.map((s, i) => (
            <Path
              key={i}
              d={s.d}
              stroke="#0F172A"
              strokeWidth={2.2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={
                s.style === "dashed"
                  ? "8 5"
                  : s.style === "dotted"
                    ? "1 4"
                    : undefined
              }
            />
          ))}
          {current ? (
            <Path
              d={current}
              stroke="#0F172A"
              strokeWidth={2.2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={
                lineStyle === "dashed"
                  ? "8 5"
                  : lineStyle === "dotted"
                    ? "1 4"
                    : undefined
              }
            />
          ) : null}
        </Svg>
      </View>

      <View style={styles.btnRow}>
        <Pressable onPress={clear} style={styles.secondaryBtn}>
          <Ionicons
            name="trash-outline"
            size={14}
            color={colors.foreground}
          />
          <Text style={styles.secondaryBtnText}>
            {t("doctor.signature.clear")}
          </Text>
        </Pressable>
        <Pressable
          onPress={save}
          disabled={saving}
          style={[styles.primaryBtn, saving && { opacity: 0.6 }]}
        >
          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          <Text style={styles.primaryBtnText}>
            {saving ? "…" : t("doctor.signature.save")}
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

// --- Gallery -----------------------------------------------------------

type StyleSpec = {
  id: string;
  label: string;
  // SVG font-family stack (uses fonts available in browser; mobile
  // preview uses system fallback but final SVG renders correctly when
  // <img> loads it on the web).
  fontFamily: string;
  fontStyle?: "italic" | "normal";
  fontWeight?: string;
  // Decorator path drawn under the text.
  decorator?:
    | "underline"
    | "double"
    | "wave"
    | "swoosh"
    | "loop"
    | "paraph"
    | "none";
};

const GALLERY: StyleSpec[] = [
  {
    id: "classic",
    label: "styleClassic",
    fontFamily: "Times New Roman, serif",
    decorator: "none",
  },
  {
    id: "script",
    label: "styleScript",
    fontFamily: "Snell Roundhand, Brush Script MT, cursive",
    fontStyle: "italic",
    decorator: "underline",
  },
  {
    id: "italic",
    label: "styleItalic",
    fontFamily: "Georgia, serif",
    fontStyle: "italic",
    decorator: "none",
  },
  {
    id: "bold",
    label: "styleBold",
    fontFamily: "Helvetica, sans-serif",
    fontWeight: "700",
    decorator: "underline",
  },
  {
    id: "underline",
    label: "styleUnderline",
    fontFamily: "Georgia, serif",
    decorator: "double",
  },
  {
    id: "swoosh",
    label: "styleSwoosh",
    fontFamily: "Snell Roundhand, cursive",
    fontStyle: "italic",
    decorator: "swoosh",
  },
  {
    id: "loop",
    label: "styleLoop",
    fontFamily: "Snell Roundhand, cursive",
    fontStyle: "italic",
    decorator: "loop",
  },
  {
    id: "paraph",
    label: "styleDouble",
    fontFamily: "Brush Script MT, cursive",
    fontStyle: "italic",
    decorator: "paraph",
  },
];

function decoratorPath(kind: StyleSpec["decorator"]): string {
  const baseY = 100; // baseline reference for our 320x160 box
  const left = 40;
  const right = 280;
  const mid = (left + right) / 2;
  switch (kind) {
    case "underline":
      return `<path d="M${left} ${baseY + 12} Q${mid} ${baseY + 16} ${right} ${baseY + 10}" stroke="#0F172A" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
    case "double":
      return `<path d="M${left} ${baseY + 12} Q${mid} ${baseY + 14} ${right} ${baseY + 10}" stroke="#0F172A" stroke-width="1.8" fill="none" stroke-linecap="round"/><path d="M${left} ${baseY + 18} Q${mid} ${baseY + 20} ${right} ${baseY + 16}" stroke="#0F172A" stroke-width="1.4" fill="none" stroke-linecap="round"/>`;
    case "wave": {
      let d = `M${left} ${baseY + 14}`;
      const segs = 6;
      const step = (right - left) / segs;
      for (let i = 0; i < segs; i++) {
        const x1 = left + step * (i + 0.5);
        const x2 = left + step * (i + 1);
        const dir = i % 2 === 0 ? -1 : 1;
        d += ` Q${x1} ${baseY + 14 + 5 * dir} ${x2} ${baseY + 14}`;
      }
      return `<path d="${d}" stroke="#0F172A" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    }
    case "swoosh":
      return `<path d="M${left - 6} ${baseY + 18} C${left + 80} ${baseY + 30}, ${right - 20} ${baseY - 14}, ${right + 18} ${baseY - 6}" stroke="#0F172A" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
    case "loop": {
      const cx = right + 12;
      const cy = baseY - 4;
      const r = 16;
      return `<path d="M${right} ${baseY} C${right + 4} ${baseY}, ${cx - r} ${cy + r}, ${cx} ${cy} C${cx + r} ${cy - r}, ${cx - r} ${cy - r}, ${cx - r * 0.4} ${cy + r * 0.4}" stroke="#0F172A" stroke-width="2.2" fill="none" stroke-linecap="round"/>`;
    }
    case "paraph":
      return `<path d="M${left - 8} ${baseY + 8} C${left + 50} ${baseY + 18}, ${right - 50} ${baseY - 2}, ${right + 8} ${baseY + 8} C${right + 28} ${baseY + 20}, ${right + 10} ${baseY - 10}, ${right} ${baseY + 2}" stroke="#0F172A" stroke-width="2" fill="none" stroke-linecap="round"/>`;
    default:
      return "";
  }
}

function GalleryPicker({
  onSave,
  saving,
}: {
  onSave: (svg: string) => void;
  saving: boolean;
}) {
  const [name, setName] = useState("");
  const [picked, setPicked] = useState<string>(GALLERY[0].id);

  useEffect(() => {
    (async () => {
      try {
        const me = await api<{ name: string }>("/api/doctor/me");
        if (me?.name) setName(me.name);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const chosen = GALLERY.find((g) => g.id === picked) ?? GALLERY[0];

  function buildSvg(spec: StyleSpec, value: string): string {
    const safe = value.replace(/[<>&"']/g, (c) => {
      const m: Record<string, string> = {
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      };
      return m[c]!;
    });
    const fontStyle = spec.fontStyle ?? "normal";
    const fontWeight = spec.fontWeight ?? "400";
    return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SVG_W} ${SVG_H}" width="${SVG_W}" height="${SVG_H}"><text x="${SVG_W / 2}" y="100" text-anchor="middle" font-family="${spec.fontFamily}" font-style="${fontStyle}" font-weight="${fontWeight}" font-size="48" fill="#0F172A">${safe}</text>${decoratorPath(spec.decorator)}</svg>`;
  }

  function save() {
    const v = name.trim();
    if (!v) {
      Alert.alert(t("common.error"), t("doctor.signature.empty"));
      return;
    }
    onSave(buildSvg(chosen, v));
  }

  return (
    <Card>
      <Text style={styles.hint}>{t("doctor.signature.galleryHint")}</Text>
      <Text style={styles.fieldLabel}>
        {t("doctor.signature.namePlaceholder")}
      </Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={t("doctor.signature.namePlaceholder")}
        placeholderTextColor={colors.foregroundSecondary}
        style={styles.input}
        autoCapitalize="words"
      />

      {name.trim() ? (
        <ScrollView
          horizontal={false}
          style={{ marginTop: spacing.sm }}
          contentContainerStyle={styles.galleryGrid}
        >
          {GALLERY.map((spec) => (
            <GalleryTile
              key={spec.id}
              spec={spec}
              name={name.trim()}
              active={spec.id === picked}
              onPick={() => setPicked(spec.id)}
            />
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.btnRow}>
        <Pressable
          onPress={save}
          disabled={saving || !name.trim()}
          style={[
            styles.primaryBtn,
            (saving || !name.trim()) && { opacity: 0.5 },
          ]}
        >
          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          <Text style={styles.primaryBtnText}>
            {saving ? "…" : t("doctor.signature.save")}
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

function GalleryTile({
  spec,
  name,
  active,
  onPick,
}: {
  spec: StyleSpec;
  name: string;
  active: boolean;
  onPick: () => void;
}) {
  // RN <SvgText> uses the platform's font matcher — Snell Roundhand etc.
  // won't be available on Android. The preview just uses fontStyle +
  // weight so the user can distinguish tiles; the final SVG carries
  // proper web fonts and renders correctly on prescriptions.
  return (
    <Pressable
      onPress={onPick}
      style={[styles.tile, active && styles.tileActive]}
    >
      <Svg width="100%" height={70} viewBox={`0 0 ${SVG_W} ${SVG_H}`}>
        <SvgText
          x={SVG_W / 2}
          y={105}
          textAnchor="middle"
          fontSize={44}
          fontStyle={spec.fontStyle ?? "normal"}
          fontWeight={spec.fontWeight ?? "400"}
          fill="#0F172A"
        >
          {name}
        </SvgText>
        <G>
          {/* Tiny visual hint of decorator below the text */}
          <DecoratorPreview kind={spec.decorator} />
        </G>
      </Svg>
      <Text style={styles.tileLabel}>
        {t(`doctor.signature.${spec.label}`)}
      </Text>
    </Pressable>
  );
}

function DecoratorPreview({ kind }: { kind: StyleSpec["decorator"] }) {
  switch (kind) {
    case "underline":
      return (
        <Path
          d="M40 112 Q160 116 280 110"
          stroke="#0F172A"
          strokeWidth={2.2}
          fill="none"
          strokeLinecap="round"
        />
      );
    case "double":
      return (
        <>
          <Path
            d="M40 112 Q160 114 280 110"
            stroke="#0F172A"
            strokeWidth={1.8}
            fill="none"
            strokeLinecap="round"
          />
          <Path
            d="M40 118 Q160 120 280 116"
            stroke="#0F172A"
            strokeWidth={1.4}
            fill="none"
            strokeLinecap="round"
          />
        </>
      );
    case "swoosh":
      return (
        <Path
          d="M34 118 C120 130, 260 86, 298 94"
          stroke="#0F172A"
          strokeWidth={2.2}
          fill="none"
          strokeLinecap="round"
        />
      );
    case "loop":
      return (
        <Path
          d="M280 100 C284 100, 276 116, 292 96 C308 80, 276 80, 286 100"
          stroke="#0F172A"
          strokeWidth={2.2}
          fill="none"
          strokeLinecap="round"
        />
      );
    case "paraph":
      return (
        <Path
          d="M32 108 C90 118, 230 98, 288 108 C308 120, 290 90, 280 102"
          stroke="#0F172A"
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
        />
      );
    default:
      return null;
  }
}

// --- Styles ------------------------------------------------------------

const styles = StyleSheet.create({
  currentWrap: { gap: spacing.sm, alignItems: "center" },
  currentImage: {
    width: "100%",
    height: 100,
    backgroundColor: "#FFFFFF",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  empty: {
    fontSize: 12,
    fontStyle: "italic",
    color: colors.foregroundSecondary,
    paddingVertical: spacing.sm,
  },
  intro: {
    fontSize: 12,
    color: colors.foregroundSecondary,
    marginTop: spacing.sm,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: "#FEE2E2",
  },
  deleteBtnText: { fontSize: 12, fontWeight: "700", color: "#DC2626" },

  tabs: {
    flexDirection: "row",
    gap: spacing.xs,
    padding: 4,
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.full,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
  },
  tabActive: { backgroundColor: colors.teal },
  tabText: { fontSize: 13, fontWeight: "700", color: colors.foreground },

  hint: {
    fontSize: 12,
    color: colors.foregroundSecondary,
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginRight: spacing.xs,
    marginBottom: 6,
  },

  lineStyleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  styleChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  styleChipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  styleChipText: { fontSize: 11, fontWeight: "600", color: colors.foreground },

  pad: {
    width: "100%",
    height: SVG_H,
    backgroundColor: "#FFFFFF",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },

  btnRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.teal,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  secondaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.bgSecondary,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryBtnText: { fontSize: 13, fontWeight: "700", color: colors.foreground },

  input: {
    backgroundColor: colors.bgSecondary,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.foreground,
    borderWidth: 1,
    borderColor: colors.border,
  },

  galleryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  tile: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xs,
    alignItems: "center",
    gap: 4,
  },
  tileActive: {
    borderColor: colors.teal,
    borderWidth: 2,
  },
  tileLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.foregroundSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
});
