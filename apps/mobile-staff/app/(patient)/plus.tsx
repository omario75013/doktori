import { useCallback } from "react";
import { Alert } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { t } from "@doktori/mobile-core";

/**
 * Stub route for the centered FAB tab. On focus, opens a quick-action sheet
 * (native Alert) and pops back to the previous tab.
 */
export default function PlusQuickActions() {
  useFocusEffect(
    useCallback(() => {
      const opts = [
        {
          text: t("patient.plus.bookRdv"),
          onPress: () => router.replace("/(patient)/recherche"),
        },
        {
          text: t("patient.plus.video"),
          onPress: () => router.replace("/(patient)/rendez-vous"),
        },
        {
          text: t("patient.plus.upload"),
          onPress: () => router.replace("/(patient)/mes-documents"),
        },
        {
          text: t("common.cancel"),
          style: "cancel" as const,
          onPress: () => router.back(),
        },
      ];
      Alert.alert(t("patient.plus.title"), t("patient.plus.body"), opts, {
        cancelable: true,
        onDismiss: () => router.back(),
      });
    }, [])
  );

  // Render nothing — alert is the UI.
  return null;
}
