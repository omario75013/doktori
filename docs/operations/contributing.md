# Doktori — contributing conventions

## CI/CD

- **Don't merge with red CI.** GitHub Pro branch protection isn't enabled (private repo, free plan), so this is a social rule. The deploy workflow refuses to ship if CI is red on the tagged commit.
- **Always push a branch before tagging.** A tag on a commit that has never been on a branch never gets CI run on it, and the deploy workflow's `wait-for-ci-green` step will time out.
- **Tags are the deploy gate.** Push `v1.2.3` (semver) on a commit that's already on `main` and CI-green. The deploy workflow rsyncs + rebuilds + healthchecks, ~10-15 min.

## Commits

- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `perf:`, `test:`, `ci:`.
- Keep them small; separate logical changes into separate commits.
- Sign commits if your team uses signing (Doktori currently does not require it).

## Tests

- Run `pnpm --filter web test` before pushing. CI will catch DB-touching tests too — local-only run skips them if you don't have Postgres on port 5434.
- For local DB tests: `docker run --rm -d -p 5434:5432 -e POSTGRES_USER=doktori -e POSTGRES_PASSWORD=doktori_dev_2026 -e POSTGRES_DB=doktori postgres:16` then `pnpm --filter @doktori/db db:push` to seed.

## Migrations

- Schema migrations are NOT run as part of deploy. They go through `apply-migrations-prod.sh` separately (manual SSH + run).
- For test DBs in CI, schema is created via `db:push` (no migration history — appropriate for ephemeral CI DBs only).
- For prod, **always** generate a real migration via `pnpm --filter @doktori/db db:generate` and review the SQL before applying.

## Secrets

- `.env` files are NOT committed.
- Secrets live in 1Password vault `Dartank-Infra` — see `docs/phase-2-deferred-tickets.md` for the current state of the Doktori 1P integration (DOKTORI-1P-DEBT).

## Deploys

- Tag-driven via GH Actions. See `.github/workflows/deploy-prod.yml` for the workflow and `docs/operations/rollback.md` for recovery.
- The `gh` CLI is your friend: `gh run watch` after pushing a tag to follow the deploy in your terminal.
