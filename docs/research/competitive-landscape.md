# Competitive Landscape — Headless CMS Options for Astro

> Why build SpacelyCMS instead of using an existing solution?

---

## Existing Options

### Storyblok (SaaS)

**What it does well:**
- Visual editor with live preview — best-in-class page builder experience
- Component-based content model (blocks called "bloks")
- Official Astro integration
- Reusable components across pages

**Why it falls short:**
- **SaaS-only** — no self-hosting, data lives on their servers
- **Pricing scales with content**: Free tier is 1 space, limited components.
  Business tier starts at $2,999/year. For a site like southside.edu with 1,500+
  pages, costs escalate quickly
- **Vendor lock-in** — content model is proprietary, migration is painful
- **Menu system is basic** — no native deep hierarchical menu support
- **No native taxonomy system** — must be hand-built with datasources

### Strapi (Self-hosted, Open Source)

**What it does well:**
- Self-hosted, open source (MIT license)
- Flexible content type builder with admin UI
- REST and GraphQL APIs
- Active community and plugin ecosystem

**Why it falls short:**
- **No page composition model** — no concept of regions, page blocks, or
  reusable block instances. It's a structured data API, not a page builder
- **No built-in block/paragraph system** — you'd have to build the entire
  composition layer yourself using Dynamic Zones (limited)
- **Dynamic Zones are flat** — no regions, no shared block references
- **No Astro-native integration** — generic REST API, no component mapping
- **Heavy** — requires Node.js + database server, significant resource usage
- **Menu system is basic** — plugin-based, limited depth

### Payload CMS (Self-hosted, Open Source)

**What it does well:**
- TypeScript-first, modern codebase
- Powerful field types and validation
- Blocks field type for page building
- Self-hosted with good admin UI
- Lexical rich text editor

**Why it falls short:**
- **No reusable block instances** — blocks are inline to pages, not shared
- **No region concept** — single blocks field per content type, not multi-region
- **Tightly coupled to Next.js** — designed as a Next.js app, not Astro-native
- **Menu system requires custom collection** — no built-in hierarchical menus
- **Complex setup** — requires MongoDB or Postgres, heavy configuration

### Directus (Self-hosted, Open Source)

**What it does well:**
- Database-first approach — wraps any SQL database with an API
- Clean admin interface
- Good media management
- Flexible permissions system

**Why it falls short:**
- **No page composition model** — it's a database admin panel, not a CMS
- **No block system** — you build everything from raw tables/relations
- **No Astro integration** — generic REST/GraphQL
- **No concept of "pages"** — everything is just tables and records
- **No menu builder** — manual table design required

### WordPress (Headless via WPGraphQL)

**What it does well:**
- Massive ecosystem, familiar to many users
- Gutenberg block editor
- Good media management
- WPGraphQL for headless usage

**Why it falls short:**
- **PHP dependency** — requires PHP hosting even in headless mode
- **Gutenberg blocks are rendering-coupled** — block data includes HTML markup,
  not clean structured data
- **Performance overhead** — WordPress is heavy for just an API layer
- **Reusable blocks are limited** — exist but poorly integrated
- **Security surface area** — PHP + plugins = constant patching

### Keystatic (Astro-native, Git-based)

**What it does well:**
- Built for Astro (and Next.js)
- Content stored in Git (Markdown/JSON/YAML)
- No database required
- Good developer experience

**Why it falls short:**
- **No visual page builder** — developer-focused, not webmaster-friendly
- **No block composition** — content collections, not composable pages
- **No media management** — files in Git, no optimization pipeline
- **No menu system** — manual configuration
- **Doesn't scale** — Git-based storage breaks down at 1,500+ pages
- **No reusable blocks** — each page is independent

### Tina CMS (Git-based, SaaS option)

**What it does well:**
- Visual editing with live preview
- Git-based content storage
- Good Astro integration
- GraphQL content API

**Why it falls short:**
- **SaaS pricing for collaboration** — self-host is limited
- **Git-based scaling issues** — same as Keystatic at volume
- **No reusable block system** — blocks are page-local
- **No hierarchical menus** — basic navigation only
- **No taxonomy system** — manual implementation

---

## The Gap SpacelyCMS Fills

| Capability | Storyblok | Strapi | Payload | SpacelyCMS |
|---|---|---|---|---|
| Self-hosted | ✗ | ✓ | ✓ | ✓ |
| Free / open source | ✗ | ✓ | ✓ | ✓ |
| Astro-native integration | Plugin | Generic | ✗ | Core |
| Composable page regions | ✓ | ✗ | ✗ | ✓ |
| Reusable shared blocks | ✓ | ✗ | ✗ | ✓ |
| Deep hierarchical menus | Basic | ✗ | ✗ | ✓ |
| Taxonomy system | ✗ | ✓ | ✓ | ✓ |
| Media library + optimization | ✓ | ✓ | ✓ | ✓ |
| WYSIWYG rich text | ✓ | ✓ | ✓ | ✓ |
| Visual page builder | ✓ | ✗ | ✗ | Phase 4 |
| Clean URL management | ✗ | ✗ | ✗ | ✓ |
| Redirect management | ✗ | ✗ | ✗ | ✓ |
| Dynamic content listings | ✗ | ✓ | ✓ | ✓ |
| Webmaster-friendly | ✓ | Moderate | ✗ | Goal |

### SpacelyCMS Positioning

**"The self-hosted, Astro-native CMS with Drupal's content composition power
and Storyblok's editing vision."**

The key differentiator: **first-class composable page building with reusable
blocks and multi-region layouts**, designed specifically to work with Astro's
component model, without SaaS lock-in.
