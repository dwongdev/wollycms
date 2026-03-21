---
title: "Case Study: Community College Migration"
description: How a mid-size community college migrated 1,300+ pages from Drupal 10 to WollyCMS and Astro on Cloudflare Workers.
---

This case study documents a real-world migration of a community college website from Drupal 10 to WollyCMS + Astro, deployed on Cloudflare Workers. It covers what was migrated, how the migration was structured, what went well, and what required extra work.

## The starting point

The college ran Drupal 10 on a self-hosted Apache/MySQL stack. The site had grown over many years and accumulated complexity typical of institutional Drupal installations:

**Content inventory:**

| Content type | Published nodes |
|---|---|
| Secondary pages | 167 |
| Faculty/staff profiles | 166 |
| Articles | 145 |
| Events | 637 |
| Landing pages | 5 |
| Basic pages | 22 |
| Home page | 1 |
| Other (library databases, calendars) | 166 |
| **Total** | **1,309 published** |

**Media:** 2,444 files (1.4 GB) — images, PDFs, videos, documents

**Menus:** 244 items across 4 menus (main navigation, top bar, two footer menus)

**Infrastructure:**
- 50 contributed Drupal modules
- 56 custom field definitions
- 4 custom modules (forms, SIS schedule import, field formatters, views)
- Self-hosted on a virtual server

## Why migrate

The college needed to modernize its web presence. The Drupal site worked, but it had pain points:

1. **Editor experience** — The Paragraphs-based page builder was powerful but intimidating for non-technical staff. Training new editors took significant effort.
2. **Performance** — Pages were server-rendered on every request. No CDN. Response times varied with server load.
3. **Hosting costs** — Required ongoing maintenance (security patches, PHP/MySQL updates, SSL management).
4. **Mobile experience** — The aging theme was responsive but not mobile-first.
5. **Vendor lock-in** — With 50 modules and 4 custom modules, the site was deeply coupled to Drupal's ecosystem.

The migration to WollyCMS + Astro on Cloudflare Workers addressed all five:

| Concern | Before (Drupal) | After (WollyCMS + Astro) |
|---------|-----------------|--------------------------|
| Editor UX | Paragraphs module, complex forms | Block-based editor with simple regions |
| Performance | Server-rendered, no CDN | Edge-rendered on 300+ Cloudflare PoPs |
| Hosting cost | ~$20k/year (hosting + maintenance) | $5/month (Workers Paid plan) |
| Security | Self-managed patching, PHP/MySQL attack surface | Flat HTML at the edge, no origin server |
| Mobile | Retrofitted responsive | Mobile-first Astro templates |
| Lock-in | 50 Drupal modules | Headless API, Astro frontend is swappable |

## Content type mapping

The Drupal content types mapped to WollyCMS like this:

| Drupal content type | WollyCMS content type | Key fields |
|---|---|---|
| `secondary_page` | Page (default) | Body, sidebar blocks, hero image |
| `faculty_staff` | Faculty | first_name, last_name, position, department, email, phone, photo |
| `event` | Event | start_date, end_date, location, category |
| `article` | Article | publish_date, featured_image, tags |
| `landing_page` | Landing Page | Hero image, icon buttons, content blocks |
| `page` | Page (default) | Body content |

### Paragraphs to blocks

Drupal's Paragraphs module was the page builder. Each paragraph type mapped to a WollyCMS block:

| Drupal paragraph type | WollyCMS block type | Region |
|---|---|---|
| `accordion_tab` | Accordion | content |
| `content_block` | Rich Text | content |
| `bottom_content_block` | Rich Text | bottom |
| `from_library` (shared) | Shared Block reference | sidebar |
| Hero image (field_image) | Image block | hero |
| Sidebar links | Link List | sidebar |

## Migration approach

### Infrastructure

The migration ran against a local MySQL container loaded with the Drupal database dump (449 MB). Migration scripts were Node.js, connecting to MySQL for reads and to the WollyCMS Admin API for writes.

```
Drupal MySQL dump  →  Node.js migration scripts  →  WollyCMS Admin API
(localhost:3307)       (read + transform)              (Cloudflare Workers)
```

### Script architecture

Each content type had its own migration script with a consistent pattern:

```bash
scripts/
├── migrate-secondary-pages.js   # 167 pages
├── migrate-faculty.js           # 166 profiles
├── migrate-articles.js          # 145 articles
├── migrate-events.js            # 637 events
├── migrate-landing-pages.js     # 5 pages
├── migrate-pages.js             # 22 basic pages
├── migrate-menus.js             # 244 menu items
├── migrate-taxonomies.js        # All vocabularies + terms
├── migrate-media-fields.js      # Structured media (field images)
├── migrate-inline-media.js      # Images inside rich text
├── create-shared-blocks.js      # 25 reusable blocks
├── lib/
│   ├── drupal-db.js             # MySQL query helpers
│   ├── wolly-api.js             # WollyCMS API helpers
│   └── html-to-tiptap.js        # HTML → TipTap JSON converter
└── data/
    ├── media-map.json           # Drupal file ID → WollyCMS media ID
    └── shared-block-map.json    # Drupal library item → WollyCMS block ID
```

Every script supported `--dry-run`, `--limit N`, and `--offset N` flags for incremental testing.

### Migration order

The order mattered because of dependencies:

1. **Shared blocks** — Created first because pages reference them
2. **Taxonomies** — Vocabularies and terms (pages reference terms)
3. **Secondary pages** — The bulk of the content (167 pages)
4. **Landing pages** — Complex pages with multiple block regions
5. **Faculty/staff** — Structured profiles
6. **Articles** — Blog-style posts
7. **Events** — Largest content type by count
8. **Menus** — Depends on pages existing (menu items link to page IDs)
9. **Media (structured)** — Hero images, profile photos, thumbnails
10. **Media (inline)** — Images embedded in rich text, URL rewriting

## Challenges and solutions

### HTML to TipTap JSON conversion

**Challenge:** Drupal stored body content as HTML. WollyCMS stores rich text as TipTap JSON. The conversion needed to handle:
- Standard HTML (headings, paragraphs, lists, links, bold/italic)
- Drupal-specific markup (entity references, data attributes)
- Inline images with Drupal file paths (`/sites/default/files/...`)
- Embedded iframes (Salesforce forms, YouTube videos)
- Nested lists and complex table structures

**Solution:** A custom `html-to-tiptap.js` converter using JSDOM. It walked the DOM tree and built TipTap nodes. Edge cases were handled incrementally — each migration run revealed new HTML patterns that needed converter updates.

### Shared blocks (Drupal library items)

**Challenge:** Drupal's "from_library" paragraphs referenced reusable content that appeared on many pages. Duplicating them as inline blocks would create a maintenance burden.

**Solution:** WollyCMS has native shared blocks. The migration created shared blocks first, built a mapping of Drupal library item IDs to WollyCMS block IDs, then referenced them by ID during page migration.

### Sidebar links with titles

**Challenge:** Many secondary pages had a "Related Links" sidebar with a custom title and a list of links. This was two separate Drupal fields (`field_sidebar_links_title` + `field_sidebar_links`), but WollyCMS needed it as a single block.

**Solution:** Created a Link List block type in WollyCMS with a `title` field and a `links` repeater field. The migration script merged both Drupal fields into one block.

### Menu item resolution

**Challenge:** Drupal menu items referenced nodes by internal URI (`entity:node/123`). WollyCMS menu items need either a page ID or a URL. The migration had to resolve every menu item:
- `entity:node/XX` → look up the WollyCMS page by slug
- `internal:#` → section header (label only, no link)
- `https://...` → external URL (pass through)

**Solution:** Built a slug-to-page-ID map from WollyCMS, then resolved each Drupal menu URI. Items pointing to unmigrated content got a placeholder URL and were flagged for manual review.

### Media migration in two passes

**Challenge:** Media appeared in two forms:
1. **Structured fields** — Hero images, profile photos, thumbnails (referenced by field name)
2. **Inline images** — `<img>` tags inside rich text content with old Drupal file paths

These couldn't be migrated simultaneously because inline images were inside TipTap JSON that was already written to WollyCMS.

**Solution:** Two-pass approach:
- **Pass 1** (during page migration): Log media references to `media-map.json`. Create pages and blocks without images.
- **Pass 2** (after all pages migrated): Download files from the old site, upload to WollyCMS, update page fields and rewrite URLs inside TipTap JSON blocks.

### Content that didn't migrate

Not everything came over:

- **Events (637)** — Migrated but the event listing/calendar page required custom Astro work
- **Academic calendar** — PDF-based, not CMS content, scripts used to formulate custom page with Astro
- **Forms** — Already in Salesforce, embedded as iframes (no migration needed)
- **SIS class schedule** — Custom Drupal module; rebuilt as a separate data pipeline independent of the CMS

## Results

### Content migrated

| Content | Count |
|---------|-------|
| Pages (all types) | 405 |
| Blocks (inline) | 734 |
| Shared blocks | 25 |
| Media files | 502 |
| Menu items | 244 (across 4 menus) |
| Taxonomy terms | All vocabularies preserved |
| SEO metadata | Titles + descriptions on all pages |

### Cost reduction

| | Before | After |
|---|---|---|
| Hosting | internal virtual server | $5/month (Cloudflare Workers Paid) |
| SSL | Managed separately | Free (Cloudflare) |
| CDN | None | Included (300+ global PoPs) |
| DDoS protection | None | Included |
| **Total** | **20k/year** | **$5/month** |

### Performance

- Pages render at the edge, closest to the visitor
- No origin server dependency for page loads (content cached at edge)
- Content updates are visible within seconds of publishing (cache purge + on-demand rendering)

### Security posture

The security improvement was one of the most significant outcomes of the migration. Self-hosted Drupal carries a large attack surface:

- **PHP runtime** — Drupal runs on PHP, which requires ongoing patching for both the language runtime and the web server (Apache/Nginx). Every unpatched version is an exposure window.
- **Database server** — MySQL/MariaDB accessible on the network, requiring credential management, access controls, and regular security updates.
- **Drupal core + 50 modules** — Each contributed module is a potential vulnerability. Drupal security advisories are frequent, and applying them requires testing against the full module dependency graph.
- **File system access** — User-uploaded files stored on the server's filesystem. Misconfigured upload handlers have been a historic attack vector.
- **Custom modules** — Four custom modules that received no external security review.
- **SSL/TLS management** — Certificate provisioning, renewal, and configuration were manual.

After migration, the public-facing site is **flat HTML served from Cloudflare's edge network**. There is no origin server, no PHP runtime, no database, and no file system exposed to the internet:

| Attack vector | Before (Drupal) | After (Astro on Cloudflare) |
|---|---|---|
| Server OS vulnerabilities | Exposed | No server |
| PHP/runtime exploits | Exposed | No runtime |
| SQL injection | Possible (database exposed) | No database on the public site |
| File upload exploits | Possible | No file uploads on the public site |
| DDoS | Unprotected | Cloudflare DDoS mitigation (automatic) |
| SSL misconfiguration | Self-managed | Cloudflare-managed (automatic) |
| CMS admin access | Public-facing login page | WollyCMS admin behind Cloudflare Access |

The CMS itself (WollyCMS on Cloudflare Workers) runs as a serverless function with no persistent infrastructure to patch. The admin API is authenticated and can be further protected with Cloudflare Access for zero-trust authentication.

### Editor experience

The WollyCMS admin UI replaced Drupal's Paragraphs-based editor with a simpler block interface:
- Editors manage content in named regions (hero, content, sidebar, bottom)
- Block types are purpose-built (Rich Text, Image, Accordion, Embed, Link List)
- Shared blocks work the same way — edit once, updates everywhere
- No Drupal module configuration, Views, or display modes to manage

## Role of AI in the migration

AI coding assistants (Claude) were used extensively throughout the migration. Rather than writing every migration script from scratch, the developer described the Drupal source schema and the WollyCMS target format, and the AI generated the migration scripts, the HTML-to-TipTap converter, and the media pipeline. The human's role shifted from writing boilerplate to:

- **Describing the problem** — "Drupal stores accordion content in `paragraph__field_body` with a title in `paragraph__field_title`, and I need these as Accordion blocks in WollyCMS's content region"
- **Running and inspecting results** — Executing scripts with `--dry-run` and `--limit 5`, reviewing the output, and reporting back what was wrong
- **Iterating on edge cases** — "The converter doesn't handle nested lists inside accordion items" or "This Drupal field stores a taxonomy reference, not a plain text value"
- **Making architectural decisions** — Choosing the migration order, deciding what content to skip, and defining how Drupal concepts mapped to WollyCMS

This pattern — human as architect and reviewer, AI as code generator — made the migration feasible as a part-time project. Writing 40+ migration scripts manually would have taken significantly longer. The AI was particularly effective at generating repetitive Drupal MySQL queries (each content type has its own set of `node__field_*` tables) and at building the HTML-to-TipTap converter incrementally as new HTML patterns were discovered.

## Lessons learned

1. **Start with the simplest content type.** Secondary pages were straightforward — one body field, a few blocks. Getting the migration script pattern right on simple content made the complex types (landing pages, faculty profiles) much easier.

2. **The HTML → TipTap converter needs iterating.** Every content type revealed new HTML patterns. Build the converter incrementally, not upfront. Run a batch, inspect the output, extend the converter, repeat.

3. **Shared blocks first, pages second.** If your Drupal site uses "from_library" paragraphs, migrate the library items before pages so you have the ID mapping ready.

4. **Media in two passes.** Don't try to download, upload, and link media during page migration. It's too many operations at once. Migrate pages first, then media as a separate pass.

5. **Always run --dry-run first.** Every script should support a dry-run mode that logs what would happen without writing anything. This catches mapping errors before they create data you have to clean up.

6. **Menus come last.** Menu items reference pages by ID. All pages must exist before you can build the menu tree.

7. **Not everything needs to migrate.** Legacy content types, abandoned modules, and administrative pages often don't need to come over. An honest inventory of what's actually used can cut migration scope significantly.

8. **The CMS is not the hard part.** Setting up WollyCMS and mapping content types takes a day. Writing migration scripts takes a few days. Building the Astro frontend templates to match (or improve on) the old site design is where most of the time goes.

## Timeline

The full migration — from initial analysis to production deployment — took approximately three weeks of part-time work:

- **Phase 1:** Inventory, content type mapping, WollyCMS setup, migration script architecture
- **Phase 2:** Content migration (pages, blocks, media, menus), HTML converter iterations
- **Phase 3:** Astro frontend templates, testing, URL redirects, DNS cutover
