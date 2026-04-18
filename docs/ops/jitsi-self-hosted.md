# Self-Hosted Jitsi for Doktori

## Why
Public meet.jit.si has no privacy guarantees. Self-hosted Jitsi gives:
- HIPAA-level privacy (no third-party access to video streams)
- Custom branding (Doktori logo in video room)
- Better performance (dedicated server)

## Setup on prod server (157.90.152.204)

1. Install Jitsi Meet via Docker:
```bash
git clone https://github.com/jitsi/docker-jitsi-meet.git /opt/jitsi
cd /opt/jitsi
cp env.example .env
# Edit .env: set HTTPS_PORT, PUBLIC_URL
docker compose up -d
```

2. Configure Nginx proxy:
```nginx
server {
    listen 443 ssl http2;
    server_name meet.doktori.tn;
    ssl_certificate /etc/letsencrypt/live/meet.doktori.tn/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/meet.doktori.tn/privkey.pem;
    location / { proxy_pass http://localhost:8443; }
}
```

3. Update platform setting:
   - Admin → Paramètres → Téléconsultation → URL Jitsi → `https://meet.doktori.tn`
   - No code change needed — the setting is read dynamically (60s cache)
