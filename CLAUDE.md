# SpacelyCMS — Project Instructions

## Project Overview

SpacelyCMS is a self-hosted, open-source headless CMS designed for Astro.js.
It provides composable block-based page building with reusable content blocks,
hierarchical menus, taxonomy management, and media handling.

## Tech Stack

- **Runtime**: Node.js 22 LTS, TypeScript (strict mode, ESM)
- **API Framework**: Hono 4.x
- **ORM**: Drizzle (SQLite default, PostgreSQL supported)
- **Admin UI**: SvelteKit (SPA mode)
- **Rich Text**: TipTap (JSON storage format)
- **Media**: Sharp for image processing
- **Testing**: Vitest
- **Package Management**: npm workspaces (monorepo)

## Project Structure

```
packages/server/    — Hono API server + Drizzle schema + media processing
packages/admin/     — SvelteKit admin UI
packages/astro/     — @spacelycms/astro npm integration package
examples/           — Reference Astro site
docs/               — Architecture and planning documentation
scripts/            — Build, deploy, migration scripts
```

## Build Commands

```bash
# Install all workspace dependencies
npm install

# Development (all packages)
npm run dev

# Build all packages
npm run build

# Run tests
npm run test

# Lint
npm run lint
```

## Test Commands

```bash
# Run all tests
npm run test

# Run server tests only
npm run test --workspace=packages/server

# Run with coverage
npm run test:coverage
```

## Architecture Key Points

- Content is stored as structured JSON (not HTML)
- Pages have named regions (main, sidebar, bottom) containing ordered blocks
- Blocks can be inline (page-specific) or shared/reusable (from block library)
- TipTap rich text stored as JSON, rendered by Astro components
- Content API is public/read-only; Admin API is authenticated
- Media stored on local filesystem (dev) or S3-compatible (prod)
- All API routes prefixed: `/api/content/*` (public) and `/api/admin/*` (auth)

## Important Patterns

- Use Zod schemas for all API input validation
- Drizzle schema is the single source of truth for database structure
- Block type schemas are JSON — define field types, validation, and UI hints
- All timestamps are ISO 8601 UTC
- Slugs are auto-generated from titles, manually overridable, unique enforced
- Shared blocks track references — cannot be deleted while in use

## Documentation

All architecture decisions, data models, API specs, and requirements are in `/docs`.
Read these before making structural changes:

- `docs/architecture/overview.md` — System design
- `docs/architecture/data-model.md` — Database schema
- `docs/architecture/block-system.md` — Block composition model
- `docs/architecture/api-design.md` — API endpoints
- `docs/architecture/astro-integration.md` — Astro package design
- `docs/planning/requirements.md` — Feature requirements
- `docs/planning/roadmap.md` — Implementation phases
- `docs/planning/tech-stack.md` — Technology choices
