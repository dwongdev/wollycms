# Changelog

## 2026-03-07

### Security hardening sprint (batch 1)

- Removed preview token-in-URL flow for admin preview.
- Added `POST /api/admin/auth/preview-session` to mint a short-lived (`10m`) HttpOnly `wolly_preview` cookie.
- Updated preview auth to accept `Authorization` header or `wolly_preview` cookie; query-param tokens are rejected.
- Hardened upload safety by removing active web content types/extensions (`.svg`, `.html`, `.css`, `.js`, `.xml`) from upload allowlists.
- Added upload response hardening with CSP sandbox and forced attachment for non-inline-safe content types.
- Tightened RBAC:
  - `editor+` required for content mutation routes (`pages`, `blocks`, `menus`, `taxonomies`, `redirects`, `media`).
  - `admin` required for `webhooks` and `api-keys` routes.
- Added webhook outbound URL safety policy to block local/private/internal targets and non-HTTP(S) URLs.
- Sanitized request logging to omit query strings from logs.
- Added/updated server tests for preview session cookie, preview auth behavior, and RBAC restrictions.
