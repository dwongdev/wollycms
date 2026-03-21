---
title: Migrate from WordPress
description: Step-by-step guide to migrating a WordPress site to WollyCMS.
---

This guide covers migrating content from WordPress to WollyCMS. WordPress stores content differently than Drupal, but the migration pattern is the same — read from the source, transform, write to the WollyCMS Admin API.

## Prerequisites

- Access to your WordPress site (admin dashboard or database dump)
- Node.js 20+ installed
- A running WollyCMS instance with an admin API key

## Choose your data source

WordPress offers two approaches:

### Option A: WP REST API (recommended)

The WordPress REST API is the easiest way to extract content. It's enabled by default on WordPress 4.7+ and requires no database access.

```javascript
// lib/wp-api.js
const WP_URL = process.env.WP_URL; // https://your-wordpress-site.com

export async function getPosts(page = 1, perPage = 100) {
  const res = await fetch(
    `${WP_URL}/wp-json/wp/v2/posts?page=${page}&per_page=${perPage}&status=publish`
  );
  const total = parseInt(res.headers.get('X-WP-TotalPages'));
  return { posts: await res.json(), totalPages: total };
}

export async function getPages(page = 1, perPage = 100) {
  const res = await fetch(
    `${WP_URL}/wp-json/wp/v2/pages?page=${page}&per_page=${perPage}&status=publish`
  );
  const total = parseInt(res.headers.get('X-WP-TotalPages'));
  return { pages: await res.json(), totalPages: total };
}

export async function getMedia(page = 1, perPage = 100) {
  const res = await fetch(
    `${WP_URL}/wp-json/wp/v2/media?page=${page}&per_page=${perPage}`
  );
  return { media: await res.json() };
}

export async function getCategories() {
  const res = await fetch(`${WP_URL}/wp-json/wp/v2/categories?per_page=100`);
  return res.json();
}

export async function getTags() {
  const res = await fetch(`${WP_URL}/wp-json/wp/v2/tags?per_page=100`);
  return res.json();
}

export async function getMenus() {
  // Requires the WP REST API Menus plugin, or use the
  // wp/v2/menu-items endpoint (WP 5.9+)
  const res = await fetch(`${WP_URL}/wp-json/wp/v2/menu-items?menus=primary&per_page=100`);
  return res.json();
}
```

### Option B: MySQL database

If you have a database dump or direct access, query `wp_posts`, `wp_postmeta`, `wp_terms`, and `wp_term_relationships` directly. This is faster for large sites and gives you access to draft content, revisions, and custom fields.

```javascript
// lib/wp-db.js
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: '127.0.0.1',
  port: 3307,
  user: 'root',
  password: 'migration',
  database: 'wordpress',
});

export async function getPublishedPosts(postType = 'post', limit = 100) {
  const [rows] = await pool.execute(`
    SELECT ID, post_title, post_name, post_content,
           post_excerpt, post_date, post_modified, post_type
    FROM wp_posts
    WHERE post_status = 'publish'
      AND post_type = ?
    ORDER BY ID
    LIMIT ?
  `, [postType, limit]);
  return rows;
}

export async function getPostMeta(postId) {
  const [rows] = await pool.execute(
    'SELECT meta_key, meta_value FROM wp_postmeta WHERE post_id = ?',
    [postId]
  );
  return Object.fromEntries(rows.map(r => [r.meta_key, r.meta_value]));
}
```

## Phase 1: Inventory your WordPress site

```javascript
// scripts/inventory.js
import { getPosts, getPages, getMedia, getCategories, getTags } from '../lib/wp-api.js';

const { posts, totalPages } = await getPosts(1, 1);
console.log(`Posts: ${totalPages} pages of results`);

const { pages } = await getPages(1, 1);
console.log(`Pages: found`);

const cats = await getCategories();
console.log(`Categories: ${cats.length}`);

const tags = await getTags();
console.log(`Tags: ${tags.length}`);
```

If you have custom post types (registered by themes or plugins like CPT UI), query them via `/wp-json/wp/v2/types` to discover their REST endpoints.

## Phase 2: Map content types

| WordPress | WollyCMS |
|-----------|----------|
| Post | Content type (e.g., "Article") |
| Page | Content type (e.g., "Page") |
| Custom Post Type | Content type |
| Post meta / ACF fields | Content type fields |
| Featured image | Media field on content type |
| Categories | Taxonomy vocabulary |
| Tags | Taxonomy vocabulary |
| Navigation menu | Menu |
| Gutenberg blocks | WollyCMS blocks |

### WordPress fields to WollyCMS fields

| WordPress field | WollyCMS equivalent |
|-----------------|---------------------|
| `post_title` | Page title |
| `post_name` | Page slug |
| `post_content` | Rich Text block(s) in content region |
| `post_excerpt` | Content type field or meta description |
| `post_date` | Content type date field |
| `_thumbnail_id` (featured image) | Media field on content type |
| ACF text field | Content type text field |
| ACF image field | Content type media field |
| ACF repeater | Multiple blocks or JSON field |

### Gutenberg blocks to WollyCMS blocks

If your WordPress site uses the block editor (Gutenberg), the content is stored as HTML comments with block metadata:

```html
<!-- wp:paragraph -->
<p>Hello world</p>
<!-- /wp:paragraph -->

<!-- wp:heading {"level":2} -->
<h2>Section title</h2>
<!-- /wp:heading -->

<!-- wp:image {"id":42} -->
<figure><img src="/wp-content/uploads/photo.jpg" alt="Photo"/></figure>
<!-- /wp:image -->
```

Map these to WollyCMS block types:

| Gutenberg block | WollyCMS block |
|-----------------|----------------|
| `core/paragraph`, `core/heading`, `core/list` | Rich Text (combine sequential text blocks) |
| `core/image`, `core/gallery` | Image |
| `core/html`, `core/embed` | Embed |
| `core/table` | Rich Text (tables are supported in TipTap) |
| `core/columns` | Multiple blocks in different regions |
| Plugin blocks (WooCommerce, etc.) | Custom handling per plugin |

## Phase 3: Migrate pages and posts

### Simple approach: treat post_content as one rich text block

For most WordPress sites, the simplest migration treats the entire `post_content` as a single Rich Text block:

```javascript
// scripts/migrate-posts.js
import { getPosts } from '../lib/wp-api.js';
import { createPage, addBlock } from '../lib/wolly-api.js';
import { htmlToTipTap } from '../lib/html-to-tiptap.js';

const DRY_RUN = process.argv.includes('--dry-run');
let page = 1;
let totalPages = 1;

while (page <= totalPages) {
  const result = await getPosts(page, 50);
  totalPages = result.totalPages;

  for (const post of result.posts) {
    console.log(`[${post.id}] "${post.title.rendered}" → /${post.slug}`);
    if (DRY_RUN) continue;

    // Create page
    const wollyPage = await createPage({
      title: post.title.rendered,
      slug: post.slug,
      contentTypeId: 1, // your "Article" content type ID
      status: 'published',
      fields: {
        publish_date: post.date,
      },
    });

    // Convert HTML content to TipTap and add as block
    const tiptap = htmlToTipTap(post.content.rendered);
    await addBlock(wollyPage.id, 'content', {
      blockTypeSlug: 'rich_text',
      fields: { body: tiptap },
    });
  }

  page++;
}
```

### Advanced: parse Gutenberg blocks individually

For sites that use the block editor heavily, parse the block delimiters and create separate WollyCMS blocks:

```javascript
function parseGutenbergBlocks(content) {
  const blocks = [];
  const regex = /<!-- wp:(\S+?)(\s+(\{.*?\}))?\s*-->([\s\S]*?)<!-- \/wp:\1 -->/g;
  let match;

  while ((match = regex.exec(content)) !== null) {
    blocks.push({
      name: match[1],
      attrs: match[3] ? JSON.parse(match[3]) : {},
      innerHTML: match[4].trim(),
    });
  }

  return blocks;
}

// Then map each Gutenberg block to a WollyCMS block:
for (const block of parseGutenbergBlocks(post.content.rendered)) {
  if (block.name === 'image') {
    // Upload image, create Image block
  } else if (block.name === 'html' || block.name === 'embed') {
    // Create Embed block
  } else {
    // Default: Rich Text block with converted HTML
    const tiptap = htmlToTipTap(block.innerHTML);
    await addBlock(pageId, 'content', {
      blockTypeSlug: 'rich_text',
      fields: { body: tiptap },
    });
  }
}
```

### Classic editor (no Gutenberg)

If your site uses the classic editor, `post_content` is plain HTML — no block delimiters. Treat it as one Rich Text block and convert with `htmlToTipTap()`.

## Phase 4: Migrate featured images

WordPress stores featured images as attachments linked via `_thumbnail_id` post meta:

```javascript
// scripts/migrate-featured-images.js
import { getPosts, getMedia } from '../lib/wp-api.js';
import { uploadMedia, updatePage } from '../lib/wolly-api.js';

let page = 1;
let totalPages = 1;

while (page <= totalPages) {
  const result = await getPosts(page, 50);
  totalPages = result.totalPages;

  for (const post of result.posts) {
    if (!post.featured_media) continue;

    // Get media details from WP
    const res = await fetch(
      `${process.env.WP_URL}/wp-json/wp/v2/media/${post.featured_media}`
    );
    const wpMedia = await res.json();
    const imageUrl = wpMedia.source_url;

    // Download
    const imgRes = await fetch(imageUrl);
    const buffer = Buffer.from(await imgRes.arrayBuffer());

    // Upload to WollyCMS
    const wollyMedia = await uploadMedia(buffer, wpMedia.alt_text || post.title.rendered);

    // Update the WollyCMS page's featured_image field
    // (requires knowing the WollyCMS page ID — maintain a mapping)
    console.log(`Uploaded featured image for "${post.title.rendered}"`);
  }

  page++;
}
```

## Phase 5: Migrate taxonomies

```javascript
// scripts/migrate-taxonomies.js
import { getCategories, getTags } from '../lib/wp-api.js';

// Create WollyCMS vocabulary for categories
const catVocab = await fetch(`${CMS_URL}/api/admin/taxonomies`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
  body: JSON.stringify({ name: 'Categories', slug: 'categories' }),
}).then(r => r.json());

// Create terms
const categories = await getCategories();
for (const cat of categories) {
  await fetch(`${CMS_URL}/api/admin/taxonomies/${catVocab.id}/terms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
    body: JSON.stringify({
      name: cat.name,
      slug: cat.slug,
      parentId: cat.parent ? termMap[cat.parent] : null,
    }),
  });
}

// Repeat for tags
```

## Phase 6: Migrate menus

WordPress menus (Appearance → Menus) are stored as a custom post type `nav_menu_item`:

```javascript
// Using WP REST API (WP 5.9+)
const menuItems = await fetch(
  `${WP_URL}/wp-json/wp/v2/menu-items?menus=primary&per_page=100`
).then(r => r.json());

// Create menu in WollyCMS
const menu = await fetch(`${CMS_URL}/api/admin/menus`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
  body: JSON.stringify({ name: 'Main', slug: 'main' }),
}).then(r => r.json());

// Sort by menu_order and parent, create items top-down
const sorted = menuItems.sort((a, b) => a.menu_order - b.menu_order);
const itemMap = {};

for (const item of sorted) {
  const wollyItem = await fetch(`${CMS_URL}/api/admin/menus/${menu.id}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
    body: JSON.stringify({
      title: item.title.rendered,
      url: item.url,
      parentId: item.parent ? itemMap[item.parent] : null,
      position: item.menu_order,
    }),
  }).then(r => r.json());

  itemMap[item.id] = wollyItem.id;
}
```

:::tip[Menu plugins]
If your site uses a menu plugin (Max Mega Menu, UberMenu, etc.), the REST API may not expose all items. In that case, query the database directly or export menus via the plugin's export feature.
:::

## Phase 7: Handle shortcodes

WordPress shortcodes (`[gallery ids="1,2,3"]`, `[contact-form-7 id="5"]`) appear in `post_content` but won't render in WollyCMS. Handle them during migration:

| Shortcode | Migration strategy |
|-----------|-------------------|
| `[gallery]` | Parse image IDs, create Image blocks |
| `[embed]` / `[video]` | Create Embed block with the URL |
| `[contact-form-7]` | Create Embed block with form iframe |
| `[shortcode]` (custom) | Inspect what it renders, migrate accordingly |
| `[caption]` | Extract image and caption text, create Image block |

```javascript
function expandShortcodes(html) {
  // Replace [gallery] with placeholder text for manual review
  html = html.replace(/\[gallery[^\]]*\]/g, '<!-- GALLERY: needs manual migration -->');

  // Replace [embed] with the URL directly
  html = html.replace(/\[embed\](.*?)\[\/embed\]/g, '$1');

  // Strip unknown shortcodes
  html = html.replace(/\[\/?[a-zA-Z_-]+[^\]]*\]/g, '');

  return html;
}
```

## Phase 8: ACF and custom fields

If your site uses Advanced Custom Fields (ACF), field data is in `wp_postmeta` with ACF-specific key prefixes:

```javascript
// Get ACF fields for a post
const meta = await getPostMeta(postId);

// ACF stores field references as _fieldname → field key
// The actual value is in fieldname → value
const acfFields = {};
for (const [key, value] of Object.entries(meta)) {
  if (!key.startsWith('_') && meta[`_${key}`]?.startsWith('field_')) {
    acfFields[key] = value;
  }
}

// Map to WollyCMS content type fields
const wollyFields = {
  subtitle: acfFields.subtitle,
  event_date: acfFields.event_date,
  location: acfFields.location,
};
```

## Phase 9: Verify and go live

After migration:

- [ ] Page counts match (WordPress posts + pages vs WollyCMS pages)
- [ ] Featured images render on the Astro frontend
- [ ] Inline images load (check for old `/wp-content/uploads/` paths)
- [ ] Menu hierarchy matches WordPress
- [ ] Categories and tags transferred correctly
- [ ] SEO metadata (titles, descriptions) carried over

Set up redirects for common WordPress URL patterns:

```javascript
// In your Astro middleware or _redirects file:
// /?p=123           → /actual-slug
// /category/news/   → /blog (or taxonomy page)
// /wp-content/...   → 404 or redirect to WollyCMS media
```

Run a broken link check:

```bash
npx broken-link-checker https://your-new-site.com --recursive
```
