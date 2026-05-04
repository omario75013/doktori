import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  Vibration,
  View,
} from "react-native";
import { router, Tabs, useSegments } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { api, colors, radii, spacing, t, useLocale } from "@doktori/mobile-core";
import {
  SecretaryQuickActions,
  iconForName,
  sendBell,
  type QuickAction,
} from "../../components/secretary-quick-actions";

type IconName = React.ComponentProps<typeof Ionicons>["name"];

function icon(name: IconName) {
  // eslint-disable-next-line react/display-name
  return ({ color, size }: { color: string; size: number }) => (
    <Ionicons name={name} color={color} size={size} />
  );
}

const HOLD_MS = 1500; // open sheet / reveal chips after this
const REVEAL_MS = 900; // chips can appear a bit earlier with drag
const CHIP_W = 84;
const CHIP_H = 60;
const CHIP_GAP = 8;

export default function DoctorLayout() {
  useLocale(); // re-render on locale change so tab labels update
  const segments = useSegments();
  const moreActive = segments.includes("more" as never);

  const [bellOpen, setBellOpen] = useState(false);

  // Drag state — shared between the custom tab button and the floating chip row.
  const [dragActive, setDragActive] = useState(false);
  const [chips, setChips] = useState<QuickAction[]>([]);
  const [selectedIdx, setSelectedIdx] = useState<number>(-1);
  const [sending, setSending] = useState(false);

  // Cached chips fetch — once loaded, reused across gestures.
  const chipsRef = useRef<QuickAction[] | null>(null);
  const chipsLoadingRef = useRef(false);

  const loadChips = useCallback(async () => {
    if (chipsRef.current || chipsLoadingRef.current) return;
    chipsLoadingRef.current = true;
    try {
      const r = await api<QuickAction[] | unknown>("/api/doctor/quick-actions");
      const list = Array.isArray(r) ? (r as QuickAction[]) : [];
      chipsRef.current = list.slice(0, 5); // cap to 5 for the radial strip
    } catch {
      chipsRef.current = [];
    } finally {
      chipsLoadingRef.current = false;
    }
  }, []);

  useEffect(() => {
    // Prefetch chips the moment the layout mounts so the first long-press is instant.
    void loadChips();
  }, [loadChips]);

  async function fireChip(chip: QuickAction) {
    setSending(true);
    try {
      await sendBell({
        label: chip.label,
        message: chip.message,
        icon: chip.icon,
        secretaryId: null, // broadcast to all active secretaries (quick-action default)
      });
      if (Platform.OS === "android") Vibration.vibrate([0, 30, 40, 30]);
    } catch {
      // silent — user can retry from the sheet
    } finally {
      setSending(false);
    }
  }

  function onChipsReveal() {
    const list = chipsRef.current ?? [];
    setChips(list);
    setDragActive(true);
    setSelectedIdx(-1);
  }

  function onChipsMove(dx: number, dy: number) {
    if (chips.length === 0) return;
    // Chips are centered above the Plus tab (right side of a 5-tab bar).
    // Treat dx as horizontal offset from the hold origin. The chip row is
    // horizontally centered on the finger's original x → map dx to an index.
    if (dy > -20) {
      // Finger came back down close to the tab → deselect.
      setSelectedIdx(-1);
      return;
    }
    const total = chips.length;
    const rowWidth = total * CHIP_W + (total - 1) * CHIP_GAP;
    const half = rowWidth / 2;
    // dx is relative to the hold origin (Plus tab center). Map [-half, +half] to [0, total-1].
    const normalized = (dx + half) / (rowWidth || 1);
    const idx = Math.max(0, Math.min(total - 1, Math.floor(normalized * total)));
    setSelectedIdx(idx);
  }

  function onChipsRelease(releasedIdx: number) {
    const chosen =
      releasedIdx >= 0 && releasedIdx < chips.length ? chips[releasedIdx] : null;
    setDragActive(false);
    setSelectedIdx(-1);
    setChips([]);
    if (chosen) void fireChip(chosen);
  }

  function openSheetFromHold() {
    setDragActive(false);
    setChips([]);
    setBellOpen(true);
  }

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.teal,
          tabBarInactiveTintColor: colors.foregroundSecondary,
          tabBarStyle: { borderTopColor: colors.border },
        }}
      >
        <Tabs.Screen
          name="home"
          options={{ title: t("doctor.tabs.home"), tabBarIcon: icon("home") }}
        />
        <Tabs.Screen
          name="calendrier"
          options={{ title: t("doctor.tabs.calendar"), tabBarIcon: icon("calendar") }}
        />
        <Tabs.Screen
          name="patients"
          options={{ title: t("doctor.tabs.patients"), tabBarIcon: icon("people") }}
        />
        <Tabs.Screen
          name="messagerie"
          options={{ title: t("doctor.tabs.messages"), tabBarIcon: icon("chatbubbles") }}
        />
        <Tabs.Screen
          name="plus"
          options={{
            title: t("doctor.tabs.more"),
            tabBarIcon: icon("grid"),
            tabBarButton: (props) => (
              <PlusTabButton
                accessibilityState={{
                  ...(props.accessibilityState as { selected?: boolean } | undefined),
                  selected:
                    (props.accessibilityState as { selected?: boolean } | undefined)?.selected ||
                    moreActive,
                }}
                onTapNavigate={() => router.push("/(doctor)/plus")}
                onHoldComplete={openSheetFromHold}
                onDragStart={onChipsReveal}
                onDragMove={onChipsMove}
                onDragEnd={onChipsRelease}
                hasChips={() => (chipsRef.current?.length ?? 0) > 0}
                selectedIdxRef={selectedIdx}
              />
            ),
          }}
        />
        {/* Hide nested stacks/routes from the tab bar — pushed via router.push. */}
        <Tabs.Screen name="more" options={{ href: null }} />
        <Tabs.Screen name="chat" options={{ href: null }} />
        <Tabs.Screen name="call" options={{ href: null }} />
      </Tabs>

      {/* Floating chip row — rendered outside the tab bar so it can overlay content. */}
      {dragActive && chips.length > 0 && (
        <ChipOverlay
          chips={chips}
          selectedIdx={selectedIdx}
          sending={sending}
        />
      )}

      <SecretaryQuickActions
        visible={bellOpen}
        onClose={() => setBellOpen(false)}
      />
    </>
  );
}

/**
 * Custom tab button for Plus.
 * - Tap (<REVEAL_MS & no drag) → navigate to Plus screen (onTapNavigate).
 * - Hold ≥REVEAL_MS without dragging → progress bar fills; at HOLD_MS the
 *   sheet opens (onHoldComplete) unless the user has already started dragging.
 * - Hold + drag upward → chips reveal (onDragStart) and chip selection updates
 *   via onDragMove(dx, dy). Release fires onDragEnd(selectedIdx).
 */
type TabBarButtonBaseProps = {
  accessibilityState?: { selected?: boolean };
};

function PlusTabButton({
  accessibilityState,
  onTapNavigate,
  onHoldComplete,
  onDragStart,
  onDragMove,
  onDragEnd,
  hasChips,
  selectedIdxRef,
}: TabBarButtonBaseProps & {
  onTapNavigate: () => void;
  onHoldComplete: () => void;
  onDragStart: () => void;
  onDragMove: (dx: number, dy: number) => void;
  onDragEnd: (selectedIdx: number) => void;
  hasChips: () => boolean;
  selectedIdxRef: number;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const anim = useRef<Animated.CompositeAnimation | null>(null);
  const [held, setHeld] = useState(false);
  const startedAt = useRef<number>(0);
  const revealedRef = useRef(false);
  const dragActiveRef = useRef(false);
  const sheetFiredRef = useRef(false);
  const lastIdxRef = useRef<number>(-1);

  // Keep a ref of the current selectedIdx prop for the release handler.
  const selectedIdxPropRef = useRef(selectedIdxRef);
  selectedIdxPropRef.current = selectedIdxRef;

  function resetProgress() {
    anim.current?.stop();
    Animated.timing(progress, {
      toValue: 0,
      duration: 140,
      useNativeDriver: false,
    }).start();
  }

  function handleSheetTimer() {
    // Called on onPressRelease before HOLD_MS reached, OR before drag.
    if (dragActiveRef.current) return;
    if (sheetFiredRef.current) return;
    sheetFiredRef.current = true;
    if (Platform.OS === "android") Vibration.vibrate(20);
    onHoldComplete();
  }

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, g) => {
        // Only capture move once the user has moved a meaningful amount —
        // otherwise let the system handle normal presses.
        return Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4;
      },
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        setHeld(true);
        startedAt.current = Date.now();
        revealedRef.current = false;
        dragActiveRef.current = false;
        sheetFiredRef.current = false;
        lastIdxRef.current = -1;
        progress.setValue(0);
        anim.current = Animated.timing(progress, {
          toValue: 1,
          duration: HOLD_MS,
          easing: Easing.linear,
          useNativeDriver: false,
        });
        anim.current.start(({ finished }) => {
          if (finished && !dragActiveRef.current && !sheetFiredRef.current) {
            sheetFiredRef.current = true;
            if (Platform.OS === "android") Vibration.vibrate(20);
            onHoldComplete();
          }
        });
      },
      onPanResponderMove: (_e, g) => {
        const elapsed = Date.now() - startedAt.current;
        // After a short hold, moving finger up reveals chips.
        if (!revealedRef.current && g.dy < -25 && elapsed > 200 && hasChips()) {
          revealedRef.current = true;
          dragActiveRef.current = true;
          anim.current?.stop();
          progress.setValue(1);
          if (Platform.OS === "android") Vibration.vibrate(15);
          onDragStart();
        }
        if (dragActiveRef.current) {
          onDragMove(g.dx, g.dy);
          lastIdxRef.current = selectedIdxPropRef.current;
        }
      },
      onPanResponderRelease: (_e, g) => {
        const elapsed = Date.now() - startedAt.current;
        setHeld(false);
        if (dragActiveRef.current) {
          // Use the most recent selectedIdx from parent (the prop updated through state).
          onDragEnd(selectedIdxPropRef.current);
          resetProgress();
          return;
        }
        if (sheetFiredRef.current) {
          // Sheet already opened via the timer finish.
          resetProgress();
          return;
        }
        // Not dragged; not held long enough → treat as a tap, unless the user
        // dragged off the tab area (dy > threshold).
        const tapLike = Math.abs(g.dx) < 12 && Math.abs(g.dy) < 20 && elapsed < HOLD_MS;
        if (tapLike) onTapNavigate();
        resetProgress();
      },
      onPanResponderTerminate: () => {
        setHeld(false);
        anim.current?.stop();
        if (dragActiveRef.current) {
          onDragEnd(-1); // cancel
        }
        resetProgress();
      },
    })
  ).current;

  const selected = accessibilityState?.selected ?? false;

  return (
    <View style={styles.tabBtn} {...panResponder.panHandlers}>
      <View style={styles.tabContent}>
        <Ionicons
          name="grid"
          size={24}
          color={selected ? colors.teal : colors.foregroundSecondary}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: selected ? colors.teal : colors.foregroundSecondary },
          ]}
          numberOfLines={1}
        >
          {t("doctor.tabs.more")}
        </Text>
      </View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.progressBar,
          {
            opacity: progress.interpolate({
              inputRange: [0, 0.05, 1],
              outputRange: [0, 1, 1],
            }),
            transform: [{ scaleX: progress }],
          },
        ]}
      />
      {held && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.hintDot,
            {
              opacity: progress.interpolate({
                inputRange: [0, 0.2, 1],
                outputRange: [0, 1, 1],
              }),
            },
          ]}
        >
          <View style={styles.hintInner}>
            <Ionicons name="notifications" size={10} color="#FFFFFF" />
          </View>
        </Animated.View>
      )}
    </View>
  );
}

/**
 * Floating chip strip. Rendered above the tab bar during a drag gesture.
 * Selection is driven entirely by the parent's selectedIdx state; this
 * component is purely visual.
 */
function ChipOverlay({
  chips,
  selectedIdx,
  sending,
}: {
  chips: QuickAction[];
  selectedIdx: number;
  sending: boolean;
}) {
  const { width } = Dimensions.get("window");
  // The Plus tab is the 5th of 5 tabs in the doctor layout.
  const tabWidth = width / 5;
  const plusCenterX = tabWidth * 4.5;
  const rowWidth = chips.length * CHIP_W + (chips.length - 1) * CHIP_GAP;
  const startX = Math.max(
    spacing.md,
    Math.min(width - rowWidth - spacing.md, plusCenterX - rowWidth / 2)
  );

  return (
    <View pointerEvents="none" style={[styles.overlay, { left: startX, bottom: 70 }]}>
      {chips.map((c, i) => {
        const active = i === selectedIdx;
        return (
          <View
            key={c.id}
            style={[
              styles.chip,
              active && styles.chipActive,
              sending && active && { opacity: 0.5 },
            ]}
          >
            <Ionicons
              name={iconForName(c.icon)}
              size={18}
              color={active ? "#FFFFFF" : colors.teal}
            />
            <Text
              style={[
                styles.chipLabel,
                active && { color: "#FFFFFF" },
              ]}
              numberOfLines={1}
            >
              {c.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    paddingVertical: 4,
  },
  tabContent: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
  },
  progressBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.teal,
  },
  hintDot: {
    position: "absolute",
    top: 0,
    right: "22%",
  },
  hintInner: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.teal,
    alignItems: "center",
    justifyContent: "center",
  },

  overlay: {
    position: "absolute",
    flexDirection: "row",
    gap: CHIP_GAP,
  },
  chip: {
    width: CHIP_W,
    height: CHIP_H,
    paddingHorizontal: spacing.xs,
    gap: 4,
    borderRadius: radii.md,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 8,
  },
  chipActive: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
    transform: [{ scale: 1.08 }, { translateY: -6 }],
  },
  chipLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.foreground,
    textAlign: "center",
  },
});
