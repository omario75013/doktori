import { db, featureFlags } from "./index";

async function main() {
  const flags = [
    {
      key: "payment_stripe_enabled",
      enabled: false,
      description:
        "Stripe Card payment via /api/payments/checkout. Requires STRIPE_WEBHOOK_SECRET in env + webhook configured in Stripe dashboard.",
    },
    {
      key: "payment_bank_transfer_enabled",
      enabled: false,
      description:
        "Bank transfer with manual admin verification. Requires platform_settings payment.bank_transfer.expiry_days + per-doctor IBAN config.",
    },
  ];

  for (const flag of flags) {
    await db
      .insert(featureFlags)
      .values(flag)
      .onConflictDoNothing({ target: featureFlags.key });
    console.log(`✓ ${flag.key}`);
  }

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
