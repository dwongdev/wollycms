import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '../../db/index.js';
import { requireRole } from '../../auth/rbac.js';
import {
  pages, blocks, blockTypes, contentTypes, pageBlocks,
  menus, menuItems, taxonomies, terms, redirects,
} from '../../db/schema/index.js';

const app = new Hono();

// Export/import require admin role
app.use('/*', requireRole('admin'));

/** GET /export - Export all content as JSON */
app.get('/export', async (c) => {
  const db = getDb();

  const data = {
    version: 1,
    exportedAt: new Date().toISOString(),
    contentTypes: await db.select().from(contentTypes),
    blockTypes: await db.select().from(blockTypes),
    pages: await db.select().from(pages),
    blocks: await db.select().from(blocks),
    pageBlocks: await db.select().from(pageBlocks),
    menus: await db.select().from(menus),
    menuItems: await db.select().from(menuItems),
    taxonomies: await db.select().from(taxonomies),
    terms: await db.select().from(terms),
    redirects: await db.select().from(redirects),
  };

  c.header('Content-Disposition', `attachment; filename="spacely-export-${new Date().toISOString().slice(0, 10)}.json"`);
  return c.json(data);
});

/** POST /import - Import content from JSON export */
app.post('/import', async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body || body.version !== 1) {
    return c.json({ errors: [{ code: 'VALIDATION', message: 'Invalid export format (expected version: 1)' }] }, 400);
  }

  const db = getDb();
  const stats: Record<string, number> = {};

  // Import in dependency order
  if (body.contentTypes?.length) {
    for (const row of body.contentTypes) {
      const [existing] = await db.select({ id: contentTypes.id }).from(contentTypes).where(eq(contentTypes.slug, row.slug)).limit(1);
      if (!existing) {
        await db.insert(contentTypes).values(row);
      }
    }
    stats.contentTypes = body.contentTypes.length;
  }

  if (body.blockTypes?.length) {
    for (const row of body.blockTypes) {
      const [existing] = await db.select({ id: blockTypes.id }).from(blockTypes).where(eq(blockTypes.slug, row.slug)).limit(1);
      if (!existing) {
        await db.insert(blockTypes).values(row);
      }
    }
    stats.blockTypes = body.blockTypes.length;
  }

  if (body.taxonomies?.length) {
    for (const row of body.taxonomies) {
      const [existing] = await db.select({ id: taxonomies.id }).from(taxonomies).where(eq(taxonomies.slug, row.slug)).limit(1);
      if (!existing) {
        await db.insert(taxonomies).values(row);
      }
    }
    stats.taxonomies = body.taxonomies.length;
  }

  if (body.terms?.length) {
    for (const row of body.terms) {
      const [existing] = await db.select({ id: terms.id }).from(terms).where(eq(terms.slug, row.slug)).limit(1);
      if (!existing) {
        await db.insert(terms).values(row);
      }
    }
    stats.terms = body.terms.length;
  }

  if (body.pages?.length) {
    for (const row of body.pages) {
      const [existing] = await db.select({ id: pages.id }).from(pages).where(eq(pages.slug, row.slug)).limit(1);
      if (!existing) {
        await db.insert(pages).values(row);
      }
    }
    stats.pages = body.pages.length;
  }

  if (body.blocks?.length) {
    for (const row of body.blocks) {
      const [existing] = await db.select({ id: blocks.id }).from(blocks).where(eq(blocks.id, row.id)).limit(1);
      if (!existing) {
        await db.insert(blocks).values(row);
      }
    }
    stats.blocks = body.blocks.length;
  }

  if (body.pageBlocks?.length) {
    for (const row of body.pageBlocks) {
      const [existing] = await db.select({ id: pageBlocks.id }).from(pageBlocks).where(eq(pageBlocks.id, row.id)).limit(1);
      if (!existing) {
        await db.insert(pageBlocks).values(row);
      }
    }
    stats.pageBlocks = body.pageBlocks.length;
  }

  if (body.menus?.length) {
    for (const row of body.menus) {
      const [existing] = await db.select({ id: menus.id }).from(menus).where(eq(menus.slug, row.slug)).limit(1);
      if (!existing) {
        await db.insert(menus).values(row);
      }
    }
    stats.menus = body.menus.length;
  }

  if (body.menuItems?.length) {
    for (const row of body.menuItems) {
      const [existing] = await db.select({ id: menuItems.id }).from(menuItems).where(eq(menuItems.id, row.id)).limit(1);
      if (!existing) {
        await db.insert(menuItems).values(row);
      }
    }
    stats.menuItems = body.menuItems.length;
  }

  if (body.redirects?.length) {
    for (const row of body.redirects) {
      const [existing] = await db.select({ id: redirects.id }).from(redirects).where(eq(redirects.fromPath, row.fromPath)).limit(1);
      if (!existing) {
        await db.insert(redirects).values(row);
      }
    }
    stats.redirects = body.redirects.length;
  }

  return c.json({ data: { imported: true, stats } });
});

export default app;
