# WollyCMS — Deployment Scenarios

## The Core Concept

WollyCMS has two completely separate pieces:

1. **WollyCMS Server (the backend)** — Stores your content, serves it via
   JSON API, runs the admin UI. This is a Node.js app. It needs to be running
   somewhere so editors can manage content.

2. **Your Astro Site (the frontend)** — A regular Astro project that fetches
   content from the WollyCMS API and renders it into HTML pages. It uses
   `@wollycms/astro` for convenience, but fundamentally it's just making
   HTTP requests to get JSON and rendering it however you want.

These two pieces connect over HTTP. That's it. The backend serves JSON, the
frontend consumes it. They can run on the same machine or on opposite sides of
the planet.

```
┌─────────────────┐      HTTP/JSON       ┌─────────────────┐
│  WollyCMS     │ ◄──────────────────► │  Your Astro     │
│  (Node.js API)  │   "give me pages"    │  Site           │
│                 │   "here's the JSON"  │  (renders HTML) │
│  + Admin UI     │                      │                 │
│  + Database     │                      │  Deployed       │
│  + Media files  │                      │  anywhere       │
└─────────────────┘                      └─────────────────┘
     You host this                        You host this
     somewhere                            somewhere (else)
```

### What Astro Does

Astro is a static site generator (with optional SSR). It's not part of
WollyCMS — it's the tool you use to build your website. When you create
an Astro site that uses WollyCMS:

- You write `.astro` component files that define how your site looks
- You write block components (RichText.astro, Hero.astro, etc.) that decide
  how each content block renders
- You choose your own CSS, fonts, layout, design — everything visual
- `@wollycms/astro` is a helper library that fetches content from the API
  and maps block types to your components

Two completely different websites (a blog and a university) would share the
same WollyCMS backend code but have **totally different** Astro frontends
with different designs, components, layouts, and deployed to different places.

---

## Scenario 1: Personal Blog on a VPS

**Setup**: A simple blog. You rent a $5/month VPS (DigitalOcean, Hetzner,
etc.), run everything on it via Docker.

### Architecture

```
┌─── Your VPS (e.g., DigitalOcean Droplet) ──────────────────┐
│                                                             │
│  Docker Compose                                             │
│  ┌───────────────────────────────────────────────┐          │
│  │  wolly-server (container)                    │          │
│  │  • Hono API on port 4321                       │          │
│  │  • SQLite database (volume-mounted)            │          │
│  │  • Media files (volume-mounted)                │          │
│  │  • Admin UI served at /admin                   │          │
│  └───────────────────────────────────────────────┘          │
│                        │                                    │
│                  fetch at build time                         │
│                        │                                    │
│  ┌───────────────────────────────────────────────┐          │
│  │  Built Astro site (static HTML files)          │          │
│  │  • Served by Caddy/Nginx reverse proxy         │          │
│  │  • blog.yourname.com → static files            │          │
│  │  • blog.yourname.com/admin → wolly admin     │          │
│  └───────────────────────────────────────────────┘          │
│                                                             │
│  Caddy (reverse proxy + auto HTTPS)                         │
│  • blog.yourname.com → static Astro files                   │
│  • blog.yourname.com/admin → wolly:4321/admin             │
│  • blog.yourname.com/api → wolly:4321/api                 │
└─────────────────────────────────────────────────────────────┘
```

### How Content Gets Published

1. You log into `blog.yourname.com/admin` — the WollyCMS admin UI
2. You write a blog post using the block editor (rich text, images, etc.)
3. You click "Publish"
4. WollyCMS saves it to the SQLite database
5. A webhook fires, triggering an Astro rebuild
6. Astro fetches all pages from `http://localhost:4321/api/content/pages`
7. Astro generates static HTML files for every page
8. Caddy serves the new HTML — your post is live

### The Astro Project

Your blog's Astro site would be simple. You'd create it from scratch (or
fork the college-site example and gut it):

```
my-blog/
├── src/
│   ├── layouts/
│   │   └── Blog.astro          ← your layout (header, footer, nav)
│   ├── blocks/
│   │   ├── RichText.astro      ← renders rich text blocks
│   │   ├── Image.astro         ← renders image blocks
│   │   └── Hero.astro          ← renders hero blocks
│   ├── pages/
│   │   ├── index.astro         ← homepage (fetches latest posts)
│   │   └── [...slug].astro     ← catch-all (renders any CMS page)
│   └── styles/
│       └── blog.css            ← your design
├── astro.config.mjs
└── package.json
```

The `[...slug].astro` file does the heavy lifting:

```astro
---
import { WollyClient } from '@wollycms/astro';
import BlogLayout from '../layouts/Blog.astro';
import BlockRenderer from '../components/BlockRenderer.astro';

const client = new WollyClient('http://localhost:4321/api/content');

export async function getStaticPaths() {
  const pages = await client.pages.list({ status: 'published' });
  return pages.map(page => ({
    params: { slug: page.slug || undefined },
    props: { page }
  }));
}

const { page } = Astro.props;
---

<BlogLayout title={page.title}>
  <article>
    <h1>{page.title}</h1>
    <BlockRenderer blocks={page.regions.content} />
  </article>
</BlogLayout>
```

That's the entire routing logic. Astro asks the CMS "what pages exist?",
gets a list, generates a static HTML file for each one.

### What You'd Customize

- **Blog.astro layout** — your header, footer, sidebar, typography
- **Block components** — how each content type renders (you only need the
  block types you actually use)
- **Homepage** — maybe show latest 5 posts, a featured post, etc.
- **CSS** — completely your own design
- **Content types** — in the CMS admin, you'd create a "blog_post" content
  type with regions like hero + content

### Docker Compose (simplified)

```yaml
services:
  wolly:
    build: ./wolly
    volumes:
      - ./data/db:/app/data          # SQLite persisted
      - ./data/media:/app/media      # uploads persisted
    environment:
      - JWT_SECRET=your-secret-here
    ports:
      - "4321:4321"

  caddy:
    image: caddy:2
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - ./site/dist:/srv            # Astro build output
```

### Key Points

- Everything runs on one machine
- SQLite is perfect for a blog (thousands of pages, zero config)
- Static HTML = fast, cacheable, nearly unhackable
- Total cost: ~$5/month for the VPS
- The CMS API only needs to be reachable at build time (not by visitors)

---

## Scenario 2: Example College — College Website

**Setup**: A college wants their CMS backend on-premises (on the college
network for security/policy reasons) but their public website hosted on
Cloudflare for speed and reliability.

### Architecture

```
┌─── College Internal Network ──────────────────┐
│                                                │
│  WollyCMS Server (on-premises)               │
│  • Hono API on internal IP (10.0.1.50:4321)    │
│  • PostgreSQL database (college DB server)     │
│  • Media on S3-compatible storage (MinIO)      │
│  • Admin UI at cms.internal.example-college.edu      │
│  • Only accessible from campus network/VPN     │
│                                                │
│  Staff access the admin from their desks       │
│  or via VPN when remote                        │
│                                                │
└────────────────┬───────────────────────────────┘
                 │
                 │  On publish: webhook fires
                 │  OR: scheduled build (cron)
                 │  OR: manual deploy from CI/CD
                 │
                 ▼
┌─── Build Server (GitHub Actions, etc.) ────────┐
│                                                 │
│  1. Pulls Astro source from git                 │
│  2. Connects to CMS API via VPN/tunnel          │
│  3. Runs `astro build`                          │
│     → Fetches all pages, menus, media URLs      │
│     → Generates static HTML                     │
│  4. Deploys static files to Cloudflare Pages    │
│                                                 │
└─────────────────────────────────────────────────┘
                 │
                 │  Static HTML + assets
                 │
                 ▼
┌─── Cloudflare (public internet) ───────────────┐
│                                                 │
│  Cloudflare Pages                               │
│  • www.example-college.edu → static HTML              │
│  • Global CDN (fast everywhere)                 │
│  • DDoS protection included                     │
│  • Free or cheap hosting                        │
│                                                 │
│  Media served from:                             │
│  • R2 bucket (Cloudflare's S3-compatible store) │
│  • OR: proxied from college MinIO via tunnel    │
│                                                 │
└─────────────────────────────────────────────────┘
```

### How Content Gets Published

1. A staff member at the college opens `cms.internal.example-college.edu` from
   their office computer (or via VPN from home)
2. They edit the "Admissions" page — update text, add a new accordion block
3. They click "Publish"
4. WollyCMS saves to the PostgreSQL database
5. A webhook triggers the build pipeline (e.g., GitHub Actions)
6. The build server connects to the CMS API (via VPN tunnel or Cloudflare
   Tunnel) and runs `astro build`
7. Astro fetches all published pages, menus, taxonomies from the API
8. Astro generates static HTML — every page becomes a `.html` file
9. The build output is deployed to Cloudflare Pages
10. Within ~30 seconds, www.example-college.edu is updated globally

### The Astro Project

This is a full college website — much more complex than a blog:

```
college-site/
├── src/
│   ├── layouts/
│   │   ├── Default.astro          ← standard page layout
│   │   ├── Landing.astro          ← landing page layout (full-width hero)
│   │   └── Home.astro             ← homepage layout
│   ├── blocks/
│   │   ├── RichText.astro         ← body content
│   │   ├── Hero.astro             ← hero banners
│   │   ├── Accordion.astro        ← FAQ sections
│   │   ├── ContactList.astro      ← department contacts
│   │   ├── Location.astro         ← campus locations
│   │   ├── CtaButton.astro        ← call-to-action buttons
│   │   ├── LinkList.astro         ← resource links
│   │   ├── ContentListing.astro   ← "latest news" etc.
│   │   ├── Image.astro            ← images with captions
│   │   └── Video.astro            ← embedded video
│   ├── components/
│   │   ├── Header.astro           ← mega-menu navigation
│   │   ├── Footer.astro           ← multi-column footer
│   │   ├── Breadcrumbs.astro      ← breadcrumb trail
│   │   └── Sidebar.astro          ← sidebar blocks
│   ├── pages/
│   │   ├── index.astro            ← homepage
│   │   └── [...slug].astro        ← all CMS pages
│   └── styles/
│       └── college.css          ← maroon + gold design
├── astro.config.mjs
└── package.json
```

### Why the CMS is On-Premises

- College IT policy may require data stays on their network
- Student records, FERPA compliance
- The CMS has admin credentials, draft content, internal notes
- The public website is just static HTML — no database, no secrets, no risk

### Why Cloudflare for the Frontend

- Static HTML on a CDN = fastest possible page loads
- Free/cheap, handles any traffic spike (orientation day, etc.)
- DDoS protection
- The college doesn't need to run a public-facing web server
- If the campus network goes down, the website stays up (it's just files
  on Cloudflare, not connected to the campus at runtime)

### Media Handling

Images uploaded through the CMS admin need to be accessible on the public
site. Options:

1. **Cloudflare R2** — WollyCMS uploads processed images to an R2 bucket.
   Astro references `https://media.example-college.edu/...` URLs. Best option.
2. **Build-time download** — During `astro build`, download all media from
   the CMS API and include them in the static build output. Simple but makes
   builds slower for large media libraries.
3. **Cloudflare Tunnel** — Expose only the media endpoint
   (`/api/content/media/*`) through a Cloudflare Tunnel. The CMS stays
   internal but media is publicly accessible.

### Key Points

- The CMS and the website are completely decoupled
- The website is static HTML — no runtime connection to the CMS
- If the CMS goes down, the website keeps working (it was already built)
- Content updates require a rebuild (~30 seconds to a few minutes)
- Staff only need campus network access to manage content
- Students/public see a fast, globally-distributed static site

---

## Scenario 3: SmartHomeDigest.com — Large Content Site

**Setup**: A tech media site with hundreds of articles, product reviews,
comparison pages, and dynamic features. Backend on a cloud server, frontend
on Cloudflare, but this site looks and works nothing like a college website.

### Architecture

```
┌─── Cloud Server (e.g., Hetzner, AWS) ─────────┐
│                                                 │
│  WollyCMS Server (Docker)                     │
│  • Hono API on port 4321                        │
│  • PostgreSQL database (managed, like Neon)     │
│  • Media on Cloudflare R2                       │
│  • Admin at admin.smarthomedigest.com           │
│  • Accessible to editorial team (auth required) │
│                                                 │
└────────────────┬────────────────────────────────┘
                 │
                 │  Webhook on publish → rebuild
                 │  ALSO: SSR for dynamic routes
                 │
                 ▼
┌─── Cloudflare ─────────────────────────────────┐
│                                                 │
│  Cloudflare Pages (hybrid: static + SSR)        │
│  • Most pages: pre-built static HTML (SSG)      │
│  • Search results: server-rendered (SSR)        │
│  • Category listings: SSR with edge caching     │
│  • Preview mode: SSR (draft content for editors)│
│                                                 │
│  www.smarthomedigest.com                        │
│                                                 │
│  Cloudflare R2                                  │
│  • All media (images, videos)                   │
│  • media.smarthomedigest.com                    │
│                                                 │
│  Cloudflare Workers (optional)                  │
│  • API caching layer                            │
│  • A/B testing                                  │
│  • Redirect handling                            │
│                                                 │
└─────────────────────────────────────────────────┘
```

### How This Differs from Example College

| Aspect | Example College | SmartHomeDigest.com |
|---|---|---|
| **Content types** | secondary_page, landing_page, home_page | article, review, comparison, product, home_page |
| **Block types** | hero, rich_text, accordion, contact_list, location, etc. | hero, rich_text, product_card, comparison_table, affiliate_link, rating_widget, image_gallery, video_embed, related_articles |
| **Design** | Maroon + gold, institutional, Libre Baskerville | Dark theme, modern tech, Inter/JetBrains Mono |
| **Layout** | Header + hero + content + sidebar + footer | Header + hero + content + sidebar (ads/related) + footer |
| **Rendering** | 100% static (SSG) | Hybrid — articles static, search/listings SSR |
| **Update frequency** | Weekly | Multiple times daily |
| **Authors** | 2-3 staff | 10+ writers with different roles |
| **Traffic** | Moderate, predictable | High, spiky (viral articles) |

### The Astro Project

Completely different design, components, and structure:

```
smarthomedigest/
├── src/
│   ├── layouts/
│   │   ├── Article.astro          ← article layout (author bio, date, tags)
│   │   ├── Review.astro           ← review layout (rating, pros/cons)
│   │   ├── Comparison.astro       ← side-by-side product comparison
│   │   ├── Category.astro         ← article listing by category
│   │   └── Home.astro             ← homepage (featured + latest + trending)
│   ├── blocks/
│   │   ├── RichText.astro         ← same concept, totally different styling
│   │   ├── Hero.astro             ← dark, full-bleed hero
│   │   ├── ProductCard.astro      ← product with price, rating, buy link
│   │   ├── ComparisonTable.astro  ← side-by-side specs table
│   │   ├── AffiliateLink.astro    ← styled affiliate CTA
│   │   ├── RatingWidget.astro     ← star rating display
│   │   ├── ImageGallery.astro     ← lightbox image gallery
│   │   ├── VideoEmbed.astro       ← YouTube/Vimeo player
│   │   └── RelatedArticles.astro  ← "you might also like" grid
│   ├── components/
│   │   ├── Header.astro           ← mega-menu with search bar
│   │   ├── Footer.astro           ← links, newsletter signup
│   │   ├── AuthorCard.astro       ← author avatar + bio
│   │   ├── TableOfContents.astro  ← auto-generated from headings
│   │   ├── ShareButtons.astro     ← social sharing
│   │   └── AdSlot.astro           ← ad placement
│   ├── pages/
│   │   ├── index.astro            ← homepage
│   │   ├── [...slug].astro        ← articles + reviews from CMS
│   │   ├── category/[slug].astro  ← category listing (SSR)
│   │   └── search.astro           ← search results (SSR)
│   └── styles/
│       └── smarthomedigest.css    ← dark tech theme
├── astro.config.mjs               ← Cloudflare adapter
└── package.json
```

### Custom Content Types (defined in CMS admin)

You'd create these content types in WollyCMS through the admin UI:

**article** — regions: hero, content, sidebar
- Fields: author, category, tags, published_date, reading_time

**review** — regions: hero, content, verdict, sidebar
- Fields: product_name, rating, pros, cons, price, buy_url, author

**comparison** — regions: hero, content, sidebar
- Fields: products (list), winner, category

**product** — regions: content
- Fields: name, brand, price, image, specs, buy_url

Each content type gets different regions, different blocks are allowed in
those regions, and your Astro components render them with completely different
HTML and styling.

### Custom Block Types

You'd also create block types specific to this site:

**product_card** — fields: product_ref, show_price, show_rating, cta_text
**comparison_table** — fields: products (repeater), specs (repeater)
**affiliate_link** — fields: url, text, store_name, price, badge
**rating_widget** — fields: score (1-10), label, show_breakdown

These block types don't exist in the college site. They're defined in the
WollyCMS admin for this specific site. The Astro frontend has matching
components that know how to render them.

### Hybrid Rendering (SSG + SSR)

```js
// astro.config.mjs
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'static',                    // default: pre-render everything
  adapter: cloudflare(),               // needed for SSR routes
});
```

```astro
---
// src/pages/category/[slug].astro
// This page is SERVER-RENDERED (not pre-built)
export const prerender = false;

import { WollyClient } from '@wollycms/astro';
const client = new WollyClient(import.meta.env.WOLLY_API_URL);

const { slug } = Astro.params;
const articles = await client.pages.list({
  type: 'article',
  taxonomy: `category:${slug}`,
  sort: 'published_at:desc',
  limit: 20
});
---

<CategoryLayout>
  {articles.map(article => <ArticleCard article={article} />)}
</CategoryLayout>
```

Why SSR for categories? Because with hundreds of articles and frequent
updates, rebuilding every category listing every time a new article is
published is wasteful. SSR fetches fresh data on each request and Cloudflare
edge-caches the response.

Articles themselves are still SSG (pre-built) because they change
infrequently and benefit from being static.

### Workflow: Publishing an Article

1. Writer logs into `admin.smarthomedigest.com` (the WollyCMS admin UI)
2. Creates a new page with content type "article"
3. Adds blocks: hero (featured image + title), rich_text (the article body),
   product_card blocks (affiliate links), related_articles block
4. Sets category taxonomy, tags, author
5. Uses live preview to check how it looks on the actual site
6. Clicks "Publish"
7. Webhook triggers GitHub Actions:
   - `astro build` runs, fetching all published pages
   - New article gets a static HTML page
   - Deploys to Cloudflare Pages (~60 seconds)
8. Category listing pages (SSR) automatically show the new article on
   next request because they fetch fresh data from the CMS API

### Key Points

- Same WollyCMS backend, completely different website
- Custom content types and block types defined per-site in the CMS admin
- Astro components are 100% custom to this site's design and functionality
- Hybrid rendering: articles are static, listings are server-rendered
- High-traffic capable: static pages on CDN + edge caching for SSR pages
- The CMS is just a content API — the site's look, feel, and functionality
  are entirely in the Astro project

---

## Summary: What's the Same, What's Different

| Component | Same across all sites? | Notes |
|---|---|---|
| WollyCMS server code | Yes | Same Docker image, same API |
| Database schema | Yes | Same tables (pages, blocks, menus, etc.) |
| Content types | No | Defined per-site in admin (blog_post vs article vs secondary_page) |
| Block types | Partially | Some are universal (rich_text, hero), others are site-specific (product_card) |
| Admin UI | Yes | Same admin interface for all sites |
| `@wollycms/astro` | Yes | Same helper library |
| Astro site code | No | Completely custom per project |
| Design/CSS | No | Completely custom per project |
| Block components | No | Each site writes its own .astro components for each block type |
| Hosting | No | Your choice per project |
| Rendering mode | No | SSG, SSR, or hybrid — your choice |

### The Mental Model

Think of WollyCMS like a database with a nice editor UI. It stores
structured content (pages made of blocks) and serves it as JSON.

Think of your Astro site like a template engine. It takes that JSON and
turns it into a website. How it looks, where it's hosted, how it renders —
that's all up to you.

The `@wollycms/astro` package is like a database driver — it handles the
connection and gives you typed data. But what you do with that data is
entirely your own code.
