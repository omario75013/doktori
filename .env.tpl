# Doktori prod env template — resolved by `op inject` at deploy time.
#
# Convention: one 1Password item per secret, named `Doktori Prod - <KEY>`,
# field `password`. Same convention used by other Dartank projects in the
# Dartank-Infra vault (B2B Prod - X, Ecommerce Prod - X, Monitor Prod - X).
#
# Bootstrap: 8 Doktori Prod - X items + 5 Ecommerce Prod - R2_X items must
# exist in the vault before this template can be `op inject`-ed.
# (DOKTORI-1P-DEBT, see docs/phase-2-deferred-tickets.md.)

# ─── Secrets — Doktori-specific ──────────────────────────────────────────
POSTGRES_PASSWORD=op://Dartank-Infra/Doktori Prod - POSTGRES_PASSWORD/password
DATABASE_URL=op://Dartank-Infra/Doktori Prod - DATABASE_URL/password
MEILISEARCH_KEY=op://Dartank-Infra/Doktori Prod - MEILISEARCH_KEY/password
NEXTAUTH_SECRET=op://Dartank-Infra/Doktori Prod - NEXTAUTH_SECRET/password
CRON_SECRET=op://Dartank-Infra/Doktori Prod - CRON_SECRET/password
SOCKETIO_BROADCAST_SECRET=op://Dartank-Infra/Doktori Prod - SOCKETIO_BROADCAST_SECRET/password
OPENROUTER_API_KEY=op://Dartank-Infra/Doktori Prod - OPENROUTER_API_KEY/password
REDIS_PASSWORD=op://Dartank-Infra/Doktori Prod - REDIS_PASSWORD/password

# ─── Secrets — shared with Ecommerce (same R2 bucket: dartank-images) ────
R2_ACCOUNT_ID=op://Dartank-Infra/Ecommerce Prod - R2_ACCOUNT_ID/password
R2_ACCESS_KEY_ID=op://Dartank-Infra/Ecommerce Prod - R2_ACCESS_KEY_ID/password
R2_SECRET_ACCESS_KEY=op://Dartank-Infra/Ecommerce Prod - R2_SECRET_ACCESS_KEY/password
R2_BUCKET_NAME=op://Dartank-Infra/Ecommerce Prod - R2_BUCKET_NAME/password
R2_PUBLIC_URL=op://Dartank-Infra/Ecommerce Prod - R2_PUBLIC_URL/password

# ─── Non-secret config — plain literals (must match current prod .env) ──
NEXTAUTH_URL=https://doktori.tn
MEILISEARCH_URL=http://meilisearch-doktori:7700
SOCKETIO_INTERNAL_URL=http://localhost:3010
NEXT_PUBLIC_SOCKETIO_URL=https://doktori.dartank.com
OPENROUTER_MODEL=x-ai/grok-4-fast
AUTH_TRUST_HOST=true
SUPER_ADMIN_EMAILS=karim.benali@doktori.tn
