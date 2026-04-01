---
title: Quick Start
description: Get WollyCMS running in under 5 minutes.
---

## Prerequisites

- **Node.js 22 LTS** — WollyCMS uses `better-sqlite3` which requires native compilation. Node 22 LTS is tested and recommended. If you hit build errors on newer Node versions (e.g. v25), switch to Node 22 or use PostgreSQL instead (`DATABASE_URL=postgresql://...` in your `.env`).

## Create a new project

```bash
npx create-wolly my-site
cd my-site
```

This scaffolds a new WollyCMS project with:
- `package.json` with `@wollycms/server` dependency
- `.env` with a generated JWT secret
- `.gitignore`, `.env.example`, `docker-compose.yml`
- `data/` and `uploads/` directories

## Install and run

```bash
npm install
npm run migrate
npm run seed
npm run dev
```

Your CMS is now running:
- **API**: http://localhost:4321
- **Admin UI**: http://localhost:4321/admin

Default login: `admin@wollycms.local` / `admin123`

:::caution
Change the default password immediately in a production environment.
:::

## Create your Astro frontend

In a separate directory, create an Astro project:

```bash
npm create astro@latest my-frontend
cd my-frontend
npm install @wollycms/astro
```

## Connect to WollyCMS

Create `src/lib/wolly.ts`:

```typescript
import { createClient } from '@wollycms/astro';

export const wolly = createClient({
  apiUrl: 'http://localhost:4321/api/content',
});
```

## Create the block mapping

Create `src/lib/blocks.ts`:

```typescript
// Map CMS block type slugs to Astro components
export { default as hero } from '../blocks/Hero.astro';
export { default as rich_text } from '../blocks/RichText.astro';
export { default as image } from '../blocks/ImageBlock.astro';
// Add more as you create block components
```

## Create a catch-all route

Create `src/pages/[...slug].astro`:

```astro
---
import Layout from '../layouts/Default.astro';
import BlockRenderer from '@wollycms/astro/components/BlockRenderer.astro';
import { wolly } from '../lib/wolly';
import * as blocks from '../lib/blocks';

const slug = Astro.params.slug || 'home';
const page = await wolly.pages.getBySlug(slug);
---

<Layout title={page.title}>
  <BlockRenderer
    blocks={page.regions.hero ?? []}
    components={blocks}
  />
  <BlockRenderer
    blocks={page.regions.content ?? []}
    components={blocks}
  />
</Layout>
```

## Create your first block component

Create `src/blocks/Hero.astro`:

```astro
---
const { fields } = Astro.props;
---

<section>
  <h1>{fields.heading}</h1>
  {fields.description && <p>{fields.description}</p>}
</section>
```

## Troubleshooting

### `npm install` fails with `better-sqlite3` errors

WollyCMS uses [better-sqlite3](https://github.com/WiseLibs/better-sqlite3), a native Node.js module that requires compilation. If the prebuilt binary isn't available for your platform, it falls back to compiling from source.

**Fix: Use Node.js 22 LTS** (the tested and recommended version):

```bash
nvm install 22
nvm use 22
npm install    # retry
```

**Fix: Install build tools** (if compilation is needed):

```bash
# Ubuntu / Debian
sudo apt install build-essential python3

# macOS
xcode-select --install

# Windows
npm install -g windows-build-tools
```

**Fix: Rebuild native modules** (if `npm install` succeeded but commands still fail):

```bash
npm rebuild better-sqlite3
```

**Alternative: Use PostgreSQL instead** (no native modules required):

Edit `.env` and change `DATABASE_URL`:

```
DATABASE_URL=postgresql://user:password@localhost:5432/wollycms
```

PostgreSQL support is built in — no additional packages needed.

### `npm run migrate` fails with "migrations folder not found"

This usually means `@wollycms/server` wasn't installed correctly. Try:

```bash
rm -rf node_modules package-lock.json
npm install
npm run migrate
```

### Commands fail with `MODULE_NOT_FOUND` or `Cannot find module`

Check your Node.js version:

```bash
node -v    # Should be v22.x.x
```

WollyCMS requires Node.js 22 LTS. Other versions may have incompatible native module binaries.

### Server starts but admin UI shows a blank page

Clear your browser cache or try an incognito window. The admin UI is a SvelteKit SPA bundled with the server — it should load at `http://localhost:4321/admin`.

## Next steps

- [Core Concepts](/concepts/pages/) — Learn about pages, blocks, and regions
- [Astro Integration](/astro/setup/) — Full setup guide for the `@wollycms/astro` package
- [Deployment](/deployment/cloudflare/) — Deploy to Cloudflare Workers, Docker, or Node.js
