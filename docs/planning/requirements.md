# WollyCMS — Requirements

## Target Users

### Primary: Webmasters / Content Editors
- Non-developers who manage content for organizational websites
- Comfortable with web UIs but not code
- Need WYSIWYG editing, media management, clean URL control
- Currently using Drupal, WordPress, or similar traditional CMS

### Secondary: Developers
- Build and maintain the Astro frontend
- Define content types, block types, and templates
- Configure integrations and deployment

---

## Functional Requirements

### R1: Content Type System

| ID | Requirement | Priority |
|---|---|---|
| R1.1 | Define custom content types with named, typed fields | Must |
| R1.2 | Support field types: text, richtext, number, boolean, date, media, reference, repeater, select | Must |
| R1.3 | Content types define named regions where blocks can be placed | Must |
| R1.4 | Each region can restrict which block types are allowed | Should |
| R1.5 | Content types are manageable via admin UI | Must |
| R1.6 | Content types can be seeded/exported as JSON for version control | Should |
| R1.7 | Field validation rules (required, min/max, pattern) | Must |

### R2: Block Composition System

| ID | Requirement | Priority |
|---|---|---|
| R2.1 | Define block types with schemas (typed fields) | Must |
| R2.2 | Create block instances with content conforming to their schema | Must |
| R2.3 | Place blocks into page regions with explicit ordering | Must |
| R2.4 | Support inline blocks (page-specific, not reused) | Must |
| R2.5 | Support reusable/shared blocks (created once, referenced many times) | Must |
| R2.6 | Track which pages reference a shared block (usage report) | Should |
| R2.7 | Field-level overrides when referencing a shared block | Should |
| R2.8 | Block Library UI for browsing/managing reusable blocks | Must |
| R2.9 | Prevent deletion of shared blocks while referenced | Must |
| R2.10 | Ship with standard block types (rich text, accordion, CTA, etc.) | Must |

### R3: Page Management

| ID | Requirement | Priority |
|---|---|---|
| R3.1 | Create, edit, publish, unpublish, delete pages | Must |
| R3.2 | Draft/published status workflow | Must |
| R3.3 | Clean URL slugs (auto-generated, manually editable) | Must |
| R3.4 | Unique slug enforcement | Must |
| R3.5 | Page duplication | Should |
| R3.6 | Revision history with rollback | Could |
| R3.7 | Scheduled publishing (publish on date) | Could |
| R3.8 | Bulk operations (publish/unpublish/delete multiple) | Should |

### R4: Menu System

| ID | Requirement | Priority |
|---|---|---|
| R4.1 | Multiple independent menus (main, top, footer, etc.) | Must |
| R4.2 | Hierarchical menu items (5+ levels deep) | Must |
| R4.3 | Menu items link to internal pages or external URLs | Must |
| R4.4 | Menu items can be non-linking containers (parent-only) | Must |
| R4.5 | Drag-and-drop menu tree editor in admin UI | Must |
| R4.6 | Menu item attributes (CSS class, icon, target) | Should |
| R4.7 | Enable/disable individual menu items | Should |

### R5: Taxonomy System

| ID | Requirement | Priority |
|---|---|---|
| R5.1 | Create vocabularies (flat or hierarchical) | Must |
| R5.2 | Create, edit, delete terms within vocabularies | Must |
| R5.3 | Associate content with taxonomy terms | Must |
| R5.4 | Filter content by taxonomy term via API | Must |
| R5.5 | Term pages (listing of content tagged with a term) | Should |
| R5.6 | Hierarchical terms (parent/child) | Should |

### R6: Media Library

| ID | Requirement | Priority |
|---|---|---|
| R6.1 | Upload images, PDFs, documents, video, audio | Must |
| R6.2 | Browsable media library with grid/list views | Must |
| R6.3 | Search media by filename, alt text, type | Must |
| R6.4 | Image optimization: auto-resize, WebP conversion | Must |
| R6.5 | Responsive image variants (thumbnail, medium, large) | Must |
| R6.6 | Alt text and title metadata per media item | Must |
| R6.7 | Usage tracking (which content uses which media) | Should |
| R6.8 | Drag-and-drop upload | Should |
| R6.9 | Pluggable storage backends (local, S3, R2) | Must |
| R6.10 | Bulk upload | Should |

### R7: Rich Text Editing

| ID | Requirement | Priority |
|---|---|---|
| R7.1 | WYSIWYG rich text editor in admin UI | Must |
| R7.2 | Formatting: headings, bold, italic, lists, links, blockquotes | Must |
| R7.3 | Insert images from media library | Must |
| R7.4 | Insert internal page links | Should |
| R7.5 | Table support | Should |
| R7.6 | Code blocks with syntax highlighting | Could |
| R7.7 | Store as structured JSON (TipTap format), not raw HTML | Must |
| R7.8 | Paste from Word/Google Docs with cleanup | Should |

### R8: URL & Redirect Management

| ID | Requirement | Priority |
|---|---|---|
| R8.1 | Clean URL aliases per page (auto-generated from title) | Must |
| R8.2 | Manual URL alias override | Must |
| R8.3 | 301/302 redirect management | Must |
| R8.4 | Redirect import from CSV | Should |
| R8.5 | Auto-create redirect when page slug changes | Should |

### R9: Astro Integration

| ID | Requirement | Priority |
|---|---|---|
| R9.1 | npm package installable in any Astro project | Must |
| R9.2 | Client for fetching pages, menus, taxonomies, media | Must |
| R9.3 | BlockRenderer component mapping block types to Astro components | Must |
| R9.4 | Dynamic route generation from CMS pages | Must |
| R9.5 | Menu helper utilities (tree traversal, active state) | Must |
| R9.6 | Image helper component (responsive srcset) | Must |
| R9.7 | Rich text renderer (TipTap JSON → HTML) | Must |
| R9.8 | TypeScript type generation from CMS schemas | Should |
| R9.9 | Preview mode for draft content | Should |
| R9.10 | Works with SSG, SSR, and hybrid Astro modes | Must |
| R9.11 | Platform agnostic (Cloudflare, Vercel, Netlify, Node, etc.) | Must |

### R10: Admin UI

| ID | Requirement | Priority |
|---|---|---|
| R10.1 | Web-based admin interface (SPA) | Must |
| R10.2 | Page editor with region-based block composition | Must |
| R10.3 | Content type and block type schema editor | Must |
| R10.4 | Media library browser with upload | Must |
| R10.5 | Menu tree editor with drag-and-drop | Must |
| R10.6 | Taxonomy manager | Must |
| R10.7 | Redirect manager | Must |
| R10.8 | User management (basic roles) | Must |
| R10.9 | Dashboard with recent activity | Should |
| R10.10 | Visual page builder with drag-drop block reordering | Could (Phase 4) |
| R10.11 | Live preview in Astro site | Could (Phase 4) |

### R11: Authentication & Authorization

| ID | Requirement | Priority |
|---|---|---|
| R11.1 | Email/password authentication for admin users | Must |
| R11.2 | JWT or session-based auth for API access | Must |
| R11.3 | Role-based access (admin, editor, viewer) | Should |
| R11.4 | Content-type-level permissions | Could |

### R12: Content Listings (Dynamic Queries)

| ID | Requirement | Priority |
|---|---|---|
| R12.1 | Block type that renders a filtered/sorted content query | Must |
| R12.2 | Filter by content type, taxonomy, date range | Must |
| R12.3 | Sort by date, title, custom field | Must |
| R12.4 | Configurable display (card grid, list, table) | Should |
| R12.5 | Pagination support | Must |

---

## Non-Functional Requirements

| ID | Requirement | Priority |
|---|---|---|
| NF1 | Self-hosted — runs anywhere Node.js runs | Must |
| NF2 | Zero-config development setup (SQLite, local media) | Must |
| NF3 | Production-ready with PostgreSQL + S3 | Must |
| NF4 | API response time < 200ms for content reads | Must |
| NF5 | Handle 2,000+ pages without performance degradation | Must |
| NF6 | Admin UI responsive (usable on tablet) | Should |
| NF7 | Content API cacheable (ETags, Cache-Control) | Must |
| NF8 | Webhook support for build triggers | Must |
| NF9 | Export/import content as JSON | Should |
| NF10 | Docker deployment support | Must |
| NF11 | Open source (MIT license) | Must |
