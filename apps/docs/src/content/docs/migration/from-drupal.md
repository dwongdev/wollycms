---
title: Migrate from Drupal
description: Step-by-step guide to migrating a Drupal 7, 8, 9, or 10 site to WollyCMS.
---

This guide covers migrating content from Drupal to WollyCMS. It's based on real production migrations and covers the full process — from exporting Drupal's database to verifying your new WollyCMS-powered Astro site.

## Prerequisites

- A Drupal database dump (MySQL/MariaDB `.sql` file)
- Node.js 20+ installed
- A running WollyCMS instance with an admin API key
- Docker (for running the MySQL container locally)

## Phase 1: Set up the migration environment

### Load the Drupal database locally

Run a MySQL container with your Drupal dump so your scripts can query it directly:

```yaml
# compose.yaml
services:
  drupal-db:
    image: mysql:8.0
    ports:
      - "3307:3306"
    environment:
      MYSQL_ROOT_PASSWORD: migration
      MYSQL_DATABASE: drupal
    volumes:
      - ./drupal-data:/var/lib/mysql
```

```bash
docker compose up -d
# Wait for MySQL to be ready, then import:
docker exec -i drupal-db mysql -uroot -pmigration drupal < your-drupal-dump.sql
```

### Create the migration project

```bash
mkdir drupal-migration && cd drupal-migration
npm init -y
npm install mysql2 node-fetch
```

Create a database helper:

```javascript
// lib/drupal-db.js
import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: '127.0.0.1',
  port: 3307,
  user: 'root',
  password: 'migration',
  database: 'drupal',
});

export async function query(sql, params) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

export async function closePool() {
  await pool.end();
}
```

Create a WollyCMS API helper:

```javascript
// lib/wolly-api.js
const CMS_URL = process.env.WOLLY_API_URL || 'http://localhost:4321';
const API_KEY = process.env.WOLLY_API_KEY;

export async function createPage(data) {
  const res = await fetch(`${CMS_URL}/api/admin/pages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Create page failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function addBlock(pageId, region, blockData) {
  const res = await fetch(`${CMS_URL}/api/admin/pages/${pageId}/blocks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({ region, ...blockData }),
  });
  if (!res.ok) throw new Error(`Add block failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function uploadMedia(filePath, altText) {
  const form = new FormData();
  form.append('file', new Blob([readFileSync(filePath)]), basename(filePath));
  form.append('alt', altText || '');

  const res = await fetch(`${CMS_URL}/api/admin/media`, {
    method: 'POST',
    headers: { 'X-API-Key': API_KEY },
    body: form,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
}
```

## Phase 2: Inventory your Drupal site

Query the database to understand what you're working with:

```javascript
// scripts/inventory.js
import { query, closePool } from '../lib/drupal-db.js';

// Count published nodes by content type
const types = await query(`
  SELECT n.type, COUNT(*) as count
  FROM node_field_data n
  WHERE n.status = 1 AND n.default_langcode = 1
  GROUP BY n.type
  ORDER BY count DESC
`);
console.table(types);

// Count media files
const media = await query(`
  SELECT fm.filemime, COUNT(*) as count
  FROM file_managed fm
  WHERE fm.status = 1
  GROUP BY fm.filemime
  ORDER BY count DESC
`);
console.table(media);

// Count menu items
const menus = await query(`
  SELECT menu_name, COUNT(*) as count
  FROM menu_link_content_data
  WHERE enabled = 1
  GROUP BY menu_name
`);
console.table(menus);

await closePool();
```

This gives you a clear picture of what needs to migrate.

## Phase 3: Map content types

Drupal's content model maps to WollyCMS like this:

| Drupal | WollyCMS |
|--------|----------|
| Content type | Content type |
| Node fields | Content type fields |
| Paragraph types | Block types |
| Paragraph references | Blocks in regions |
| Taxonomy vocabulary | Taxonomy vocabulary |
| Taxonomy terms | Taxonomy terms |
| Menu | Menu |
| File/Media entity | Media |

### Content type fields

Drupal stores custom field data in dedicated tables (`node__field_*`). Query them to understand the field structure:

```javascript
const fields = await query(`
  SELECT TABLE_NAME, COLUMN_NAME
  FROM information_schema.COLUMNS
  WHERE TABLE_NAME LIKE 'node__field_%'
    AND TABLE_NAME NOT LIKE '%revision%'
  ORDER BY TABLE_NAME
`);
```

Create matching content types in WollyCMS through the admin UI or API before running migration scripts.

### Paragraphs to blocks

Drupal's Paragraphs module stores structured content in `paragraph__*` tables. Each paragraph type maps to a WollyCMS block type:

| Drupal paragraph | WollyCMS block |
|------------------|----------------|
| `text` / `body` | Rich Text |
| `accordion_tab` | Accordion |
| `image` | Image |
| `embed` / `code` | Embed |
| `content_block` (generic) | Rich Text |
| `from_library` | Shared Block (reference) |

The paragraph → block mapping depends on your site. Check your Drupal paragraph types at `/admin/structure/paragraphs_type`.

## Phase 4: Migrate pages

Start with the simplest content type to validate your approach, then work through more complex types.

```javascript
// scripts/migrate-pages.js
import { query, closePool } from '../lib/drupal-db.js';
import { createPage, addBlock } from '../lib/wolly-api.js';
import { htmlToTipTap } from '../lib/html-to-tiptap.js';

const DRY_RUN = process.argv.includes('--dry-run');
const LIMIT = parseInt(process.argv[process.argv.indexOf('--limit') + 1]) || 50;

// Get published nodes with URL aliases
const nodes = await query(`
  SELECT
    n.nid, n.title, n.type, n.created, n.changed,
    ua.alias as url_alias
  FROM node_field_data n
  LEFT JOIN path_alias pa ON pa.path = CONCAT('/node/', n.nid)
    AND pa.langcode = 'en'
  LEFT JOIN url_alias ua ON ua.source = CONCAT('/node/', n.nid)
  WHERE n.status = 1
    AND n.default_langcode = 1
    AND n.type = 'page'
  ORDER BY n.nid
  LIMIT ?
`, [LIMIT]);

for (const node of nodes) {
  const slug = node.url_alias
    ? node.url_alias.replace(/^\//, '')
    : `node-${node.nid}`;

  console.log(`[nid:${node.nid}] "${node.title}" → /${slug}`);

  // Get body field (most Drupal types have one)
  const [body] = await query(`
    SELECT body_value, body_format
    FROM node__body
    WHERE entity_id = ? AND deleted = 0
  `, [node.nid]);

  if (DRY_RUN) continue;

  // Create page in WollyCMS
  const page = await createPage({
    title: node.title,
    slug,
    contentTypeId: 1, // Map to your content type ID
    status: 'published',
  });

  // Add body as rich text block
  if (body?.body_value) {
    const tiptap = htmlToTipTap(body.body_value);
    await addBlock(page.id, 'content', {
      blockTypeSlug: 'rich_text',
      fields: { body: tiptap },
    });
  }
}

await closePool();
```

:::tip[Run with --dry-run first]
Always test with `--dry-run` to see what would be created before writing to WollyCMS. Add `--limit 5` to test with a small batch.
:::

### Handling Paragraphs (structured blocks)

If your Drupal site uses the Paragraphs module, you'll need to resolve paragraph references and create corresponding WollyCMS blocks:

```javascript
// Get paragraph references for a node
async function getNodeParagraphs(nid, fieldTable) {
  return query(`
    SELECT p.entity_id as pid, p.type, p.revision_id
    FROM ${fieldTable} ref
    JOIN paragraphs_item_field_data p
      ON p.id = ref.${fieldTable.replace('node__', '')}_target_id
    WHERE ref.entity_id = ?
      AND ref.deleted = 0
    ORDER BY ref.delta
  `, [nid]);
}

// Get accordion paragraph content
async function getAccordionContent(pid) {
  const [title] = await query(`
    SELECT field_title_value as title
    FROM paragraph__field_title
    WHERE entity_id = ? AND deleted = 0
  `, [pid]);

  const [body] = await query(`
    SELECT field_body_value as body
    FROM paragraph__field_body
    WHERE entity_id = ? AND deleted = 0
  `, [pid]);

  return { title: title?.title, body: body?.body };
}
```

## Phase 5: Convert HTML to TipTap JSON

WollyCMS stores rich text as TipTap JSON. You need a converter for Drupal's HTML output:

```javascript
// lib/html-to-tiptap.js
import { JSDOM } from 'jsdom';

export function htmlToTipTap(html) {
  if (!html) return { type: 'doc', content: [] };

  const dom = new JSDOM(html);
  const body = dom.window.document.body;
  const content = [];

  for (const node of body.childNodes) {
    const block = convertNode(node);
    if (block) content.push(block);
  }

  return { type: 'doc', content };
}

function convertNode(node) {
  if (node.nodeType === 3) {
    // Text node
    const text = node.textContent.trim();
    if (!text) return null;
    return { type: 'paragraph', content: [{ type: 'text', text }] };
  }

  const tag = node.tagName?.toLowerCase();

  if (/^h[1-6]$/.test(tag)) {
    return {
      type: 'heading',
      attrs: { level: parseInt(tag[1]) },
      content: convertInline(node),
    };
  }

  if (tag === 'p') {
    const inline = convertInline(node);
    if (!inline.length) return null;
    return { type: 'paragraph', content: inline };
  }

  if (tag === 'ul' || tag === 'ol') {
    return {
      type: tag === 'ul' ? 'bulletList' : 'orderedList',
      content: Array.from(node.querySelectorAll(':scope > li')).map(li => ({
        type: 'listItem',
        content: [{ type: 'paragraph', content: convertInline(li) }],
      })),
    };
  }

  if (tag === 'blockquote') {
    return {
      type: 'blockquote',
      content: [{ type: 'paragraph', content: convertInline(node) }],
    };
  }

  if (tag === 'img') {
    return {
      type: 'image',
      attrs: {
        src: node.getAttribute('src'),
        alt: node.getAttribute('alt') || '',
      },
    };
  }

  // Fallback: treat as paragraph
  const inline = convertInline(node);
  if (inline.length) return { type: 'paragraph', content: inline };
  return null;
}

function convertInline(node) {
  const result = [];
  for (const child of node.childNodes) {
    if (child.nodeType === 3) {
      const text = child.textContent;
      if (text) result.push({ type: 'text', text });
    } else if (child.tagName) {
      const tag = child.tagName.toLowerCase();
      const marks = [];
      if (tag === 'strong' || tag === 'b') marks.push({ type: 'bold' });
      if (tag === 'em' || tag === 'i') marks.push({ type: 'italic' });
      if (tag === 'a') {
        marks.push({
          type: 'link',
          attrs: { href: child.getAttribute('href') || '' },
        });
      }

      const text = child.textContent;
      if (text) {
        const node = { type: 'text', text };
        if (marks.length) node.marks = marks;
        result.push(node);
      }
    }
  }
  return result;
}
```

:::note
This is a basic converter. Production migrations often need to handle Drupal-specific markup like `[embed]` shortcodes, `data-entity-*` attributes on media, and entity references inside paragraph fields. Extend the converter as you encounter edge cases.
:::

## Phase 6: Migrate media

### Structured media (field images)

Drupal stores media references in `node__field_*` tables. Download from the old site and upload to WollyCMS:

```javascript
// scripts/migrate-media.js
import { query, closePool } from '../lib/drupal-db.js';
import { uploadMedia } from '../lib/wolly-api.js';
import { writeFileSync, existsSync, mkdirSync } from 'fs';

// Get all image field references
const refs = await query(`
  SELECT
    n.nid, n.title, n.type,
    fm.fid, fm.uri, fm.filename
  FROM node__field_image fi
  JOIN node_field_data n ON n.nid = fi.entity_id
  JOIN file_managed fm ON fm.fid = fi.field_image_target_id
  WHERE fi.deleted = 0 AND n.status = 1
`);

mkdirSync('downloads', { recursive: true });
const mediaMap = {};

for (const ref of refs) {
  // Convert Drupal URI to download URL
  const path = ref.uri.replace('public://', '/sites/default/files/');
  const url = `https://your-drupal-site.com${path}`;
  const localPath = `downloads/${ref.filename}`;

  // Download if not cached
  if (!existsSync(localPath)) {
    const res = await fetch(url);
    if (!res.ok) { console.warn(`404: ${url}`); continue; }
    writeFileSync(localPath, Buffer.from(await res.arrayBuffer()));
  }

  // Upload to WollyCMS
  const media = await uploadMedia(localPath, ref.title);
  mediaMap[ref.fid] = media.id;
  console.log(`Uploaded ${ref.filename} → media ID ${media.id}`);
}

// Save mapping for later use
writeFileSync('data/media-map.json', JSON.stringify(mediaMap, null, 2));
await closePool();
```

### Inline media (images in rich text)

After migrating pages, scan all rich text blocks for old image URLs and rewrite them:

```javascript
// scripts/rewrite-inline-media.js
// 1. Fetch all pages from WollyCMS
// 2. Walk TipTap JSON looking for image nodes
// 3. Download images from old site, upload to WollyCMS
// 4. Replace old URLs with new WollyCMS media paths
// 5. Update blocks via PUT /api/admin/blocks/:id
```

## Phase 7: Migrate menus

Drupal's menu system stores items in `menu_link_content_data`. Build the tree and recreate in WollyCMS:

```javascript
// scripts/migrate-menus.js
import { query, closePool } from '../lib/drupal-db.js';

// Get menu items with hierarchy
const items = await query(`
  SELECT
    mlc.id, mlc.title, mlc.link__uri, mlc.link__title,
    mlc.menu_name, mlc.weight, mlc.enabled,
    mlt.depth, mlt.p1, mlt.p2, mlt.p3, mlt.p4
  FROM menu_link_content_data mlc
  JOIN menu_tree mlt ON mlt.id = CONCAT('menu_link_content:', mlc.id)
  WHERE mlc.enabled = 1
  ORDER BY mlc.menu_name, mlt.depth, mlc.weight
`);

// Build tree per menu, then create in WollyCMS:
// POST /api/admin/menus (create menu)
// POST /api/admin/menus/:id/items (create items with parent_id)
```

:::tip
Create parent items first, then children, so you have the WollyCMS parent IDs available. Process items in depth order.
:::

## Phase 8: Migrate taxonomies

```javascript
// Drupal: taxonomy_term_field_data
const terms = await query(`
  SELECT t.tid, t.name, t.vid, th.parent_target_id
  FROM taxonomy_term_field_data t
  LEFT JOIN taxonomy_term__parent th ON th.entity_id = t.tid
  WHERE t.default_langcode = 1
  ORDER BY t.vid, t.weight
`);

// WollyCMS: create vocabularies, then terms
// POST /api/admin/taxonomies (create vocabulary)
// POST /api/admin/taxonomies/:id/terms (create terms)
```

## Phase 9: Verify and go live

After migration, verify:

- [ ] Page counts match (Drupal published nodes vs WollyCMS pages)
- [ ] All images load on the Astro frontend
- [ ] Menu structure matches the Drupal site
- [ ] Internal links work (check for old `/node/123` paths)
- [ ] SEO metadata transferred (titles, descriptions)
- [ ] Taxonomy terms are assigned to the correct pages

Run a link checker against your Astro site:

```bash
npx broken-link-checker https://your-new-site.com --recursive
```

Set up redirects in your Astro frontend for any old Drupal paths that external sites link to.
