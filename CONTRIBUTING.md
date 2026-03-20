# Contributing to WollyCMS

Thanks for your interest in contributing to WollyCMS.

## Maintenance Note

WollyCMS is a side project maintained in spare time. Please set expectations accordingly:

- Issue and PR response times may be days to weeks
- Feature requests are tracked but may not be implemented quickly
- PRs that include tests and follow existing patterns are most likely to be merged

This project was built entirely with [Claude Code](https://claude.com/claude-code).

## Getting Started

```bash
git clone https://github.com/wollycms/wollycms.git && cd wollycms
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev          # API server at http://localhost:4321
npm run dev:admin    # Admin UI at http://localhost:4324
npm run dev:site     # Example site at http://localhost:4322
```

## Development

### Monorepo Structure

```
packages/server/     — Hono API, Drizzle ORM, media processing
packages/admin/      — SvelteKit admin UI (SPA)
packages/astro/      — @wollycms/astro integration package
packages/create-wolly/ — CLI scaffolding tool
examples/college-site/ — Reference Astro site
```

### Running Tests

```bash
npm run test                              # All tests
npm run test --workspace=packages/server  # Server only
```

Tests use Vitest with an in-memory SQLite database. The test database is created fresh for each run.

### Database Changes

1. Modify the Drizzle schema in `packages/server/src/db/schema/`
2. Generate a migration: `npm run db:generate`
3. Apply it: `npm run db:migrate`

WollyCMS supports both SQLite and PostgreSQL. Schema changes must work for both dialects. SQLite schemas are in `schema/`, PostgreSQL schemas in `schema-pg/`.

### Code Style

- TypeScript strict mode, ESM modules
- Zod for all API input validation
- Hono middleware pattern for auth, rate limiting, RBAC
- No files over 300 lines — split if larger
- No functions over 50 lines

## Pull Requests

1. Fork the repo and create a feature branch from `main`
2. Make your changes
3. Ensure all tests pass (`npm run test`)
4. Ensure TypeScript compiles (`npm run build --workspace=packages/server`)
5. Open a PR with a clear description of what and why

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add webhook retry with exponential backoff
fix: prevent duplicate slug creation on concurrent requests
docs: update API design doc with batch endpoint
test: add security tests for API key permissions
```

## Reporting Bugs

Open a [GitHub issue](https://github.com/wollycms/wollycms/issues) with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- WollyCMS version / environment (Node.js, Docker, Workers)

## Security

See [SECURITY.md](SECURITY.md) for reporting vulnerabilities. Do not open public issues for security bugs.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
