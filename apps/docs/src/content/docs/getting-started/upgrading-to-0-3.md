---
title: Upgrade to WollyCMS 0.3
description: Safely upgrade an existing WollyCMS 0.2 installation and Astro frontend.
---

WollyCMS 0.3 updates the supported runtime and dependency baseline, adds Astro 7
support, and includes editor, content-delivery, scheduling, and security fixes.

## Before upgrading

1. Back up the database and media storage.
2. Confirm the current installation starts successfully.
3. Use Node.js 22 LTS.
4. Review local extensions or direct imports from undocumented package paths.

## Upgrade the server

```bash
npm install @wollycms/server@^0.3.0
npm run migrate
```

WollyCMS 0.3 does not add a new database migration relative to the last 0.2 npm
release, but running the migration command remains the supported upgrade step.

Restart the server and verify:

```bash
curl http://localhost:4321/api/health
```

Then log in to `/admin` and check the dashboard, Pages, and Media.

## Upgrade the Astro integration

```bash
npm install @wollycms/astro@^0.3.0
```

The package supports Astro 5, 6, and 7. New Astro projects should use Astro 7.
The responsive image component is exported as:

```astro
---
import SpacelyImage from '@wollycms/astro/components/SpacelyImage.astro';
---
```

The former `WollyImage.astro` package entry remains as a compatibility alias.

## Docker

Pull the versioned image, then recreate the container:

```bash
docker pull ghcr.io/wollycms/wollycms:0.3.0
docker compose up -d
```

Do not remove database or media volumes during the upgrade.

## Cloudflare Workers

Build the admin and Worker from the 0.3 release, apply D1 migrations, and deploy:

```bash
npm ci
npm run build:admin
npm run build:worker
npx wrangler d1 migrations apply <database-name> --remote
npx wrangler deploy
```

Verify `/api/health`, a content API request, the admin UI, and media URLs after
deployment.
