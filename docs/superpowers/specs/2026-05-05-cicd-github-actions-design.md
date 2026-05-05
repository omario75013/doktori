# Doktori Phase 2 #25 — GitHub Actions CI/CD

**Date** : 2026-05-05
**Status** : Spec validated, awaiting plan
**Author** : Omar (brainstorm with Claude)
**Phase** : Phase 2 Session 1 (Pass A — code-only items)
**Effort estimate** : 3–4h

## Goal

Replace the broken Jenkinsfile (deleted in `8b8fdf0`) with two GitHub Actions workflows: one for continuous integration on every push and PR, and one for tag-based production deploys. Eliminate the human bottleneck of manual rsync deploys from Omar's Mac while keeping deploy intent explicit (must push a `v*` tag — no auto-deploy on main).

## Non-goals

- Migration runner — `apply-migrations-prod.sh` stays manual via SSH for now. Coupling migrations to deploys is high-risk and Doktori has had 13 migrations land in <1 month; we'd be auto-applying schema changes that may need staging review.
- `op inject` integration — deferred to DOKTORI-1P-DEBT (`docs/phase-2-deferred-tickets.md`). For V1, the deploy workflow assumes `/opt/doktori/.env` already has correct contents (current state).
- GHCR / Docker registry — V1 builds the image on prod over SSH (rsync + `docker compose build`). Matches existing manual flow. Adding a registry doubles the surface area.
- Deploy-on-merge — explicitly rejected; the repo has no branch protection (private repo, no Pro plan), so auto-deploy on main = anyone with write access can ship by accident. Tag is the gate.
- Self-hosted runners — GitHub-hosted is fine for Doktori volume and complexity. Self-hosted would just add infrastructure to maintain.
- E2E tests — out of scope. Doktori has unit tests (vitest, ~134 tests) and that's what CI runs. Playwright integration is a separate ticket.
- Slack/email notifications on deploy success/failure — Monitor.dartank.com webhook can be wired later (existing `Monitor Prod - WEBHOOK_SECRET` in 1P).

## Scope

### Workflow 1 — `.github/workflows/ci.yml`

**Trigger**: `push` on any branch + `pull_request` targeting main.

**Concurrency**: Group by ref, `cancel-in-progress: true` (multiple pushes on same branch → cancel old runs).

**Jobs** (single job `ci`, runs on `ubuntu-latest`):

1. **Setup**:
   - Checkout
   - Setup pnpm 9.15.0 (matches `package.json` packageManager field)
   - Setup Node 22 (matches Dockerfile and prod runtime)
   - Cache pnpm store for fast reinstalls

2. **Postgres service container** (job-level `services:` block):
   - `postgres:16` (matches prod Postgres major version)
   - Bound to host port 5434 (matches `vitest.config.ts` default DATABASE_URL)
   - User `doktori`, password `doktori_dev_2026`, db `doktori` (matches vitest defaults)
   - Healthcheck: `pg_isready`, retries until ready before steps run

3. **Steps**:
   - `pnpm install --frozen-lockfile`
   - `pnpm --filter web tsc --noEmit` (typecheck — already known to pass cleanly today)
   - `pnpm --filter web lint || true` (don't block on lint warnings; Doktori has tech debt here. Promote to hard-fail in a future iteration.)
   - **`pnpm --filter @doktori/db db:push`** — pushes the Drizzle schema to the empty CI Postgres so integration tests can run. **Required**: vitest has no `setupFiles` or `globalSetup`, and the `__tests__/api/**/*.test.ts` suites assume a populated schema. Without this step, ~30 tests fail with `ECONNREFUSED`-then-schema-errors. Uses the same `DATABASE_URL=postgresql://doktori:doktori_dev_2026@localhost:5434/doktori` that vitest defaults to. (`db:push` is preferred over `db:generate` + apply for CI: it creates schema directly from `packages/db/src/schema.ts`, skipping the migration history — appropriate for ephemeral test DBs.)
   - `pnpm --filter web test` (vitest run — 134 tests, ~25s on local Mac, ~60-90s expected in CI)
   - `pnpm --filter web build` (Next.js build, ~10-13 min — this is the slow path; verifies the production bundle compiles end-to-end)
     - **Build env vars**: Next.js bakes env at build time for server components. Provide placeholder values so the build doesn't fail on missing vars: `DATABASE_URL=postgresql://doktori:doktori_dev_2026@localhost:5434/doktori`, `NEXTAUTH_SECRET=ci-build-secret-not-for-prod`, `NEXTAUTH_URL=https://doktori.tn`, `MEILISEARCH_URL=http://localhost:7700`, `MEILISEARCH_KEY=ci-build`, `REDIS_URL=redis://localhost:6379`, `OPENROUTER_API_KEY=ci-build`. These are CI-only literals, not real secrets — they're fine to commit in the workflow file.

**Status check**: Job result named `ci` becomes a status check on the commit and the PR.

**Failure semantics**: Any step except `lint` fails the job. Failed CI on PR shows as red ❌ on GitHub UI.

### Workflow 2 — `.github/workflows/deploy-prod.yml`

**Trigger**: `push` on tags matching `v*` (e.g. `v1.0.0`, `v2.4.1`).

**Concurrency**: Group `deploy-prod`, `cancel-in-progress: false` (let an in-progress deploy finish; queue subsequent ones).

**Jobs** (single job `deploy`, runs on `ubuntu-latest`):

1. **Wait for CI green on the tagged commit** — Use the pre-installed `gh` CLI with a poll loop, timeout 30 min:
   ```bash
   COMMIT="${GITHUB_SHA}"
   timeout 30m bash -c '
     until gh run list --commit '"${COMMIT}"' --workflow ci.yml --json conclusion --jq ".[0].conclusion" | grep -qE "success"; do
       STATUS=$(gh run list --commit '"${COMMIT}"' --workflow ci.yml --json conclusion,status --jq ".[0]")
       echo "CI status: $STATUS"
       if echo "$STATUS" | grep -qE "(failure|cancelled|timed_out)"; then
         echo "CI did not pass — aborting deploy"
         exit 1
       fi
       sleep 30
     done
   '
   ```
   `gh` is pre-installed on all `ubuntu-latest` runners and authenticates via the runner's `GITHUB_TOKEN` automatically. Avoid `lewagon/wait-on-check-action` — last meaningful maintenance was 2022, prefer the official CLI.

   **Edge case — tag pushed on a commit that never ran CI** (detached HEAD or branch deleted before tag): the `gh run list` returns empty, and the loop times out after 30 min. Document in `contributing.md`: "always push a branch before tagging, so CI runs on the commit first."

2. **Setup SSH**:
   - `webfactory/ssh-agent@v0.9.0` with `secrets.DEPLOY_SSH_PRIVATE_KEY`
   - `ssh-keyscan 157.90.152.204 >> ~/.ssh/known_hosts` to avoid the host key prompt

3. **Rsync source** (excluding build artefacts):
   ```bash
   rsync -avz \
     --exclude=node_modules --exclude=.next --exclude=.git \
     --exclude='tmp-*' --exclude='bugreport-*.zip' \
     --exclude=cookies.txt --exclude=.DS_Store \
     --exclude=docs/lighthouse-reports \
     ./ root@157.90.152.204:/opt/doktori/
   ```

4. **Docker build + up** over SSH:
   ```bash
   ssh root@157.90.152.204 'cd /opt/doktori \
     && docker compose -f docker-compose.prod.yml build \
     && docker compose -f docker-compose.prod.yml up -d'
   ```

5. **Healthcheck** — Wait up to 90s for `https://doktori.tn/api/health` to return 200. Fail the job if not.

6. **(Out of scope V1)** — Webhook to Monitor: `curl -X POST https://monitor.dartank.com/api/events/webhook -d '{"event":"deploy","project":"doktori","tag":"$GITHUB_REF_NAME","status":"success"}'`. Defer until Monitor webhook spec is confirmed.

**Failure handling**: Any step failure aborts the deploy. The job logs are visible in the GH Actions UI. **Manual rollback** procedure remains the same as today: `mv /opt/doktori-prevN /opt/doktori && docker compose up -d` over SSH. Document in repo `docs/operations/rollback.md`.

**No automatic rollback**: out of scope. Would require image tagging + previous-version retention.

### GitHub repository settings

Required GitHub Secrets (set via `gh secret set` or repo Settings → Secrets):

| Secret name | Value source | Purpose |
|---|---|---|
| `DEPLOY_SSH_PRIVATE_KEY` | Newly generated keypair (private side here, public side appended to `/root/.ssh/authorized_keys` on prod) | Auth GH Actions runner → prod root |
| (none for tests) | — | Test DB is in-runner Docker; no real prod secrets needed for CI |

Required GitHub Variables (non-secret):

| Variable name | Value | Purpose |
|---|---|---|
| `DOKTORI_PROD_HOST` | `157.90.152.204` | SSH target |
| `DOKTORI_PROD_USER` | `root` | SSH user |

The `DOKTORI_PROD_HOST` could also be hardcoded — debatable. Storing as a Variable lets us swap to staging/blue-green later without code change.

### Existing files affected

- `Jenkinsfile` — already deleted in `8b8fdf0` ✓
- `.github/workflows/` — new directory, new files
- `docs/operations/` — new dir for rollback.md and deploy procedures docs

### Branch protection compromise

Without GitHub Pro, branch protection rules are unavailable on private repos. The compromise:

1. CI workflow runs on every push to any branch + every PR targeting main.
2. The deploy workflow has a `wait-for-ci-green` step that fails the deploy if CI was red on the tagged commit.
3. PR creators are expected to wait for CI green visually before merging.
4. Document this in `docs/operations/contributing.md`: "do not merge with red CI".

This is not as strong as enforced protection but it's the best Doktori can do today. Upgrading to GH Pro is a separate $4/user/month decision.

## Tests for the CI/CD itself

- **CI workflow**: testable by pushing this very spec → CI should run and go green (with the existing test suite).
- **Deploy workflow**: testable by pushing a `v0.0.1-cicd-test` tag and observing the run; the actual deploy to prod is a real act with consequences. **Pre-merge: dry-run on a feature branch with `if: github.repository == 'wrong-repo'` short-circuit, OR test the rsync+ssh part on a staging server (which doesn't exist for Doktori).** **Decision**: ship the deploy workflow but DON'T tag `v*` until you've reviewed it; the first real tag will be the smoke test.

## Verification criteria

Spec is satisfied when:

1. `.github/workflows/ci.yml` exists, triggers on push + pull_request, runs install + typecheck + test + build with a Postgres service container, and posts a status check named `ci`.
2. `.github/workflows/deploy-prod.yml` exists, triggers on `v*` tag push, waits for CI green, then rsyncs + rebuilds + healthchecks via SSH.
3. GitHub Secret `DEPLOY_SSH_PRIVATE_KEY` is configured and its public counterpart appended to `/root/.ssh/authorized_keys` on prod.
4. GitHub Variables `DOKTORI_PROD_HOST` and `DOKTORI_PROD_USER` are configured.
5. CI runs successfully on the commit that introduces these workflows (proof of life).
6. `docs/operations/rollback.md` exists with the rsync rollback procedure.
7. `docs/operations/contributing.md` mentions the "don't merge with red CI" convention.
8. Push of a tag `v0.0.0-cicd-bootstrap` (chosen so it can't be confused with a real release) triggers the deploy workflow and reports success — this is our smoke test of the deploy path. (Alternative: skip the smoke test and accept that the first real `v1.0.0` tag is the verification.)

## Out of scope (explicitly deferred)

- DB migrations as part of deploy (separate workflow once schema migrations stabilise)
- Slack/Monitor webhook on deploy events (Phase 2.5)
- E2E tests (Playwright) (separate ticket)
- Docker image registry / GHCR push (V2 if we want canary deploys)
- Self-hosted runners (V2 if GH-hosted minutes become a constraint)
- Auto-rollback on healthcheck failure (V2; needs tagged image retention)
- Branch protection rules (gated on GH Pro purchase decision)
- `op inject` for `.env` regeneration (DOKTORI-1P-DEBT first)

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| GH Actions runner can't SSH into prod (firewall, key wrong, etc.) | First tag is the smoke test. If it fails, GH Actions logs show the SSH error; we fix the secret/key and retry. Manual rsync remains the rollback. |
| Deploy succeeds but app is broken (build OK, runtime fail) | Healthcheck step on `/api/health` catches the obvious case. Real bug detection still requires manual review. |
| `wait-for-ci-green` times out → deploy aborts | Acceptable; user retries the tag after fixing CI. Surface clearly in the workflow log. |
| Tag pushed accidentally on a wrong commit | Same risk as today (manual deploy). Tag-vs-merge separation already provides a friction point. |
| GH-hosted runner OS gets out of sync with prod runtime | Pin Node and pnpm versions explicitly; build a Docker test image if drift becomes an issue. |
| pnpm cache poisoning between runs | `actions/cache@v4` keys include `pnpm-lock.yaml` hash, invalidates correctly on lockfile change. |
| Test Postgres in CI lacks Doktori-specific schema | Vitest's setup file (or per-test) runs `db push` / migrations against the empty test DB. **Verify the test suite already does this** — most failing tests today error on `ECONNREFUSED`, suggesting they expect a DB but don't seed it themselves. **Action item for the planner**: include a "seed test DB" step in CI before `pnpm test`. |

## Implementation order (preview, full plan in writing-plans)

1. Generate SSH keypair locally, append public key to prod `/root/.ssh/authorized_keys`, store private key as GH Secret.
2. Set GH Variables `DOKTORI_PROD_HOST`, `DOKTORI_PROD_USER` via `gh variable set`.
3. Write `.github/workflows/ci.yml`.
4. Push the workflow file → observe first CI run, fix issues until green.
5. Write `.github/workflows/deploy-prod.yml` (without triggering it yet).
6. Write `docs/operations/rollback.md` and `docs/operations/contributing.md`.
7. Commit + push.
8. Smoke test: push tag `v0.0.0-cicd-bootstrap`, observe deploy run, verify prod still healthy after.
9. If smoke test passes: tag `v1.0.0` for the next real release. From this point on, deploys are tag-driven.

## Acceptance — close the loop

- [ ] CI workflow runs on every PR and shows status check
- [ ] Deploy workflow runs on `v*` tag and successfully deploys
- [ ] SSH key works (no broken-pipe / auth errors in run logs)
- [ ] Healthcheck step catches at least one type of failure (manually break `/api/health` in a test branch and verify deploy aborts)
- [ ] Manual rsync still works as escape hatch (don't delete that capability)
- [ ] Future Phase 2 items (#9 Coach IA, #2 Paiement) ship via tag without needing Mac access
