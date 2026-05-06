# Doktori prod env template — resolved by `op inject` at deploy time.
#
# Convention: one 1Password item per secret, named `Doktori Prod - <KEY>`,
# field `password`. Same convention used by other Dartank projects in the
# Dartank-Infra vault (B2B Prod - X, Ecommerce Prod - X, Monitor Prod - X).
#
# Bootstrap: see docs/phase-2-deferred-tickets.md (DOKTORI-1P-DEBT) for the
# 8 items to create from your 1Password desktop app before this template
# can be `op inject`-ed.

# ─── Secrets — Doktori-specific ──────────────────────────────────────────
POSTGRES_PASSWORD=op://Dartank-Infra/Doktori Prod - POSTGRES_PASSWORD/password
DATABASE_URL=op://Dartank-Infra/Doktori Prod - DATABASE_URL/password
MEILISEARCH_KEY=op://Dartank-Infra/Doktori Prod - MEILISEARCH_KEY/password
NEXTAUTH_SECRET=op://Dartank-Infra/Doktori Prod - NEXTAUTH_SECRET/password
CRON_SECRET=op://Dartank-Infra/Doktori Prod - CRON_SECRET/password
SOCKETIO_BROADCAST_SECRET=op://Dartank-Infra/Doktori Prod - SOCKETIO_BROADCAST_SECRET/password
OPENROUTER_API_KEY=op://Dartank-Infra/Doktori Prod - OPENROUTER_API_KEY/password
REDIS_PASSWORD=op://Dartank-Infra/Doktori Prod - REDIS_PASSWORD/password
DEEPL_API_KEY=op://Dartank-Infra/Doktori Prod - DEEPL_API_KEY/password

# ─── Secrets — shared with Ecommerce (same R2 bucket: dartank-images) ────
R2_ACCOUNT_ID=op://Dartank-Infra/Ecommerce Prod - R2_ACCOUNT_ID/password
R2_ACCESS_KEY_ID=op://Dartank-Infra/Ecommerce Prod - R2_ACCESS_KEY_ID/password
R2_SECRET_ACCESS_KEY=op://Dartank-Infra/Ecommerce Prod - R2_SECRET_ACCESS_KEY/password
R2_BUCKET_NAME=op://Dartank-Infra/Ecommerce Prod - R2_BUCKET_NAME/password
R2_PUBLIC_URL=op://Dartank-Infra/Ecommerce Prod - R2_PUBLIC_URL/password

# ─── Non-secret config — plain literals ──────────────────────────────────
NEXTAUTH_URL=https://doktori.tn
MEILISEARCH_URL=http://meilisearch-doktori:7700
NEXT_PUBLIC_SOCKETIO_URL=https://sos.doktori.tn
SOCKETIO_INTERNAL_URL=http://localhost:3010
AUTH_TRUST_HOST=true
OPENROUTER_MODEL=moonshotai/kimi-k2-0905
SUPER_ADMIN_EMAILS=admin@dartank.com
