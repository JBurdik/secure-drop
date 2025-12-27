# SecureDrop Deployment Guide for Dokploy

## Services

The app consists of 3 services:

| Service | Port | Description |
|---------|------|-------------|
| frontend | 3000 | React app |
| backend | 3210 (API), 3211 (HTTP actions) | Convex backend |
| dashboard | 6791 | Convex admin dashboard |

## Deployment Steps

### 1. Create Application in Dokploy

1. Create a new Compose application
2. Upload or paste `docker-compose.prod.yml`

### 2. Configure Environment Variables

Set in Dokploy:

| Variable | Example |
|----------|---------|
| `VITE_CONVEX_URL` | `https://api.securedrop.yourdomain.com` |
| `CONVEX_SITE_URL` | `https://site.securedrop.yourdomain.com` |

### 3. Configure Domains in Dokploy

Map each service to its domain:
- `frontend` (port 3000) -> `securedrop.yourdomain.com`
- `backend` (port 3210) -> `api.securedrop.yourdomain.com`
- `backend` (port 3211) -> `site.securedrop.yourdomain.com`
- `dashboard` (port 6791) -> `dashboard.securedrop.yourdomain.com`

### 4. Deploy

Click deploy. Dokploy handles SSL automatically.

### 5. Generate Admin Key

```bash
docker compose exec backend ./generate_admin_key.sh
```

### 6. Push Convex Functions

```bash
# .env.local
CONVEX_SELF_HOSTED_URL=https://api.securedrop.yourdomain.com
CONVEX_SELF_HOSTED_ADMIN_KEY=<your-admin-key>

# Deploy
npx convex deploy
```

## Data Backup

```bash
# Backup
docker run --rm -v convex-data:/data -v $(pwd):/backup alpine tar czf /backup/convex-backup.tar.gz /data

# Restore
docker run --rm -v convex-data:/data -v $(pwd):/backup alpine tar xzf /backup/convex-backup.tar.gz -C /
```
