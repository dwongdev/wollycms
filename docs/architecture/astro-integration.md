# SpacelyCMS — Astro Integration (`@spacelycms/astro`)

## Overview

The Astro integration is a separate npm package that any Astro project can
install. It provides:

1. **Client** — Fetches content from the SpacelyCMS API
2. **BlockRenderer** — Maps block types to Astro components
3. **Route generation** — Dynamic routes from CMS page slugs
4. **Menu helpers** — Tree traversal, active state detection
5. **Image helpers** — Responsive `<img>` / `<picture>` from CMS media
6. **Rich text renderer** — Converts TipTap JSON to HTML/Astro components
7. **Type generation** — TypeScript types from CMS schemas
8. **Redirect config** — Generates platform-specific redirect rules

---

## Installation & Setup

```bash
npm install @spacelycms/astro
```

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import spacely from '@spacelycms/astro';

export default defineConfig({
  integrations: [
    spacely({
      apiUrl: 'http://localhost:4321/api/content',
      // Optional: for preview/draft mode
      adminApiUrl: 'http://localhost:4321/api/admin',
      previewSecret: 'your-preview-secret',
    })
  ]
});
```

---

## Client Usage

```astro
---
// In any .astro file
import { spacely } from '@spacelycms/astro';

// Fetch a single page by slug
const page = await spacely.pages.getBySlug('cite-resource-wizard');

// Fetch pages by type
const articles = await spacely.pages.list({
  type: 'article',
  sort: 'published_at:desc',
  limit: 10
});

// Fetch a menu
const mainMenu = await spacely.menus.get('main');

// Fetch taxonomy terms
const departments = await spacely.taxonomies.getTerms('department');

// Fetch site config
const config = await spacely.config.get();
---
```

---

## BlockRenderer Component

The core component that renders a list of blocks using registered Astro
components:

```astro
---
// src/components/BlockRenderer.astro
import { BlockRenderer } from '@spacelycms/astro';
---

<!-- Render all blocks in a region -->
<BlockRenderer blocks={page.regions.content} />
```

### Block Component Registration

By convention, components in `src/blocks/` are auto-discovered:

```
src/blocks/
  RichText.astro          → "rich_text"
  Accordion.astro         → "accordion"
  ContactList.astro       → "contact_list"
  Location.astro          → "location"
  CtaButton.astro         → "cta_button"
  ContentListing.astro    → "content_listing"
  CardGrid.astro          → "card_grid"
```

Slug mapping: PascalCase filename → snake_case block type slug.

Or configure explicitly:

```js
// spacely.config.ts
export default {
  blocks: {
    'rich_text': './src/blocks/RichText.astro',
    'accordion': './src/components/custom/MyAccordion.astro',
  }
}
```

### Block Component Props

Every block component receives these props:

```ts
interface BlockProps {
  /** The resolved block fields (with overrides merged) */
  fields: Record<string, any>;
  /** Block metadata */
  block: {
    id: string;
    type: string;
    title: string;
    is_shared: boolean;
  };
  /** The region this block is in */
  region: string;
  /** Position index within the region */
  position: number;
}
```

### Example Block Component

```astro
---
// src/blocks/Location.astro
import type { BlockProps } from '@spacelycms/astro';

interface Props extends BlockProps {
  fields: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone?: string;
    map_url?: string;
  };
}

const { fields } = Astro.props;
---

<div class="location-block">
  <h3>{fields.name}</h3>
  <address>
    {fields.address}<br />
    {fields.city}, {fields.state} {fields.zip}
  </address>
  {fields.phone && <p>Phone: <a href={`tel:${fields.phone}`}>{fields.phone}</a></p>}
  {fields.map_url && <a href={fields.map_url}>Get Directions</a>}
</div>
```

---

## Dynamic Route Generation

### Catch-All Route

```astro
---
// src/pages/[...slug].astro
import { spacely } from '@spacelycms/astro';
import BlockRenderer from '../components/BlockRenderer.astro';
import Layout from '../layouts/Default.astro';

export async function getStaticPaths() {
  const pages = await spacely.pages.list({ status: 'published' });
  return pages.map(page => ({
    params: { slug: page.slug || undefined },
    props: { page }
  }));
}

const { page } = Astro.props;
const mainMenu = await spacely.menus.get('main');
---

<Layout title={page.title} menu={mainMenu}>
  <div class="page-content">
    <div class="main-content">
      <h1>{page.title}</h1>
      <BlockRenderer blocks={page.regions.content} />
    </div>

    {page.regions.sidebar?.length > 0 && (
      <aside class="sidebar">
        <BlockRenderer blocks={page.regions.sidebar} />
      </aside>
    )}
  </div>

  {page.regions.bottom?.length > 0 && (
    <section class="bottom-content">
      <BlockRenderer blocks={page.regions.bottom} />
    </section>
  )}
</Layout>
```

### Content Type-Specific Routes

For content types that need different layouts:

```astro
---
// src/pages/event/[slug].astro
import { spacely } from '@spacelycms/astro';
import EventLayout from '../../layouts/Event.astro';

export async function getStaticPaths() {
  const events = await spacely.pages.list({ type: 'event' });
  return events.map(e => ({
    params: { slug: e.slug },
    props: { event: e }
  }));
}

const { event } = Astro.props;
---

<EventLayout event={event}>
  <h1>{event.title}</h1>
  <time datetime={event.fields.start_date}>
    {new Date(event.fields.start_date).toLocaleDateString()}
  </time>
  <BlockRenderer blocks={event.regions.content} />
</EventLayout>
```

---

## Menu Helpers

```astro
---
import { spacely, menuHelpers } from '@spacelycms/astro';

const menu = await spacely.menus.get('main');
const currentPath = Astro.url.pathname;

// Get breadcrumb trail for current page
const breadcrumbs = menuHelpers.getBreadcrumbs(menu, currentPath);

// Get children of a specific menu item
const academicsChildren = menuHelpers.getChildren(menu, 'academics');

// Check if a path is active (or its children are active)
const isActive = menuHelpers.isActive(menu, '/admissions', currentPath);
---

<nav>
  {menu.items.map(item => (
    <div class={menuHelpers.isActive(menu, item.url || item.page_slug, currentPath) ? 'active' : ''}>
      {item.url || item.page_slug
        ? <a href={item.url || item.page_slug}>{item.title}</a>
        : <span>{item.title}</span>
      }
      {item.children?.length > 0 && (
        <ul>
          {item.children.map(child => (
            <li><a href={child.url || child.page_slug}>{child.title}</a></li>
          ))}
        </ul>
      )}
    </div>
  ))}
</nav>
```

---

## Image Helpers

```astro
---
import { SpacelyImage } from '@spacelycms/astro';
---

<!-- Responsive image with srcset -->
<SpacelyImage
  media={page.fields.hero_image}
  sizes="(max-width: 768px) 100vw, 1200px"
  loading="lazy"
  class="hero-image"
/>

<!-- Renders as: -->
<img
  src="/api/media/101/large"
  srcset="/api/media/101/medium 600w, /api/media/101/large 1200w"
  alt="CITE datacenter lab"
  width="1200"
  height="400"
  loading="lazy"
  class="hero-image"
/>
```

---

## Rich Text Renderer

Converts TipTap JSON to HTML, with support for custom node types:

```astro
---
import { RichText } from '@spacelycms/astro';
---

<RichText
  content={block.fields.body}
  components={{
    // Override rendering for specific node types
    image: (node) => `<SpacelyImage media={node.attrs.media} />`,
    link: (node) => `<a href="${node.attrs.href}" class="styled-link">`,
  }}
/>
```

---

## Type Generation

The integration can generate TypeScript types from CMS schemas:

```bash
npx spacely types generate
```

Produces:

```ts
// src/spacely.d.ts (auto-generated)

export interface SecondaryPage {
  id: string;
  type: 'secondary_page';
  title: string;
  slug: string;
  status: 'draft' | 'published';
  fields: {
    subtitle?: string;
    hero_image?: SpacelyMedia;
  };
  regions: {
    content: SpacelyBlock[];
    sidebar: SpacelyBlock[];
    bottom: SpacelyBlock[];
  };
}

export interface AccordionBlock {
  type: 'accordion';
  fields: {
    heading?: string;
    items: Array<{
      title: string;
      body: TipTapDocument;
    }>;
    default_open: boolean;
  };
}

// ... types for all content types and block types
```

---

## Redirect Generation

```js
// astro.config.mjs — for static hosts
import { spacely } from '@spacelycms/astro';

const redirects = await spacely.redirects.list();

export default defineConfig({
  redirects: Object.fromEntries(
    redirects.map(r => [r.from_path, { destination: r.to_path, status: r.status_code }])
  )
});
```

---

## Preview Mode (Draft Content)

For editors to preview unpublished changes:

```astro
---
// src/pages/preview/[...slug].astro
import { spacely } from '@spacelycms/astro';

// Verify preview token
const token = Astro.url.searchParams.get('token');
if (!spacely.preview.verifyToken(token)) {
  return Astro.redirect('/404');
}

// Fetch draft version of page
const page = await spacely.pages.getBySlug(Astro.params.slug, {
  status: 'any',
  preview: true
});
---

<div class="preview-banner">Preview Mode — This page is not published</div>
<Layout>
  <BlockRenderer blocks={page.regions.content} />
</Layout>
```

---

## Deployment Compatibility

The integration works with all Astro output modes:

| Mode | How It Works |
|---|---|
| `static` (SSG) | All pages pre-rendered at build time. CMS webhook triggers rebuild. |
| `server` (SSR) | Pages fetched from CMS API on each request. Edge caching recommended. |
| `hybrid` | Mix of SSG + SSR. Common pages static, dynamic pages SSR. |

Compatible with all Astro adapters:
- `@astrojs/cloudflare`
- `@astrojs/vercel`
- `@astrojs/netlify`
- `@astrojs/node`
- Any custom adapter
