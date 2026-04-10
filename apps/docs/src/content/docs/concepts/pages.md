---
title: Pages & Content Types
description: How pages and content types define the structure of your site.
---

Pages are the primary content entity in WollyCMS. Every page belongs to a **content type** that defines its schema — which fields it has and which regions are available for blocks.

## Content types

A content type is a blueprint for a category of pages. It defines:

- **Fields schema** — structured data fields attached directly to the page (subtitle, featured image ID, author, etc.)
- **Regions** — named areas where blocks can be placed (hero, content, sidebar, footer)
- **Allowed block types per region** — optionally restrict which block types editors can add to each region
- **Default blocks** — blocks that are automatically added when a new page of this type is created

### Creating a content type

Use the admin API to create content types programmatically:

```bash
curl -X POST http://localhost:4321/api/admin/content-types \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Blog Post",
    "slug": "blog_post",
    "description": "A blog article with hero and content regions",
    "fieldsSchema": [
      { "name": "subtitle", "label": "Subtitle", "type": "text" },
      { "name": "featured_image", "label": "Featured Image", "type": "media" },
      { "name": "author", "label": "Author", "type": "text", "required": true }
    ],
    "regions": [
      { "name": "hero", "label": "Hero", "allowed_types": ["hero", "image"] },
      { "name": "content", "label": "Content", "allowed_types": null }
    ],
    "defaultBlocks": [
      { "region": "hero", "blockTypeSlug": "hero", "position": 0 },
      { "region": "content", "blockTypeSlug": "rich_text", "position": 0 }
    ]
  }'
```

Setting `allowed_types` to `null` means any block type can be placed in that region.

### Slug prefix

A content type can declare an optional **slug prefix** that every page of that type lives under. This is useful when you want all articles to share a `/article/` path, all products under `/products/`, all events under `/event/`, and so on.

Slug prefixes are opt-in. Set one by adding `slugPrefix` to the content type's `settings`:

```bash
curl -X PUT http://localhost:4321/api/admin/content-types/$ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "settings": { "slugPrefix": "article/" }
  }'
```

Once set, WollyCMS enforces the prefix on every page of that content type:

- **New pages** — when an editor creates an article with title "My First Post", the auto-generated slug becomes `article/my-first-post` (not just `my-first-post`).
- **Bare slugs sent via the API** — `POST /api/admin/pages` with `{ "slug": "my-first-post", "typeId": <article type id> }` stores it as `article/my-first-post`. Clients don't have to know the prefix, but they can include it explicitly if they do.
- **Conflicting slugs sent via the API** — a slug like `blog/my-post` for an article type raises a 400 validation error, because the client is telling the server two different things about where the page lives.

The prefix is normalized to always end with a slash (`article` becomes `article/`). Leading slashes on either the prefix or the slug are ignored.

#### Overriding the prefix for a single page

Any individual page can opt out of its content type's prefix by setting `slugOverride: true`. The page's slug is then honored verbatim:

```bash
curl -X POST http://localhost:4321/api/admin/pages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "About Our Newsroom",
    "slug": "about/newsroom",
    "slugOverride": true,
    "typeId": <article type id>,
    "status": "published"
  }'
```

In the admin UI, the page editor shows an "Override prefix" checkbox next to the slug field whenever the page's content type has a `slugPrefix` configured. Toggling it off on a bare slug auto-prepends the prefix; toggling it off on a slug that contains another path segment raises a validation error so you don't accidentally lose part of the URL.

#### Enabling a prefix on an existing content type

Turning a slug prefix on for a content type that already has pages is **strictly non-destructive**. WollyCMS will not rewrite any existing URLs. Instead, on the first save where the prefix becomes non-empty, every existing page of that type whose current slug doesn't already match the new prefix gets `slugOverride: true` automatically. Those pages keep their current URLs indefinitely, and new pages created afterward pick up the prefix.

The content type PUT response includes a `meta.sweptOverrides` count so you know how many pages were grandfathered in:

```json
{
  "data": { "id": 4, "slug": "article", "settings": { "slugPrefix": "article/" } },
  "meta": { "sweptOverrides": 5 }
}
```

If you later want to bring those pages under the new prefix, edit each page in the admin UI, untick "Override prefix", and save. If the page's current slug is bare (e.g. `grandfathered-post`), the prefix is prepended automatically. If the slug contains a path segment that would conflict (e.g. `legacy/grandfathered-post`), the save fails until you also rewrite the slug to match.

### Default blocks

Content types can define **default blocks** that are automatically populated when a new page is created. This saves editors from building the same layout from scratch every time.

Each entry in `defaultBlocks` specifies:

| Field | Type | Description |
|---|---|---|
| `region` | string | Which region to place the block in |
| `blockTypeSlug` | string | The slug of the block type to create |
| `position` | number | Order within the region (0-based) |
| `fields` | object | Optional pre-filled field values |

The blocks are created as normal inline blocks — editors can remove, reorder, or add more. They are not locked or special in any way.

```json
{
  "defaultBlocks": [
    { "region": "hero", "blockTypeSlug": "hero", "position": 0 },
    { "region": "content", "blockTypeSlug": "rich_text", "position": 0 },
    { "region": "sidebar", "blockTypeSlug": "link_list", "position": 0 },
    { "region": "sidebar", "blockTypeSlug": "rich_text", "position": 1 }
  ]
}
```

Set `defaultBlocks` to `null` or `[]` to create pages with no pre-populated blocks.

:::tip
Analyze your existing pages to find the most common block layouts per content type, then set those as defaults. For example, if 90% of your secondary pages start with a hero, rich text, and sidebar navigation — make that the default.
:::

### Common content type examples

| Content Type | Slug | Typical Regions |
|---|---|---|
| Marketing Page | `marketing_page` | hero, content, cta |
| Blog Post | `blog_post` | hero, content, sidebar |
| Landing Page | `landing_page` | hero, features, testimonials, cta |
| Documentation | `doc_page` | content |

## Pages

A page is an instance of a content type. It has:

- **title** and **slug** (URL path)
- **status** — `draft`, `published`, or `archived`
- **fields** — key/value data matching the content type's field schema
- **regions** — blocks organized by region name
- **SEO metadata** — meta title, description, OG image, canonical URL, robots
- **Taxonomy terms** — categorization via vocabularies

### Creating a page

```bash
curl -X POST http://localhost:4321/api/admin/pages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Getting Started with WollyCMS",
    "slug": "blog/getting-started",
    "typeId": 2,
    "status": "draft",
    "fields": {
      "subtitle": "A quick tour of the CMS",
      "author": "Jane Developer"
    }
  }'
```

If you omit `slug`, WollyCMS auto-generates one from the title. If the content type has a [slug prefix](#slug-prefix) configured, it is applied automatically.

### Page statuses

| Status | Visible on content API | Editable |
|---|---|---|
| `draft` | No | Yes |
| `published` | Yes | Yes |
| `archived` | No | Yes |

:::tip
Pages also support **scheduled publishing**. Set `scheduledAt` to a future ISO timestamp and the page will be excluded from the content API until that time, even if its status is `published`.
:::

## Fetching pages in Astro

```typescript
import { createClient } from '@wollycms/astro';

const wolly = createClient({ apiUrl: 'http://localhost:4321/api/content' });

// Get a single page by slug
const page = await wolly.pages.getBySlug('blog/getting-started');

// List published pages, filtered by content type
const posts = await wolly.pages.list({
  type: 'blog_post',
  sort: 'published_at:desc',
  limit: 10,
});
```

### Page list parameters

| Parameter | Type | Description |
|---|---|---|
| `type` | string | Filter by content type slug |
| `taxonomy` | string | Filter by taxonomy (`category:news` or just `category`) |
| `sort` | string | Sort field and direction (`published_at:desc`, `title:asc`) |
| `limit` | number | Results per page (max 50) |
| `offset` | number | Pagination offset |

## Field types

Content type fields and block type fields use the same schema format:

| Type | Description |
|---|---|
| `text` | Single-line text |
| `textarea` | Multi-line text |
| `richtext` | TipTap rich text editor (JSON output) |
| `number` | Numeric value |
| `boolean` | True/false toggle |
| `select` | Dropdown with predefined options |
| `media` | Media picker (stores media ID) |
| `url` | URL input |
| `color` | Color picker |
| `group` | Nested group of fields |

Each field definition supports `required`, `default`, `min`, `max`, and `options` (for select fields).
