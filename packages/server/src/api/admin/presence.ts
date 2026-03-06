import { Hono } from 'hono';
import { z } from 'zod';

interface PresenceEntry {
  userId: number;
  email: string;
  name: string;
  lastSeen: number;
}

// In-memory presence store: pageId → Map<userId, entry>
const presence = new Map<number, Map<number, PresenceEntry>>();

const STALE_THRESHOLD_MS = 30_000; // 30 seconds

function cleanStale() {
  const now = Date.now();
  for (const [pageId, users] of presence) {
    for (const [userId, entry] of users) {
      if (now - entry.lastSeen > STALE_THRESHOLD_MS) {
        users.delete(userId);
      }
    }
    if (users.size === 0) presence.delete(pageId);
  }
}

const app = new Hono();

/** POST /presence/heartbeat — Register or refresh presence on a page */
app.post('/heartbeat', async (c) => {
  const body = await c.req.json().catch(() => null);
  const schema = z.object({ pageId: z.number().int().positive() });
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return c.json({ errors: [{ code: 'VALIDATION', message: 'pageId required' }] }, 400);
  }

  const payload = c.get('jwtPayload');
  const { pageId } = parsed.data;

  if (!presence.has(pageId)) presence.set(pageId, new Map());
  const pageUsers = presence.get(pageId)!;

  pageUsers.set(payload.sub, {
    userId: payload.sub,
    email: payload.email,
    name: payload.email.split('@')[0],
    lastSeen: Date.now(),
  });

  cleanStale();
  return c.json({ data: { ok: true } });
});

/** DELETE /presence/:pageId — Leave a page */
app.delete('/:pageId', async (c) => {
  const pageId = parseInt(c.req.param('pageId'), 10);
  const payload = c.get('jwtPayload');

  const pageUsers = presence.get(pageId);
  if (pageUsers) {
    pageUsers.delete(payload.sub);
    if (pageUsers.size === 0) presence.delete(pageId);
  }

  return c.json({ data: { ok: true } });
});

/** GET /presence/:pageId — Get who's editing a page */
app.get('/:pageId', async (c) => {
  const pageId = parseInt(c.req.param('pageId'), 10);
  const payload = c.get('jwtPayload');

  cleanStale();

  const pageUsers = presence.get(pageId);
  if (!pageUsers || pageUsers.size === 0) {
    return c.json({ data: [] });
  }

  // Return all users except the requesting user
  const editors = Array.from(pageUsers.values())
    .filter(u => u.userId !== payload.sub)
    .map(u => ({ userId: u.userId, name: u.name, email: u.email }));

  return c.json({ data: editors });
});

export default app;
