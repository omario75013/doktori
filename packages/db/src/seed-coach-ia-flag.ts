import { db, featureFlags } from "./index";

async function main() {
  await db
    .insert(featureFlags)
    .values({
      key: "coach_ia_enabled",
      enabled: false,
      description:
        "Coach IA Kimi chat - DPIA-gated, see docs/superpowers/specs/2026-05-06-coach-ia-design.md. Requires physician + legal sign-off before enabling in prod.",
    })
    .onConflictDoNothing({ target: featureFlags.key });
  console.log("coach_ia_enabled feature flag ensured (false)");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
