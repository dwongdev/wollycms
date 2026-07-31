---
title: Astro Setup
description: Install and configure the @wollycms/astro package for your Astro site.
---

The `@wollycms/astro` package provides a typed client, components, and helpers for building Astro sites powered by WollyCMS.

Version 0.3 supports Astro 5, 6, and 7. New projects should use Astro 7 and
Node.js 22 LTS.

## Installation

```bash
npm install @wollycms/astro
```

## Create the client

Create `src/lib/wolly.ts`:

```typescript
import { createClient } from '@wollycms/astro';

export const wolly = createClient({
  apiUrl: import.meta.env.CMS_API_URL || 'http://localhost:4321/api/content',
});
```

Add the environment variable to your `.env`:

```bash
CMS_API_URL=http://localhost:4321/api/content
```

## Cloudflare Workers configuration

When deploying your Astro frontend to Cloudflare Workers, use runtime bindings
from `cloudflare:workers`. Keep `import.meta.env` only as a build-time or local
development fallback.

### Set up the Astro adapter

```bash
npm install @astrojs/cloudflare
```

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
});
```

### Create a runtime-aware client

Update `src/lib/wolly.ts`:

```typescript
import { createClient } from '@wollycms/astro';
import { env } from 'cloudflare:workers';

const buildTimeUrl = import.meta.env.CMS_API_URL || '';

export function getWolly() {
  const apiUrl = env?.CMS_API_URL
    || buildTimeUrl
    || 'http://localhost:4321/api/content';

  return createClient({ apiUrl });
}
```

Then use the runtime client in pages and layouts:

```astro
---
import { getWolly } from '../lib/wolly';

const wolly = getWolly();
const page = await wolly.pages.getBySlug('home');
---
```

### Add the binding to wrangler.toml

```toml
[vars]
CMS_API_URL = "https://cms.example.com/api/content"
```

For local Wrangler development, put the same binding in `.dev.vars`. Do not
commit `.dev.vars` when it contains secrets.

## Create the block mapping

Create `src/lib/blocks.ts` to map block type slugs to Astro components:

```typescript
export { default as hero } from '../blocks/Hero.astro';
export { default as rich_text } from '../blocks/RichText.astro';
export { default as image } from '../blocks/ImageBlock.astro';
export { default as cta } from '../blocks/CTA.astro';
```

:::caution
The export name **must** match the block type slug exactly. If your block type slug is `feature_grid`, the export must be `feature_grid`.
:::

## Create the catch-all route

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
  <BlockRenderer blocks={page.regions.hero ?? []} region="hero" components={blocks} />
  <BlockRenderer blocks={page.regions.content ?? []} region="content" components={blocks} />
</Layout>
```

## Client API reference

The `WollyClient` instance exposes these namespaces:

| Namespace | Methods |
|---|---|
| `pages` | `getBySlug(slug)`, `list(params?)` |
| `menus` | `get(slug, depth?)` |
| `taxonomies` | `getTerms(slug)` |
| `media` | `getInfo(id)`, `getVariant(id, variant)`, `url(id, variant?)` |
| `search` | `query(q, options?)` |
| `redirects` | `list()` |
| `config` | `get()` |
| `schemas` | `get()` |
| `trackingScripts` | `getForPage(slug?)` |

All methods return typed responses matching the interfaces exported from `@wollycms/astro`.
