# @wollycms/server

The Node.js server package for [WollyCMS](https://wollycms.com), a self-hosted,
block-based headless CMS designed for Astro.

## Requirements

- Node.js 22 LTS
- SQLite, PostgreSQL, or Cloudflare D1

## Recommended setup

Create a configured project with the official scaffolder:

```bash
npx create-wolly@latest my-cms
cd my-cms
npm run migrate
npm run seed
npm run dev
```

The API and admin UI are then available at `http://localhost:4321`.

For direct installation:

```bash
npm install @wollycms/server
```

Never commit `.env` or a production `JWT_SECRET`. See the
[WollyCMS documentation](https://docs.wollycms.com/) for configuration,
deployment, database, media, and security guidance.

## License

MIT
