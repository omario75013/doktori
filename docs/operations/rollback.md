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

If healthcheck still fails, the problem is data/infra (DB schema, Redis state, Meilisearch index), not the application code — escalate.

## Caveat

The current deploy workflow does NOT preserve the previous version automatically (it overwrites `/opt/doktori/` via rsync). The `doktori-prev*` snapshots on prod are leftovers from manual deploys before 2026-05-05. Once they're consumed, future rollbacks need a different mechanism.

**Future improvement** (Phase 2.5): the deploy workflow should `mv /opt/doktori /opt/doktori-prevN` before rsyncing, mirroring the manual procedure. Tracked in `docs/phase-2-deferred-tickets.md`.
