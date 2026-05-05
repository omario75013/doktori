# Doktori Phase 2 #25 — GitHub Actions CI/CD implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace deleted Jenkinsfile with two GitHub Actions workflows: `ci.yml` (push + PR → install + typecheck + test + build with Postgres service) and `deploy-prod.yml` (tag `v*` → wait for CI green → rsync + docker compose build/up + healthcheck).

**Architecture:** Two stateless workflows on `ubuntu-latest` GH-hosted runners. CI uses a Postgres 16 service container with Drizzle `db:push` to seed schema before tests. Deploy uses SSH (dedicated key in GH Secret) to reach prod and execute the same rsync + docker compose flow we use manually today. No registry, no migrations as part of deploy, no auto-rollback — V1 reproduces the manual flow but unblocks anyone-can-tag deploys.

**Tech Stack:** GitHub Actions · Node 22 · pnpm 9.15.0 · Drizzle Kit · ssh-agent · gh CLI · Docker Compose.

**Spec:** `docs/superpowers/specs/2026-05-05-cicd-github-actions-design.md` (HEAD `90e8baf`).

---

## File structure

| File | Status | Responsibility |
|---|---|---|
| `.github/workflows/ci.yml` | **Create** | Push + PR runs install/typecheck/lint/test/build. Postgres service container + db:push for tests. |
| `.github/workflows/deploy-prod.yml` | **Create** | Tag `v*` triggers SSH-based deploy. Waits for CI green via gh CLI, rsync, docker rebuild, healthcheck. |
| `docs/operations/rollback.md` | **Create** | Document the `mv /opt/doktori-prevN /opt/doktori && docker compose up -d` procedure. |
| `docs/operations/contributing.md` | **Create** | "Don't merge with red CI", "always push branch before tagging", basic conventions. |
| `apps/web/app/api/health/route.ts` | Verify exists | Spec assumes it does — confirm in Task 0. |

---

## Pre-flight (10 min)

### Task 0: Verify assumptions and gather environment info

- [ ] **Verify `/api/health` endpoint exists**
  ```bash
  ls /Users/omario/dev/doktori/apps/web/app/api/health/route.ts
  curl -s -o /dev/null -w "%{http_code}\n" https://doktori.tn/api/health
  ```
  Expected: file exists, HTTP 200.

- [ ] **Verify Drizzle config and db:push work locally**
  ```bash
  cd /Users/omario/dev/doktori
  cat packages/db/drizzle.config.ts | head -20
  ```
  Expected: config points at the Drizzle schema in `packages/db/src/schema.ts`. Confirm `db:push` is a valid command in `packages/db/package.json` (already verified — it is).

- [ ] **Confirm packageManager and Node versions**
  ```bash
  grep packageManager /Users/omario/dev/doktori/package.json
  grep "FROM node" /Users/omario/dev/doktori/Dockerfile
  ```
  Expected: `pnpm@9.15.0`, `node:22-alpine`. The CI workflow must pin these exactly.

- [ ] **Inventory existing prod SSH access for the runner**
  ```bash
  ssh root@157.90.152.204 'cat /root/.ssh/authorized_keys | wc -l'
  ```
  Note the count — we'll add one new key to it.

---

## Task 1: Generate dedicated SSH keypair for GH Actions runner

**Files**: none in repo; one key locally + one append on prod.

- [ ] **Step 1: Generate keypair**
  ```bash
  mkdir -p ~/.ssh/doktori-deploy
  ssh-keygen -t ed25519 -N "" -C "github-actions-doktori-deploy" -f ~/.ssh/doktori-deploy/id_ed25519
  ls -la ~/.ssh/doktori-deploy/
  ```
  Expected: two files, `id_ed25519` (private, 600) and `id_ed25519.pub` (public, 644).

- [ ] **Step 2: Append public key to prod**
  ```bash
  ssh root@157.90.152.204 "echo '$(cat ~/.ssh/doktori-deploy/id_ed25519.pub)' >> /root/.ssh/authorized_keys && wc -l /root/.ssh/authorized_keys"
  ```
  Expected: count goes up by 1.

- [ ] **Step 3: Test the key works from a third-party context**
  ```bash
  ssh -i ~/.ssh/doktori-deploy/id_ed25519 -o StrictHostKeyChecking=no root@157.90.152.204 'echo OK'
  ```
  Expected: `OK`.

- [ ] **Step 4: Store private key as GH Secret**
  ```bash
  cd /Users/omario/dev/doktori
  gh secret set DEPLOY_SSH_PRIVATE_KEY < ~/.ssh/doktori-deploy/id_ed25519
  gh secret list | grep DEPLOY_SSH_PRIVATE_KEY
  ```
  Expected: secret listed, age "now".

- [ ] **Step 5: Set GH Variables**
  ```bash
  gh variable set DOKTORI_PROD_HOST -b 157.90.152.204
  gh variable set DOKTORI_PROD_USER -b root
  gh variable list
  ```

---

## Task 2: Write `ci.yml`

**Files**:
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Write the workflow**

```yaml
name: CI

on:
  push:
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  ci:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: doktori
          POSTGRES_PASSWORD: doktori_dev_2026
          POSTGRES_DB: doktori
        ports:
          - 5434:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    env:
      DATABASE_URL: postgresql://doktori:doktori_dev_2026@localhost:5434/doktori
      NEXTAUTH_SECRET: ci-build-secret-not-for-prod
      NEXTAUTH_URL: https://doktori.tn
      MEILISEARCH_URL: http://localhost:7700
      MEILISEARCH_KEY: ci-build
      REDIS_URL: redis://localhost:6379
      OPENROUTER_API_KEY: ci-build
      OPENROUTER_MODEL: moonshotai/kimi-k2-0905
      AUTH_TRUST_HOST: "true"
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9.15.0

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm

      - name: Install
        run: pnpm install --frozen-lockfile

      - name: Typecheck (apps/web)
        run: pnpm --filter web exec tsc --noEmit

      - name: Lint (non-blocking)
        run: pnpm --filter web lint || true

      - name: Push schema to test DB
        run: pnpm --filter @doktori/db db:push
        env:
          DATABASE_URL: postgresql://doktori:doktori_dev_2026@localhost:5434/doktori

      - name: Test
        run: pnpm --filter web test

      - name: Build
        run: pnpm --filter web build
```

- [ ] **Step 2: Push and observe first run**
  ```bash
  cd /Users/omario/dev/doktori
  git add .github/workflows/ci.yml
  git commit -m "ci: add GitHub Actions CI workflow

Phase 2 #25. Push + PR triggers install + typecheck + lint
(non-blocking) + db:push + test + build. Postgres 16 service container
on port 5434 matches vitest.config.ts default.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
  git push origin main
  gh run watch
  ```
  Expected: workflow starts. **First run will likely fail** for one of these reasons:
  - Drizzle `db:push` package name might differ (e.g. `db` vs `@doktori/db`)
  - Some test relies on environment that's still missing
  - Build env vars are still incomplete
  
  Iterate: read the failure, fix, push again. Budget 2-3 iterations.

- [ ] **Step 3: Document the iteration**

  Once green, capture which env vars were the bare minimum and what changed in the workflow. Add a comment block at the top of `ci.yml` summarising the env vars contract.

---

## Task 3: Write `deploy-prod.yml`

**Files**:
- Create: `.github/workflows/deploy-prod.yml`

- [ ] **Step 1: Write the workflow**

```yaml
name: Deploy to prod

on:
  push:
    tags:
      - "v*"

concurrency:
  group: deploy-prod
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Wait for CI green on this commit
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          set -euo pipefail
          COMMIT="${GITHUB_SHA}"
          echo "Waiting for CI on commit $COMMIT"
          timeout 30m bash -c '
            while true; do
              RESULT=$(gh run list --commit '"$COMMIT"' --workflow ci.yml --json conclusion,status --jq ".[0]" || echo "{}")
              CONCLUSION=$(echo "$RESULT" | jq -r ".conclusion // empty")
              STATUS=$(echo "$RESULT" | jq -r ".status // empty")
              echo "[$(date +%H:%M:%S)] CI status=$STATUS conclusion=$CONCLUSION"
              if [ "$CONCLUSION" = "success" ]; then
                echo "CI passed — proceeding"
                exit 0
              fi
              if [ "$CONCLUSION" = "failure" ] || [ "$CONCLUSION" = "cancelled" ] || [ "$CONCLUSION" = "timed_out" ]; then
                echo "CI failed — aborting deploy"
                exit 1
              fi
              sleep 30
            done
          '

      - name: Setup SSH
        uses: webfactory/ssh-agent@v0.9.0
        with:
          ssh-private-key: ${{ secrets.DEPLOY_SSH_PRIVATE_KEY }}

      - name: Add prod host to known_hosts
        run: |
          mkdir -p ~/.ssh
          ssh-keyscan -H ${{ vars.DOKTORI_PROD_HOST }} >> ~/.ssh/known_hosts

      - name: Rsync source to prod
        run: |
          rsync -avz \
            --exclude=node_modules --exclude=.next --exclude=.git \
            --exclude='tmp-*' --exclude='bugreport-*.zip' \
            --exclude=cookies.txt --exclude=.DS_Store \
            --exclude=docs/lighthouse-reports \
            --exclude=.github \
            ./ ${{ vars.DOKTORI_PROD_USER }}@${{ vars.DOKTORI_PROD_HOST }}:/opt/doktori/

      - name: Build and restart on prod
        run: |
          ssh ${{ vars.DOKTORI_PROD_USER }}@${{ vars.DOKTORI_PROD_HOST }} '
            set -e
            cd /opt/doktori
            docker compose -f docker-compose.prod.yml build
            docker compose -f docker-compose.prod.yml up -d
          '

      - name: Healthcheck
        run: |
          set -e
          for i in $(seq 1 18); do
            CODE=$(curl -s -o /dev/null -w "%{http_code}" https://doktori.tn/api/health || echo "000")
            echo "[$(date +%H:%M:%S)] /api/health → $CODE (attempt $i/18)"
            if [ "$CODE" = "200" ]; then
              echo "Healthcheck passed"
              exit 0
            fi
            sleep 5
          done
          echo "Healthcheck failed after 90s"
          exit 1

      - name: Tag deploy success
        if: success()
        run: echo "Deploy of ${{ github.ref_name }} succeeded at $(date -u)"
```

- [ ] **Step 2: Commit but DON'T tag yet**
  ```bash
  cd /Users/omario/dev/doktori
  git add .github/workflows/deploy-prod.yml
  git commit -m "ci: add tag-based deploy workflow

Phase 2 #25. Triggered by 'v*' tag push. Waits for CI green via gh CLI
poll loop, then SSH-deploys: rsync + docker compose build + up + 90s
healthcheck on /api/health. SSH key in DEPLOY_SSH_PRIVATE_KEY secret.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
  git push origin main
  ```
  Expected: workflow file lands but doesn't trigger (no tag pushed).

---

## Task 4: Documentation

**Files**:
- Create: `docs/operations/rollback.md`
- Create: `docs/operations/contributing.md`

- [ ] **Step 1: Write rollback.md**

```markdown
# Doktori prod rollback procedure

If a deploy goes wrong, restore the previous version:

```bash
ssh root@157.90.152.204 '
  cd /opt
  CURRENT=doktori
  PREV=$(ls -td doktori-prev* 2>/dev/null | head -1)
  if [ -z "$PREV" ]; then
    echo "No previous version available — manual recovery needed"
    exit 1
  fi
  echo "Rolling back: $CURRENT → broken-$(date +%s), $PREV → $CURRENT"
  mv /opt/$CURRENT /opt/broken-$(date +%s)
  mv /opt/$PREV /opt/$CURRENT
  cd /opt/$CURRENT
  docker compose -f docker-compose.prod.yml up -d
'
```

Then verify:
```bash
curl -s -o /dev/null -w "%{http_code}\n" https://doktori.tn/api/health
ssh root@157.90.152.204 'docker ps --filter name=doktori'
```

If healthcheck still fails, the problem is data/infra, not the application code — escalate.
```

- [ ] **Step 2: Write contributing.md**

```markdown
# Doktori — contributing conventions

## CI/CD

- **Don't merge with red CI.** GitHub Pro branch protection isn't enabled (private repo, free plan), so this is a social rule. The deploy workflow refuses to ship if CI is red on the tagged commit.
- **Always push a branch before tagging.** A tag on a commit that has never been on a branch never gets CI run on it, and the deploy workflow's `wait-for-ci-green` step will time out.
- **Tags are the deploy gate.** Push `v1.2.3` (semver) on a commit that's already on `main` and CI-green. The deploy workflow rsyncs + rebuilds + healthchecks, ~10-15 min.

## Commits

- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `perf:`, `test:`, `ci:`.
- Keep them small; separate logical changes into separate commits.

## Tests

- Run `pnpm --filter web test` before pushing. CI will catch DB-touching tests too — local-only run skips them if you don't have Postgres on port 5434.

## Migrations

- Schema migrations are NOT run as part of deploy. They go through `apply-migrations-prod.sh` separately.
- For test DBs in CI, schema is created via `db:push` (no migration history).
```

- [ ] **Step 3: Commit**

```bash
cd /Users/omario/dev/doktori
git add docs/operations/
git commit -m "docs(operations): rollback + contributing procedures

Phase 2 #25 supporting docs.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>"
git push origin main
```

---

## Task 5: Smoke test the deploy workflow

**This is the test of the deploy path.** Skip only if you're confident enough to wait until the next real release tag.

- [ ] **Step 1: Push a bootstrap tag**
  ```bash
  cd /Users/omario/dev/doktori
  git tag v0.0.0-cicd-bootstrap
  git push origin v0.0.0-cicd-bootstrap
  ```
  Expected: deploy workflow starts within seconds.

- [ ] **Step 2: Watch the run**
  ```bash
  gh run watch
  ```
  Expected: ~10-15 min. All steps pass. Healthcheck final step is HTTP 200.

- [ ] **Step 3: Verify prod is still healthy**
  ```bash
  ssh root@157.90.152.204 'docker ps --filter name=doktori'
  curl -s -o /dev/null -w "%{http_code}\n" https://doktori.tn/api/health
  ```
  Expected: containers Up healthy, HTTP 200.

- [ ] **Step 4: If broken, rollback**
  Use the procedure in `docs/operations/rollback.md`. The smoke-test bootstrap container is identical to current prod content (no code change), so rollback should be fast.

- [ ] **Step 5: Clean up the bootstrap tag (optional)**
  ```bash
  git push origin :refs/tags/v0.0.0-cicd-bootstrap
  git tag -d v0.0.0-cicd-bootstrap
  ```
  Removes the tag — the deploy run history stays in GH Actions UI.

---

## Acceptance — close the loop

- [ ] CI workflow runs and goes green on every push (after the iteration loop in Task 2)
- [ ] `gh secret list` shows `DEPLOY_SSH_PRIVATE_KEY`
- [ ] `gh variable list` shows `DOKTORI_PROD_HOST` and `DOKTORI_PROD_USER`
- [ ] `.github/workflows/ci.yml` exists, triggers on push + PR
- [ ] `.github/workflows/deploy-prod.yml` exists, triggers on `v*` tag
- [ ] `docs/operations/rollback.md` and `docs/operations/contributing.md` exist
- [ ] Smoke test (Task 5) passes — deploy of `v0.0.0-cicd-bootstrap` succeeds AND prod stays healthy
- [ ] First real release tag (e.g. `v1.0.0` for the cumulative state of all today's commits) ships via this workflow

## Risks during implementation

| Risk | Mitigation |
|---|---|
| Test run fails because `db:push` package name is `@doktori/db` vs `db` | Quick fix: `pnpm --filter ./packages/db db:push` if filter name doesn't match |
| `db:push` produces interactive prompts (Drizzle Kit may ask "rename column?") | Add `--force` flag if available, or use `drizzle-kit push --force` directly |
| Build runs out of memory on default GH runner | Default runner has 16GB; should be fine. If not, escalate to `ubuntu-latest-large` ($) |
| SSH key auth fails because runner network blocks port 22 | Use `gh-runner` or self-hosted as escalation. Doktori prod accepts plain SSH so this should work. |
| Healthcheck keeps failing because `/api/health` was misnamed in spec | Task 0 verified the endpoint exists. If failing, inspect prod logs: `docker logs doktori-web --tail 50` |
| `wait-for-ci-green` returns success on a stale CI run | The query filters by `--commit ${GITHUB_SHA}` (the tag's commit), so it only matches CI runs on that exact commit. Safe. |

## Effort breakdown

- Task 0: 10 min
- Task 1: 15 min (key gen + GH secrets)
- Task 2: 60-90 min (write + iterate to green)
- Task 3: 30 min (write — no iteration since we don't trigger it)
- Task 4: 20 min (docs)
- Task 5: 30 min (smoke test + verify)

**Total: ~3-4h**, matching the spec estimate.
