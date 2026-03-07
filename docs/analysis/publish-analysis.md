# WollyCMS: Full Publishing Analysis

*Generated: March 6, 2026*

---

## Table of Contents

1. [What You've Built](#what-youve-built)
2. [Advantages](#advantages)
3. [Disadvantages & Risks](#disadvantages--risks)
4. [Legal Considerations](#legal-considerations)
5. [Competitive Landscape](#competitive-landscape)
6. [Business Models](#business-models)
7. [The Solo Maintainer Reality](#the-solo-maintainer-reality)
8. [Recommendations](#recommendations)

---

## What You've Built

WollyCMS is a self-hosted headless CMS with composable block-based page building, built for Astro but framework-agnostic at the API layer.

**By the numbers:**

| Metric | Value |
|--------|-------|
| Source files | 222 TypeScript/Svelte/Astro files |
| Tests | 108 passing (content + admin API) |
| Documentation | 14 docs, 4,100+ lines |
| Database tables | 17 |
| API endpoints | 30+ (content + admin) |
| Block types | 10 built-in |
| Admin UI components | 36+ Svelte components, 18 route handlers |
| Packages | 4 (@wollycms/server, admin, astro, create-wolly) |

**Tech stack:** Hono, Drizzle ORM, better-sqlite3 + PostgreSQL, SvelteKit 2 (Svelte 5), Sharp, Zod, TipTap, Astro 5.

**Phases 1-5 complete.** Phase 6 (packaging) and Phase 7 (content features) in progress.

---

## Advantages

### 1. You're Filling a Real Gap

No existing CMS combines all three of these:
- **Drupal-style composable blocks with regions** (reusable instances, edit once/update everywhere)
- **Astro-first integration** (not an afterthought bolted onto a generic CMS)
- **Self-hosted with zero SaaS lock-in**

Strapi and Directus lack page composition. Payload is coupled to Next.js. Storyblok has it but costs $99+/mo and locks you in. StudioCMS (the closest Astro-native competitor) is early-stage and uses Astro DB rather than a standalone server — different architecture entirely.

### 2. The Market Is Growing Fast

The headless CMS market is projected to grow from ~$750M (2022) to $5.5B (2032) at 22% CAGR. 73% of businesses already use headless architecture. The trend toward composable, decoupled content management is accelerating, not slowing.

### 3. Astro's Ecosystem Is Large and Underserved

Astro has 500,000+ active developers, 40,000+ GitHub stars, and has been #1 in developer satisfaction in State of JS for multiple consecutive years. Despite this, there is no dominant CMS purpose-built for it. The official Astro docs list 30+ CMS integrations — all generic headless CMSes with varying Astro support quality.

### 4. Technical Quality Is High

- Dual-database support (SQLite for simplicity, PostgreSQL for scale)
- Pluggable media storage (local disk or S3/R2/MinIO)
- Production security hardening (rate limiting, CORS, SQL injection protection, JWT auth, audit logging)
- Accessibility work (ARIA landmarks, focus traps, keyboard shortcuts on all 20 modals)
- ETag caching, batch API, scheduled publishing
- 108 tests, zero TypeScript errors, comprehensive docs

This is not a prototype. It's a feature-complete CMS that could run in production today.

### 5. Architecture Is Framework-Agnostic at the Core

Despite the Astro focus, the Hono API server is completely decoupled. Anyone could write a Next.js, Nuxt, or SvelteKit integration package against the same content API. This dramatically expands the potential user base beyond Astro alone.

### 6. Self-Hosting Is a Growing Trend

Post-Vercel-pricing-controversy, post-Heroku-free-tier-death, developers increasingly want to own their infrastructure. A CMS that runs on a $5 VPS with SQLite hits this market perfectly.

### 7. You Own wollycms.com

Having the primary .com domain is a significant asset. Many open-source projects struggle with domain squatters.

---

## Disadvantages & Risks

### 1. You're Competing Against Well-Funded Teams

| Competitor | Funding | Team Size |
|------------|---------|-----------|
| Strapi | $45M venture capital | ~50-80 employees |
| Payload | Acquired by Figma (2025) | ~20 (now Figma resources) |
| Directus | $8M | ~30 |
| Ghost | $10.4M revenue (self-funded) | ~30 |

You are one person. They have dedicated security teams, developer advocates, documentation writers, and full-time support staff. Feature parity is not the issue — sustained momentum is.

### 2. The "Last 20%" Problem

You have a working CMS. Publishing it means:
- Writing CONTRIBUTING.md, SECURITY.md, CODE_OF_CONDUCT.md
- Setting up CI/CD (GitHub Actions for tests, builds, releases)
- npm publishing pipeline (scoped packages, versioning, changelogs)
- Issue templates, PR templates, discussion forums
- A marketing website (wollycms.com needs content)
- Getting started guides, video tutorials, blog posts
- Discord or community forum setup

This "last 20%" of polish and infrastructure often takes as long as the first 80% of development.

### 3. Dual-Database Support Doubles Migration Burden

Every schema change requires two sets of migrations (SQLite + PostgreSQL), two sets of testing, and awareness of dialect differences. This is a significant ongoing cost that most CMSes avoid by picking one database.

### 4. npm Ecosystem Churn

Your dependency tree includes fast-moving packages (Hono, Drizzle, SvelteKit, Astro, TipTap, Sharp). Each has its own release cycle and breaking changes. Keeping everything current while not breaking your own users is a treadmill.

### 5. Security Is a Permanent Obligation

A CMS handles authentication, file uploads, and database queries — three of the most attack-prone surfaces in web development. Publishing means:
- You'll receive vulnerability reports with a 90-day disclosure clock
- Every deployment of WollyCMS becomes your responsibility in the court of public opinion
- CVE processes add formal overhead
- CMS platforms are high-value targets for attackers

You've already done solid security work (SQL injection fix, path traversal protection, MIME allowlists, rate limiting). But security is never "done."

### 6. Documentation Debt Compounds

Your architecture docs are excellent for a developer building the CMS. Users need different docs: "How do I add a custom block type?" "How do I deploy on Railway?" "How do I set up R2 media storage?" End-user documentation is a different skill and a massive time investment.

---

## Legal Considerations

### Trademark: The "Wolly" Name

This requires honest assessment. The name has conflicts:

- **Wolly AI** (wolly.ai) — A funded Thai startup ($1M seed) doing AI interior design, 400,000+ users
- **Wolly** (rentwolly.com) — Has a **registered USPTO trademark** (Serial #90307413, filed Nov 2020) in International Class 42 (software)
- **Wolly** (getwolly.com) — Active productivity app
- **The Jetsons** — "Wolly Sprockets" is owned by Warner Bros. Discovery (Hanna-Barbera). Strong cultural association

**Risk level: Moderate to High**

The existing USPTO trademark is in Class 42 (software), which overlaps with a CMS. However:
- "WollyCMS" is distinct from "Wolly" for parking/storage software
- CMS software and parking rental software are different market segments
- You own wollycms.com, which establishes your own use
- The Jetsons connection is a common-law risk but Warner Bros. would likely only act if you became very visible or used Jetsons imagery

**Mitigating factors:**
- Trademark disputes are expensive to prosecute — small players rarely get targeted
- "WollyCMS" (with the CMS suffix) is more defensible than bare "Wolly"
- Different market segment from the registered trademark holder

**Practical advice:** You can likely publish under WollyCMS without immediate legal trouble, but you probably cannot register your own trademark for it. If the project gets significant traction, trademark disputes become more likely. Having a backup name in mind is prudent. If you want zero risk, rename now before you have users.

### MIT License

**Pros:**
- Maximum adoption (92% of audited OSS projects use it)
- Used by Ghost, Strapi, StudioCMS
- Simple, understood, no friction for commercial users
- Allows you to offer a paid enterprise tier later

**Cons:**
- No copyleft — competitors can fork, close-source, and sell with zero obligation
- No patent grant (unlike Apache 2.0)
- Cloud providers could theoretically host it as a service (the "AWS problem")

**Verdict:** MIT is the right choice. The "AWS problem" is irrelevant until you're enormously successful, and copyleft licenses actively deter adoption for new projects.

### Contributor License Agreements

Not needed yet. Use a lightweight Developer Certificate of Origin (DCO) via `Signed-off-by` commit lines instead. A CLA would deter the few early contributors you'd attract.

### GDPR

For a self-hosted CMS, **GDPR liability sits with the deployer, not you.** However:
- Document what data the CMS stores (user credentials, audit logs, media with potential EXIF data)
- Document that scrypt hashing is used for passwords
- If you ever offer hosted/cloud WollyCMS, you become a data processor and need a DPA, privacy policy, etc.

### Sharp / libvips Licensing

- Sharp: Apache 2.0 (no issue)
- libvips: LGPL-2.1 (dynamically linked via prebuilt binaries — compliant)
- HEIC codecs have patent issues, but Sharp excludes them by default
- **No practical risk** with standard npm distribution

---

## Competitive Landscape

### Direct Competitors

| CMS | Positioning | Why WollyCMS Is Different |
|-----|-------------|---------------------------|
| **Strapi** | General-purpose headless CMS | No page composition, no block regions, no reusable blocks |
| **Payload** | Next.js-native CMS | Coupled to Next.js, no Astro-first support |
| **Directus** | Database-first admin panel | Not a CMS — it's a database GUI. No content modeling |
| **StudioCMS** | Astro-native CMS | Early-stage, uses Astro DB (not standalone), simpler content model |
| **Storyblok** | Visual page builder SaaS | $99+/mo, vendor lock-in, not self-hosted |
| **Ghost** | Publishing platform | Blog-focused, not a page builder |
| **Keystatic** | Git-based CMS | No visual builder, no database, limited content modeling |

### Your Unique Position

WollyCMS occupies an unclaimed intersection: **composable blocks + self-hosted + Astro-first + framework-agnostic API**. No existing product hits all four.

The closest analog is actually Drupal's block/region system — but rebuilt as a modern headless API with a Svelte admin UI. That's a compelling pitch to anyone who's used Drupal and wished it wasn't PHP.

---

## Business Models

### What Works for Open-Source CMS

**1. Managed Cloud Hosting (Best proven model)**

Ghost is the gold standard: free open-source core, paid managed hosting ($10.4M revenue in 2024, zero VC funding, 24,000+ paying customers). The insight: people who want the software also need a server. "WollyCMS Cloud" at $10-50/mo per instance is the most realistic revenue path.

**2. Open Core (Enterprise features behind a paywall)**

Strapi's model: free community edition, paid enterprise features (SSO, advanced RBAC, review workflows). You already have audit logging, API keys, and RBAC built in — you'd need to decide what to hold back for a paid tier.

**3. Hybrid (Cloud + Open Core)**

Most successful projects combine both. This is the dominant 2025-2026 model.

### What Doesn't Work

| Model | Why It Fails |
|-------|-------------|
| Donations/sponsorships only | Rarely generates sustainable income for CMS-scale projects |
| Support/consulting alone | Doesn't scale; trading time for money while maintaining the project leads to burnout |
| Marketplace (themes/plugins) | Requires massive user base; building marketplace infrastructure is a distraction for a solo dev |
| Dual licensing (AGPL + commercial) | Creates adoption friction and community resentment |

### Realistic Timeline

1. **Months 0-12:** Publish open source, build community, get feedback. Zero revenue. This is investment time.
2. **Months 12-24:** If traction exists, launch simple managed hosting. $500-2,000/mo is a realistic early target.
3. **Year 2-3:** If demand grows, add enterprise tier. Ghost took 11 years to reach $10M. Strapi took 7 years and $45M in VC.

**The honest truth:** Most open-source CMS projects never reach sustainability. The ones that do required either VC funding (Strapi, Directus) or full-time founder commitment from day one (Ghost). A side-project path to revenue is possible but rare.

---

## The Solo Maintainer Reality

This section is the most important one to read carefully.

### The Statistics

- 60% of open-source maintainers are unpaid
- 60% have quit or considered quitting
- 44% cite burnout as their primary reason
- The average popular open-source project receives multiple issues per week

### What "Maintaining a Published CMS" Actually Means

**Weekly time commitment (conservative estimate):**

| Activity | Hours/Week |
|----------|-----------|
| Triaging issues and responding to questions | 2-4 |
| Reviewing PRs (if you get contributors) | 1-2 |
| Dependency updates and security patches | 1-2 |
| Documentation updates | 1 |
| Releasing new versions | 0.5-1 |
| Community management (Discord, discussions) | 1-2 |
| **Total** | **6-11 hours/week** |

This is *on top of* any feature development you want to do. And it scales with adoption — 1,000 users generate roughly 10x the maintenance load of 100 users.

### The Emotional Cost

- Users will file angry issues when things break
- People will demand features that don't align with your vision
- Saying "no" takes emotional energy
- The work is described by maintainers as "incredibly lonely"
- You'll feel guilty when you can't respond quickly enough

### Mitigation Strategies

- Set explicit boundaries in CONTRIBUTING.md ("I maintain this in my spare time, response times may vary")
- Use issue templates to reduce low-quality reports
- Automate everything possible (CI, releases, dependency updates via Renovate/Dependabot)
- Don't promise timelines
- It's okay to mark the project as "maintained but not actively developed" if life gets busy

---

## Recommendations

### If Your Goal Is: Portfolio / Learning Showcase

**Do it.** Publish as-is with minimal ceremony.

- Push to GitHub with a clear README
- Add "This is a personal project, not production-supported" to the README
- Don't set up Discord or community infrastructure
- Let it speak for itself as a portfolio piece
- Time investment: 5-10 hours to prepare, minimal ongoing

### If Your Goal Is: Building a Community Project

**Do it, but with boundaries.**

- Rename if you want zero trademark risk (or accept moderate risk with WollyCMS)
- Set up GitHub Discussions (not Discord — less overhead)
- Write a SECURITY.md with disclosure process
- Write a CONTRIBUTING.md with clear expectations
- Automate CI/CD and releases
- Budget 5-10 hours/week for maintenance
- Don't promise features or timelines
- Time to prepare: 2-4 weeks of focused work

### If Your Goal Is: A Business

**Possible, but eyes wide open.**

- Rename to something with zero trademark baggage (strongly recommended for a business)
- Build wollycms.com (or new domain) as a marketing site
- Plan managed hosting from day one (even simple Docker deployments)
- Consider holding back 1-2 enterprise features for a paid tier
- Budget 15-25 hours/week minimum
- Expect 12-18 months before any meaningful revenue
- Have a financial runway — this is a long game
- Time to prepare: 1-2 months of focused work

### Regardless of Path

1. **Add SECURITY.md** before publishing
2. **Add CONTRIBUTING.md** with maintainer expectations
3. **Remove default credentials** from published docs (or make first-run setup mandatory)
4. **Set up GitHub Actions** for automated testing on PRs
5. **Consider the name question seriously** — easier to change now than after you have users
6. **Start with `0.x` versioning** — signals to users that breaking changes are expected

---

## Bottom Line

**Is it too big to publish?** No. The project is well-structured, well-documented, and well-tested. It's in better shape than many published CMSes.

**Is there a business possibility?** Yes, but it's a long road. The managed-hosting model (a la Ghost) is the most realistic path, but requires sustained commitment measured in years.

**Would it be full of headaches?** Proportional to its success. A niche project with 50 users is manageable. A popular project with 5,000 users is a second job.

**Is there a real need?** Yes. The composable-blocks-for-Astro niche is genuinely underserved. Whether the market is large enough to sustain a business is uncertain, but the technical gap is real.

**The biggest risk isn't legal or technical — it's burnout.** The project is impressive. The question is whether maintaining it for strangers, indefinitely, for free (at least initially), aligns with what you want from your time.
