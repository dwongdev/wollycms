# create-wolly

The official project scaffolder for [WollyCMS](https://wollycms.com).

## Requirements

- Node.js 22 LTS
- npm 10 or later

## Usage

```bash
npx create-wolly@latest my-cms
```

Choose a starter template when prompted, or specify one directly:

```bash
npx create-wolly@latest my-cms --template college
```

Available templates: `blog`, `marketing`, `wordpress`, `drupal`, and `college`.
The selected template's `seed.json` is bundled with the npm package and copied
into the generated project.

Use `--skip-install` when you want to inspect or customize the generated files
before installing dependencies. Non-interactive environments can also supply
`--site-name` and `--port`.

The generated `.env` contains a unique local JWT secret and is excluded by the
generated `.gitignore`. Never commit `.env` or reuse that development secret in
production.

See the [Quick Start](https://docs.wollycms.com/getting-started/quick-start/) for
the full setup process.

## License

MIT
