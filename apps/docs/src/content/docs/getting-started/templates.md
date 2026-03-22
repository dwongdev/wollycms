---
title: Starter Templates
description: Get started quickly with pre-built content types, blocks, pages, and menus for common site types.
---

WollyCMS includes starter templates with ready-to-import seed data. Each template gives you content types, block types, sample pages with blocks, menus, and taxonomies — so you can start building immediately instead of from scratch.

## Available templates

| Template | Content Types | Block Types | Pages | Best for |
|---|---|---|---|---|
| **blog** | 2 | 4 | 5 | Personal or company blogs |
| **marketing** | 3 | 8 | 5 | Product and business sites |
| **wordpress** | 2 | 5 | 8 | Migrating from WordPress |
| **drupal** | 4 | 8 | 10 | Migrating from Drupal |
| **college** | 6 | 10 | 12 | Higher education institutions |

## Using a template

### With create-wolly (recommended)

```bash
npx create-wolly my-site --template blog
cd my-site
npm run migrate
wolly import seed.json
npm run dev
```

The `--template` flag copies the seed file into your project. If you skip it, you'll be prompted to choose.

### Manual import

If you already have a WollyCMS instance running, download the seed file and import it:

```bash
wolly import templates/blog/seed.json
```

Or from the admin UI: **Settings → Data Management → Import Content** and upload the seed.json file.

:::caution
Importing into an existing site with content will skip records that already exist (deduplicates by slug). It won't overwrite your data, but you may get duplicate block types if slugs differ.
:::

## Blog

A personal or company blog with articles, tags, and a clean content model.

**Content types:**
- `blog_post` — regions: hero, content. Fields: excerpt, author, tags, published_date, featured_image
- `page` — regions: hero, content, sidebar

**Block types:** Rich Text, Hero, Image, CTA Button

**Pages:** Home, About, 3 sample blog posts

**Taxonomies:** Tags (technology, tutorial, news, opinion)

**Menu:** Main navigation (Home, Blog, About)

---

## Marketing

A product or business marketing site with landing pages, feature grids, and pricing.

**Content types:**
- `home_page` — regions: hero, content, features, bottom
- `landing_page` — regions: hero, content, features, bottom
- `page` — regions: hero, content, sidebar

**Block types:** Rich Text, Hero, CTA Button, Feature Grid, Stat Bar, Image, Accordion, Embed

**Pages:** Home (hero + features + stats), Features, Pricing (FAQ accordion), About, Contact

**Menu:** Main navigation (Features, Pricing, About, Contact)

---

## WordPress

Familiar structure for teams migrating from WordPress. Posts and pages with categories and tags.

**Content types:**
- `post` — regions: content, sidebar. Fields: excerpt, author, categories, featured_image, published_date
- `page` — regions: hero, content, sidebar

**Block types:** Rich Text, Hero, Image, CTA Button, Embed

**Pages:** Home, Blog, About, Contact, Privacy Policy, 3 sample posts

**Taxonomies:** Categories (hierarchical: Uncategorized, News, Tutorials), Tags (wordpress, migration, cms)

**Menus:** Main navigation, Footer navigation

### WordPress → WollyCMS concept mapping

| WordPress | WollyCMS |
|---|---|
| Posts | Pages with `post` content type |
| Pages | Pages with `page` content type |
| Categories | Taxonomy (hierarchical) |
| Tags | Taxonomy (flat) |
| Featured Image | `featured_image` field (media type) |
| Gutenberg Blocks | WollyCMS block types |
| Menus | Menus |
| Plugins | Lifecycle hooks + block types |

---

## Drupal

Familiar structure for teams migrating from Drupal. Content types, taxonomy vocabularies, and regions.

**Content types:**
- `article` — regions: hero, content, sidebar. Fields: body_summary, author, tags, published_date
- `basic_page` — regions: hero, content, sidebar, bottom
- `landing_page` — regions: hero, content, features, bottom
- `event` — regions: hero, content, sidebar. Fields: event_date, event_time, location, registration_url

**Block types:** Rich Text, Hero, Image, CTA Button, Accordion, Contact List, Location, Content Listing

**Pages:** Home, About, News, Events, Contact, 3 articles, 2 events

**Taxonomies:** Tags, Content Category (hierarchical: News, Events, Resources)

### Drupal → WollyCMS concept mapping

| Drupal | WollyCMS |
|---|---|
| Content Types | Content Types |
| Nodes | Pages |
| Paragraphs | Block types in regions |
| Taxonomy Vocabularies | Taxonomies |
| Terms | Terms |
| Regions (Block Layout) | Page regions (hero, content, sidebar) |
| Views | Content Listing block type |
| Menus | Menus |
| Modules | Lifecycle hooks + block types |

---

## College

Higher education site template based on real-world community college deployments. Programs, events, departments, and admissions content.

**Content types:**
- `home_page` — regions: hero, content, features, bottom
- `landing_page` — regions: hero, content, features, bottom
- `secondary_page` — regions: hero, content, sidebar, bottom
- `program` — regions: hero, content, sidebar. Fields: department, degree_type, credits, application_url
- `article` — regions: hero, content, sidebar
- `event` — regions: hero, content, sidebar. Fields: event_date, event_time, location, registration_url

**Block types:** Rich Text, Hero, Image, CTA Button, Accordion, Contact List, Location, Content Listing, Link List, Embed

**Pages:** Home, About, Admissions, Academics, Student Life, Campus Map, Contact, 2 programs, 2 articles, 1 event

**Taxonomies:** Departments (hierarchical: Business, Sciences, Arts & Humanities, Health Sciences, Technology), Tags

**Menus:** Main navigation, Footer navigation
