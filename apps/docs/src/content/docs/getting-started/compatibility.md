---
title: Compatibility
description: Supported Node.js, Astro, database, and deployment versions for WollyCMS 0.3.
---

## WollyCMS 0.3 support matrix

| Component | Supported or recommended version |
|---|---|
| Node.js | 22 LTS |
| npm | 10 or later |
| Astro | 5, 6, or 7 |
| SQLite | Default for local and small self-hosted installations |
| PostgreSQL | Supported for larger self-hosted installations |
| Cloudflare D1 | Supported through the Workers build |
| Cloudflare R2 | Supported for Workers media storage |

Node.js 22 is the tested runtime for the server, CLI, CI, and Docker image.
WollyCMS uses native modules such as `better-sqlite3` and Sharp, so using the
tested LTS runtime avoids native-binary compatibility problems.

## Astro compatibility

`@wollycms/astro` 0.3 declares peer compatibility with Astro 5, 6, and 7. New
projects should use Astro 7. Existing Astro 5 or 6 sites can upgrade the WollyCMS
integration independently and move to Astro 7 on their own schedule.

For Cloudflare Workers SSR sites, use the current `@astrojs/cloudflare` adapter
that matches your Astro major version and read runtime bindings from
`cloudflare:workers`.

## Deployment targets

WollyCMS supports:

- Cloudflare Workers with D1 and R2
- Docker through `ghcr.io/wollycms/wollycms`
- Bare Node.js behind a TLS reverse proxy

The Astro frontend remains a separate application and can be hosted on any
platform supported by Astro.
