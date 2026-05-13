import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, api, t } from "@doktori/mobile-core";
import { Screen, Card, Kv, Loader, Banner } from "./_ui";

type Method =
  | "stripe_card"
  | "bank_transfer"
  | "cash_on_premises"
  | "flouci"
  | "paymee";

type BankConfig = {
  iban?: string;
  bic?: string;
  bankName?: string;
  accountHolder?: string;
};

type MethodRow = {
  method: Method;
  enabled: boolean;
  config: Record<string, unknown>;
};

type ListResponse = { methods: MethodRow[] };

const METHOD_KEYS: Method[] = [
  "stripe_card",
  "bank_transfer",
  "cash_on_premises",
  "flouci",
  "paymee",
];

function methodIcon(m: Method): React.ComponentProps<typeof Ionicons>["name"] {
  switch (m) {
    case "stripe_card":
      return "card-outline";
    case "bank_transfer":
      return "business-outline";
    case "cash_on_premises":
      return "cash-outline";
    case "flouci":
    case "paymee":
      return "globe-outline";
  }
}

function maskIban(iban: string | undefined): string {
  if (!iban) return "";
  const clean = iban.replace(/\s+/g, "");
  if (clean.length <= 8) return clean;
  return `${clean.slice(0, 4)} •••• •••• ${clean.slice(-4)}`;
}

export default function Paiement() {
  const [rows, setRows] = useState<Record<Method, MethodRow> | null>(null);
  const [savingMethod, setSavingMethod] = useState<Method | null>(null);
  const [bankModalOpen, setBankModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await api<ListResponse>("/api/medecin/payment-methods");
        const next: Record<Method, MethodRow> = {} as Record<Method, MethodRow>;
        for (const m of METHOD_KEYS) {
          const existing = r.methods.find((x) => x.method === m);
          next[m] = existing ?? { method: m, enabled: false, config: {} };
        }
        setRows(next);
      } catch {
        const empty: Record<Method, MethodRow> = {} as Record<Method, MethodRow>;
        for (const m of METHOD_KEYS) {
          empty[m] = { method: m, enabled: false, config: {} };
        }
        setRows(empty);
        setError(t("doctor.paiement.loadError"));
      }
    })();
  }, []);

  async function save(method: Method, patch: Partial<MethodRow>) {
    if (!rows) return;
    setSavingMethod(method);
    setError(null);
    const next = { ...rows[method], ...patch };
    setRows({ ...rows, [method]: next });
    try {
      await api("/api/medecin/payment-methods", {
        method: "POST",
        body: {
          method: next.method,
          enabled: next.enabled,
          config: next.config ?? {},
        },
      });
    } catch (e) {
      // Roll back optimistic update
      setRows((prev) => (prev ? { ...prev, [method]: rows[method] } : prev));
      const msg = e instanceof Error ? e.message : t("doctor.paiement.saveError");
      setError(msg);
      Alert.alert(t("doctor.paiement.saveError"), msg);
    } finally {
      setSavingMethod(null);
    }
  }

  if (!rows) {
    return (
      <>
        <Stack.Screen options={{ title: t("doctor.paiement.title") }} />
        <Loader />
      </>
    );
  }

  const bank = rows.bank_transfer;
  const bankCfg = (bank.config ?? {}) as BankConfig;

  return (
    <>
      <Stack.Screen options={{ title: t("doctor.paiement.title") }} />
      <Screen>
        <Banner tone="info">{t("doctor.paiement.intro")}</Banner>

        {error && <Banner tone="warn">{error}</Banner>}

        <Card title={t("doctor.paiement.methods")}>
          {METHOD_KEYS.map((m, idx) => {
            const row = rows[m];
            const saving = savingMethod === m;
            return (
              <View key={m} style={[styles.methodRow, idx > 0 && styles.divider]}>
                <View style={styles.iconBox}>
                  <Ionicons
                    name={methodIcon(m)}
                    size={20}
                    color={colors.foreground}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.methodLabel}>
                    {t(`doctor.paiement.method.${m}.label`)}
                  </Text>
                  <Text style={styles.methodDesc}>
                    {t(`doctor.paiement.method.${m}.desc`)}
                  </Text>
                </View>
                {saving ? (
                  <ActivityIndicator size="small" color={colors.teal} />
                ) : (
                  <Switch
                    value={row.enabled}
                    onValueChange={(v) => {
                      if (m === "bank_transfer" && v && !bankCfg.iban) {
                        setBankModalOpen(true);
                        return;
                      }
                      save(m, { enabled: v });
                    }}
                    trackColor={{ true: colors.teal, false: colors.border }}
                  />
                )}
              </View>
            );
          })}
        </Card>

        {bank.enabled && (
          <Card
            title={t("doctor.paiement.bankInfo")}
            right={
              <Pressable onPress={() => setBankModalOpen(true)}>
                <Text style={styles.editLink}>{t("doctor.paiement.edit")}</Text>
              </Pressable>
            }
          >
            <Kv
              label={t("doctor.paiement.accountHolder")}
              value={bankCfg.accountHolder ?? null}
            />
            <Kv
              label={t("doctor.paiement.iban")}
              value={bankCfg.iban ? maskIban(bankCfg.iban) : null}
              mono
            />
            <Kv label={t("doctor.paiement.bic")} value={bankCfg.bic ?? null} mono />
            <Kv
              label={t("doctor.paiement.bankName")}
              value={bankCfg.bankName ?? null}
            />
          </Card>
        )}

        <Text style={styles.footnote}>{t("doctor.paiement.cardNote")}</Text>
      </Screen>

      <BankModal
        visible={bankModalOpen}
        initial={bankCfg}
        saving={savingMethod === "bank_transfer"}
        onClose={() => setBankModalOpen(false)}
        onSave={async (cfg) => {
          const hasAll = !!(cfg.iban && cfg.bankName && cfg.accountHolder);
          await save("bank_transfer", {
            enabled: hasAll ? true : bank.enabled,
            config: cfg as Record<string, unknown>,
          });
          setBankModalOpen(false);
        }}
      />
    </>
  );
}

function BankModal({
  visible,
  initial,
  saving,
  onClose,
  onSave,
}: {
  visible: boolean;
  initial: BankConfig;
  saving: boolean;
  onClose: () => void;
  onSave: (cfg: BankConfig) => void | Promise<void>;
}) {
  const [accountHolder, setAccountHolder] = useState(initial.accountHolder ?? "");
  const [iban, setIban] = useState(initial.iban ?? "");
  const [bic, setBic] = useState(initial.bic ?? "");
  const [bankName, setBankName] = useState(initial.bankName ?? "");

  useEffect(() => {
    if (visible) {
      setAccountHolder(initial.accountHolder ?? "");
      setIban(initial.iban ?? "");
      setBic(initial.bic ?? "");
      setBankName(initial.bankName ?? "");
    }
  }, [visible, initial.accountHolder, initial.iban, initial.bic, initial.bankName]);

  const canSave = !!(accountHolder.trim() && iban.trim() && bankName.trim());

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <View style={styles.modalCard}>
          <View style={styles.modalHead}>
            <Text style={styles.modalTitle}>{t("doctor.paiement.editBank")}</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.foreground} />
            </Pressable>
          </View>

          <Field
            label={t("doctor.paiement.accountHolder")}
            value={accountHolder}
            onChange={setAccountHolder}
          />
          <Field
            label={t("doctor.paiement.iban")}
            value={iban}
            onChange={setIban}
            autoCapitalize="characters"
          />
          <Field
            label={t("doctor.paiement.bic")}
            value={bic}
            onChange={setBic}
            autoCapitalize="characters"
          />
          <Field
            label={t("doctor.paiement.bankName")}
            value={bankName}
            onChange={setBankName}
          />

          <Pressable
            style={[styles.saveBtn, (!canSave || saving) && styles.saveBtnDisabled]}
            disabled={!canSave || saving}
            onPress={() =>
              onSave({
                accountHolder: accountHolder.trim(),
                iban: iban.trim(),
                bic: bic.trim() || undefined,
                bankName: bankName.trim(),
              })
            }
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.saveBtnText}>{t("doctor.paiement.save")}</Text>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Field({
  label,
  value,
  onChange,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoCapitalize?: "none" | "characters" | "words" | "sentences";
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        autoCapitalize={autoCapitalize ?? "none"}
        autoCorrect={false}
        style={styles.input}
        placeholderTextColor={colors.foregroundSecondary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  methodRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  divider: { borderTopWidth: 1, borderTopColor: colors.border },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  methodLabel: { fontSize: 14, fontWeight: "700", color: colors.foreground },
  methodDesc: {
    fontSize: 11,
    color: colors.foregroundSecondary,
    marginTop: 2,
  },
  editLink: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.teal,
  },
  footnote: {
    fontSize: 11,
    color: colors.foregroundSecondary,
    paddingHorizontal: spacing.xs,
    lineHeight: 16,
  },
  modalRoot: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: colors.bg,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: { fontSize: 16, fontWeight: "800", color: colors.foreground },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.foregroundSecondary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 14,
    color: colors.foreground,
    backgroundColor: colors.bg,
  },
  saveBtn: {
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginTop: spacing.sm,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: "#FFF", fontSize: 14, fontWeight: "700" },
});
