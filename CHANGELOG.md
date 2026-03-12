# Changelog

All notable changes to WollyCMS are documented here.

WollyCMS is pre-1.0. The API surface may change between releases.

## Unreleased

### Security
- **API key permissions enforced** — Keys now map to roles based on stored permissions (`content:read` → viewer, `content:write` → editor, `*` → admin). Previously all keys received blanket admin access.
- **JWT secret enforcement** — Node.js production startup fails if `JWT_SECRET` is missing or uses the dev default.
- **Webhook SSRF hardening** — DNS resolution check blocks private-IP rebinding. Redirects are rejected. CGNAT range added to blocklist.
- **Rate limiter** — Prefers `CF-Connecting-IP` over spoofable `X-Forwarded-For`.

## 2026-03-11

### Added
- Repeater field item reordering
- Subquery-based taxonomy filtering (avoids D1 parameter limits)

### Fixed
- SEO fields now returned in admin page GET response
- Block collapse state preserved during drag reorder
- Repeater item reorder no longer swaps rich text content

## 2026-03-10

### Added
- Alert block type (ID 13) for emergency/info banners
- Auto-apply D1 migrations in deploy workflow
- Page search in menu item editor

### Changed
- Alert controls moved from Settings to homepage editor sidebar
- Removed `site_alerts` table from core (replaced by block type 13)

## 2026-03-09

### Added
- WYSIWYG editor overhaul: source view, image sizing/wrapping/captions, format dropdown, alignment, subscript/superscript
- Revision notes on save
- Link target option (open in new tab)
- Accessibility issue highlighting in editor
- Sticky toolbar on long content
- Media upload and rich link dialog in WYSIWYG
- Alt text on inline images
- Slug field on create page form

### Fixed
- Svelte 5 migration: `$app/state` syntax, deprecated `svelte:component` removed
- Preview works cross-origin for production deployments
- Block field saves deferred until page Save is clicked
- Media document type filter

## 2026-03-08

### Added
- Cloudflare Workers deployment support (D1, R2, Web Crypto)
- GitHub Actions CI for Docker image builds
- Cloudflare deploy workflow with auto D1 migrations
- OG image auto-generation (Satori + Sharp)
- Taxonomy term picker in page editor
- Calendar quick links block type
- Media picker search, type filter, and pagination

### Fixed
- Admin SPA routing under `/admin` base path
- Auto-migrate on startup + first-run onboarding setup
- SQLite volume permissions in Docker
- Workers compatibility for OG generator
- Variant fallback when processed image unavailable

## 2026-03-06

### Added
- PostgreSQL support with dual-dialect Drizzle architecture
- S3/R2 media storage backend
- Embed block type
- Scheduled publishing
- CLI import command
- JSON-LD helpers
- ETag caching and conditional responses
- Admin global search (Ctrl+K)
- Public content search API
- Production Docker Compose with Caddy reverse proxy
- CLI type generation (`wolly types generate`)

### Security
- MIME whitelist for uploads
- Upload size limits
- Error message sanitization
- Preview auth hardening
- Webhook URL validation

## 2026-03-04

### Added
- Phase 5: Webhooks (HMAC-SHA256 signed), API keys, audit logging, rate limiting, CORS, cache headers, batch API, health check
- Phase 4.5: Admin UI polish — icons, toasts, keyboard shortcuts, breadcrumbs, inline editing, slash commands, table toolbar, multi-user presence

## 2026-03-02

### Added
- Phase 4: Live preview system, visual multi-region page builder, cross-region drag-and-drop
- Block region moves, shared block picker, revision diff view
- Rich text media picker

## 2026-02-28

### Added
- Phase 1-3: Data foundation, Content API, Astro integration, Admin UI
- Block composition with typed blocks in named regions
- Hierarchical menus with drag-drop editing
- Media library with Sharp image processing
- SvelteKit admin SPA
- RBAC (admin, editor, viewer)
- Page duplication and bulk operations
- Revision history
- Content scheduling, export/import, redirects
- 12 block types, 3 content types, TipTap rich text
