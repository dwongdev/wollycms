# Southside Virginia Community College — Drupal Site Analysis

> Analysis of the Drupal 9/10 database backup for southside.edu
> Performed: 2026-03-05
> Source: `/home/chad/work/projects/drupalupgrade/database.sql` (120MB)

## Purpose

This analysis serves as a **reference architecture** for SpacelyCMS. Southside.edu
represents a real-world, mid-size institutional website with complex content
composition needs. Understanding its architecture informs what SpacelyCMS must
support to be viable for content-heavy sites.

SpacelyCMS is not being built exclusively for this site — it is a general-purpose
headless CMS for Astro.js. But this site is the validation target.

---

## Site Overview

- **Platform**: Drupal 9/10 on MariaDB 10.5
- **Type**: Community college institutional website
- **Database tables**: 296
- **Total content nodes**: 1,588
- **Total files**: 2,413 (1.17 GB)
- **URL aliases**: 1,943
- **Redirects**: 251

---

## Content Types

| Content Type | Count | Published | Unpublished | Purpose |
|---|---|---|---|---|
| event | 642 | 637 | 5 | Campus events, academic calendar entries |
| article | 386 | 371 | 15 | News articles, announcements |
| secondary_page | 197 | 158 | 39 | Interior pages with paragraph-based layouts |
| faculty_staff | 174 | 165 | 9 | Staff directory entries |
| library_database | 138 | 138 | 0 | Library/research database links |
| page | 35 | 22 | 13 | Simple pages (likely legacy) |
| program_category | 10 | 10 | 0 | Academic program groupings |
| landing_page | 5 | 5 | 0 | Section landing pages with hero/slider |
| home_page | 1 | 1 | 0 | Homepage (unique content type) |

### Key Observations

- **Events dominate** (40% of content) — any CMS for this site needs strong date
  handling and calendar views
- **secondary_page** is the workhorse content type — uses Paragraphs for composable
  layouts with sidebar/bottom regions
- **faculty_staff** is essentially a structured data type (name, title, phone,
  email, department, photo) — demonstrates need for typed fields
- **library_database** shows need for simple structured content types (name, URL,
  description, category)

---

## Paragraph Types (Block Composition)

| Paragraph Type | Count | % | Purpose |
|---|---|---|---|
| accordion_tab | 593 | 52.9% | FAQ-style expandable content sections |
| bottom_content_block | 176 | 15.7% | Content blocks in bottom page region |
| content_block | 160 | 14.3% | Rich content blocks in main region |
| from_library | 86 | 7.7% | References to reusable paragraph library items |
| slide | 40 | 3.6% | Carousel/slider slides on landing pages |
| library_block | 34 | 3.0% | Library-specific content blocks |
| landing_bottom_block | 12 | 1.1% | Bottom blocks specific to landing pages |
| quick_link | 9 | 0.8% | Quick navigation link items |
| landing_block | 8 | 0.7% | Hero/feature blocks for landing pages |
| icon_button | 4 | 0.4% | Icon + link button elements |

### Key Observations

- **Accordions are everywhere** — over half of all paragraph instances. This is
  the primary way SVCC organizes dense information
- **from_library (86 instances)** — these reference the 24 reusable paragraph
  library items. This is the "shared block" pattern we need
- **Region-specific types** (content_block vs bottom_content_block vs
  landing_block) suggest pages have 2-3 named regions where blocks can be placed
- Only **10 paragraph types** handle the entire site — block systems don't need
  hundreds of types, just well-designed composable ones

---

## Reusable Blocks (Paragraph Library)

The site has **24 reusable paragraph library items** that are referenced **86 times**
across pages via the `from_library` paragraph type.

This is the exact pattern SpacelyCMS must support: create a block once (e.g.,
"Financial Aid Office" sidebar with address, phone, hours), then reference it from
any page. Update it in one place, it changes everywhere.

---

## Menu System

| Menu | Links | Enabled | Max Depth |
|---|---|---|---|
| main | 214 | 203 | 5 levels |
| top | 26 | 24 | 2 levels |
| footer | 6 | 6 | 1 level |
| footer-2 | 6 | 6 | 1 level |

### Main Menu Structure

- **Level 1** (7 items): Admissions, Academics, Workforce, Student Life, About
  SVCC, Getting Started, Apply Now
- **Level 2**: 24 items
- **Level 3**: 129 items (bulk of the menu)
- **Level 4**: 53 items
- **Level 5**: 1 item
- **40 items** serve as parent containers (have children but may not link anywhere)

### Key Observations

- 5-level deep hierarchical menus are a hard requirement
- Menu items can be **parent containers** (no URL, just group children)
- Menu items can link to internal pages OR external URLs
- Multiple independent menus must coexist (main, top, footer variants)
- The main menu has **214 links** — menu management UI must handle large trees

---

## Taxonomy / Vocabularies

| Vocabulary | Terms | Purpose |
|---|---|---|
| search_tags | 274 | Internal search indexing tags |
| department | 26 | Faculty/staff department categorization |
| library_categories | 19 | Library database categorization |
| tags | 15 | Article/content tagging (News, Alumni, etc.) |
| event_categories | 10 | Event type classification |
| semesters | 3 | Academic semester references |

### Key Observations

- Taxonomies serve two purposes: **categorization** (department, event type) and
  **filtering** (search tags, semesters)
- Terms can be hierarchical (parent/child)
- Content references terms via entity reference fields
- Term pages exist (e.g., `/tag/news` lists all news articles)

---

## Files and Media

| MIME Type | Count | % |
|---|---|---|
| image/jpeg | 922 | 38.2% |
| image/png | 827 | 34.3% |
| application/pdf | 358 | 14.8% |
| text/plain | 104 | 4.3% |
| video/mp4 | 57 | 2.4% |
| audio/mpeg | 37 | 1.5% |
| image/webp | 32 | 1.3% |
| image/svg+xml | 25 | 1.0% |
| application/vnd.openxmlformats-officedocument.wordprocessingml.document | 23 | 1.0% |
| Other (html, css, csv, gif, etc.) | 28 | 1.2% |

**Total**: 2,413 files, 1.17 GB

### Key Observations

- **75% are images** — image optimization (resize, WebP conversion, responsive
  srcset) is critical
- **358 PDFs** — must support PDF upload, display, and linking
- **57 videos + 37 audio files** — media system needs to handle non-image types
- Alt text and metadata storage is required for accessibility
- File size varies enormously — from tiny icons to large videos

---

## URL Aliases and Redirects

### Aliases (1,943 total)

| Pattern | Count |
|---|---|
| /event/* | 642 |
| /article/* | 382 |
| /term/* | 332 |
| /tag/* | 15 |
| /program-category/* | 10 |
| /form/* | 8 |
| /location/* | 7 |
| Custom paths | ~547 |

### Redirects: 251

Many redirects exist for maintaining old URL paths after content restructuring.

### Key Observations

- Clean URLs are a hard requirement
- URL patterns follow content type conventions but allow overrides
- Redirects must be manageable (old URL → new URL with status code)
- Some pages have completely custom paths (not following any pattern)

---

## Other Systems

### Webforms
- Only **1 webform** (contact form) — form building is low priority for v1

### Search
- Search API with indexed fields and facets — search is important but can be
  handled by external services (Algolia, Meilisearch, Pagefind for Astro)

### External Data
- Class schedule data imported from CSV (SIS system) — suggests need for data
  import/external content source capability in later phases

### Views (Dynamic Listings)
- Faculty directory with alphabetical filtering
- News listing with pagination
- Event calendar (FullCalendar integration)
- These are **saved queries** — content listing pages filtered/sorted by criteria

---

## Implications for SpacelyCMS

### Must-Have (informed by this analysis)

1. **Composable block/region system** with reusable library blocks
2. **Hierarchical menu system** (5+ levels, multiple menus, container items)
3. **Typed content schemas** (define fields per content type)
4. **Media library** with image optimization
5. **Clean URL management** with redirects
6. **Taxonomy system** with hierarchical terms
7. **Rich text editing** within blocks (WYSIWYG)
8. **Content status** (draft/published)
9. **Dynamic listings** (filtered/sorted content queries as page blocks)

### Nice-to-Have (can be phased in)

1. Visual drag-drop page builder
2. Live preview in Astro
3. Form builder
4. Full-text search integration
5. External data source imports
6. Content scheduling (publish on date)
7. Revision history
8. Multi-user roles and permissions
