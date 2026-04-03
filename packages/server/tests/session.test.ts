import { describe, it, expect, beforeAll } from 'vitest';
import { setupTestDatabase } from './setup.js';
import { getDb } from '../src/db/index.js';
import { refreshTokens } from '../src/db/schema/index.js';
import { eq } from 'drizzle-orm';

let app: typeof import('../src/app.js').default;
let reqCounter = 0;

/** Generate a unique fake IP to avoid rate limiter collisions across tests. */
function uniqueIp(): string {
  reqCounter++;
  const a = (reqCounter >> 16) & 255;
  const b = (reqCounter >> 8) & 255;
  const c = reqCounter & 255;
  return `203.${a}.${b}.${c}`;
}

/** Helper: make a login request with a unique IP to avoid rate limiting. */
function doLogin() {
  return app.request('/api/admin/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'CF-Connecting-IP': uniqueIp(),
    },
    body: JSON.stringify({ email: 'admin@wollycms.local', password: 'admin123' }),
  });
}

/** Helper: make a refresh request with a unique IP. */
function doRefresh(cookie: string) {
  return app.request('/api/admin/auth/refresh', {
    method: 'POST',
    headers: {
      Cookie: `wolly_refresh=${cookie}`,
      'CF-Connecting-IP': uniqueIp(),
    },
  });
}

/** Helper: make a logout request with a unique IP. */
function doLogout(cookie?: string) {
  const headers: Record<string, string> = { 'CF-Connecting-IP': uniqueIp() };
  if (cookie) headers['Cookie'] = `wolly_refresh=${cookie}`;
  return app.request('/api/admin/auth/logout', {
    method: 'POST',
    headers,
  });
}

/** Helper: extract a named cookie value from set-cookie header(s). */
function extractCookie(res: Response, name: string): string | null {
  const raw = res.headers.get('set-cookie') || '';
  for (const part of raw.split(/,(?=\s*\w+=)/)) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${name}=`)) {
      return trimmed.split(';')[0].split('=').slice(1).join('=');
    }
  }
  return null;
}

/** Helper: extract Max-Age from a named cookie. */
function extractMaxAge(res: Response, name: string): number | null {
  const raw = res.headers.get('set-cookie') || '';
  for (const part of raw.split(/,(?=\s*\w+=)/)) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${name}=`)) {
      const match = trimmed.match(/Max-Age=(\d+)/i);
      return match ? parseInt(match[1], 10) : null;
    }
  }
  return null;
}

beforeAll(async () => {
  await setupTestDatabase();
  const mod = await import('../src/app.js');
  app = mod.default;
});

// --- Session Issuance ---
describe('Session Issuance', () => {
  it('login returns access token AND sets refresh cookie', async () => {
    const res = await doLogin();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.token).toBeDefined();
    expect(body.data.user.email).toBe('admin@wollycms.local');

    const refreshValue = extractCookie(res, 'wolly_refresh');
    expect(refreshValue).toBeTruthy();
    expect(refreshValue!.length).toBe(64); // 32 bytes hex = 64 chars

    const raw = res.headers.get('set-cookie') || '';
    expect(raw).toContain('HttpOnly');
  });

  it('refresh cookie max-age matches default session duration (24h)', async () => {
    const res = await doLogin();
    const maxAge = extractMaxAge(res, 'wolly_refresh');
    expect(maxAge).toBe(86400);
  });

  it('refresh token is stored in database', async () => {
    const res = await doLogin();
    expect(res.status).toBe(200);

    const db = getDb();
    const tokens = await db.select().from(refreshTokens);
    expect(tokens.length).toBeGreaterThan(0);

    const latest = tokens[tokens.length - 1];
    expect(latest.tokenHash).toBeTruthy();
    expect(latest.familyId).toBeTruthy();
    expect(latest.expiresAt).toBeTruthy();
    expect(latest.rotatedAt).toBeNull();
  });
});

// --- Token Refresh ---
describe('Token Refresh', () => {
  it('POST /auth/refresh issues a new access token', async () => {
    const loginRes = await doLogin();
    const cookie = extractCookie(loginRes, 'wolly_refresh')!;

    const res = await doRefresh(cookie);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.token).toBeDefined();
    expect(body.data.user.email).toBe('admin@wollycms.local');
  });

  it('POST /auth/refresh rotates the refresh token', async () => {
    const loginRes = await doLogin();
    const freshCookie = extractCookie(loginRes, 'wolly_refresh')!;

    const res = await doRefresh(freshCookie);
    expect(res.status).toBe(200);

    const newCookie = extractCookie(res, 'wolly_refresh');
    expect(newCookie).toBeTruthy();
    expect(newCookie).not.toBe(freshCookie);
  });

  it('new access token from refresh works for authenticated endpoints', async () => {
    const loginRes = await doLogin();
    const cookie = extractCookie(loginRes, 'wolly_refresh')!;

    const refreshRes = await doRefresh(cookie);
    const { token } = (await refreshRes.json()).data;

    const meRes = await app.request('/api/admin/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(meRes.status).toBe(200);
    const body = await meRes.json();
    expect(body.data.email).toBe('admin@wollycms.local');
  });

  it('POST /auth/refresh rejects request with no cookie', async () => {
    const res = await app.request('/api/admin/auth/refresh', {
      method: 'POST',
      headers: { 'CF-Connecting-IP': uniqueIp() },
    });
    expect(res.status).toBe(401);
  });

  it('POST /auth/refresh rejects invalid token', async () => {
    const res = await app.request('/api/admin/auth/refresh', {
      method: 'POST',
      headers: {
        Cookie: 'wolly_refresh=0000000000000000000000000000000000000000000000000000000000000000',
        'CF-Connecting-IP': uniqueIp(),
      },
    });
    expect(res.status).toBe(401);
  });

  it('POST /auth/refresh rejects expired token', async () => {
    const loginRes = await doLogin();
    const cookie = extractCookie(loginRes, 'wolly_refresh')!;

    const db = getDb();
    const { hashApiKey } = await import('../src/auth/api-key.js');
    const tokenHash = await hashApiKey(cookie);
    await db.update(refreshTokens)
      .set({ expiresAt: new Date(Date.now() - 1000).toISOString() })
      .where(eq(refreshTokens.tokenHash, tokenHash));

    const res = await doRefresh(cookie);
    expect(res.status).toBe(401);
  });
});

// --- Token Rotation & Replay Detection ---
describe('Token Rotation & Replay Detection', () => {
  it('using a rotated token within grace window still works', async () => {
    const loginRes = await doLogin();
    const originalCookie = extractCookie(loginRes, 'wolly_refresh')!;

    const refresh1 = await doRefresh(originalCookie);
    expect(refresh1.status).toBe(200);

    // Use the ORIGINAL (now rotated) cookie again — within 30s grace
    const refresh2 = await doRefresh(originalCookie);
    expect(refresh2.status).toBe(200);
  });

  it('using a rotated token after grace window revokes the family', async () => {
    const loginRes = await doLogin();
    const originalCookie = extractCookie(loginRes, 'wolly_refresh')!;

    const refresh1 = await doRefresh(originalCookie);
    expect(refresh1.status).toBe(200);
    const newCookie = extractCookie(refresh1, 'wolly_refresh')!;

    // Manually backdate the rotatedAt to simulate expired grace window
    const db = getDb();
    const { hashApiKey } = await import('../src/auth/api-key.js');
    const oldHash = await hashApiKey(originalCookie);
    await db.update(refreshTokens)
      .set({ rotatedAt: new Date(Date.now() - 60_000).toISOString() })
      .where(eq(refreshTokens.tokenHash, oldHash));

    // Using the OLD cookie should fail AND revoke the family
    const replayRes = await doRefresh(originalCookie);
    expect(replayRes.status).toBe(401);

    // The NEW cookie should also be revoked (same family)
    const familyRes = await doRefresh(newCookie);
    expect(familyRes.status).toBe(401);
  });
});

// --- Logout ---
describe('Session Logout', () => {
  it('POST /auth/logout clears the refresh cookie', async () => {
    const loginRes = await doLogin();
    const cookie = extractCookie(loginRes, 'wolly_refresh')!;

    const logoutRes = await doLogout(cookie);
    expect(logoutRes.status).toBe(200);

    const maxAge = extractMaxAge(logoutRes, 'wolly_refresh');
    expect(maxAge).toBe(0);
  });

  it('POST /auth/logout deletes token from database', async () => {
    const loginRes = await doLogin();
    const cookie = extractCookie(loginRes, 'wolly_refresh')!;

    const db = getDb();
    const { hashApiKey } = await import('../src/auth/api-key.js');
    const tokenHash = await hashApiKey(cookie);
    const [before] = await db.select().from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash));
    expect(before).toBeTruthy();

    await doLogout(cookie);

    const [after] = await db.select().from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash));
    expect(after).toBeUndefined();
  });

  it('refresh fails after logout', async () => {
    const loginRes = await doLogin();
    const cookie = extractCookie(loginRes, 'wolly_refresh')!;

    await doLogout(cookie);

    const refreshRes = await doRefresh(cookie);
    expect(refreshRes.status).toBe(401);
  });

  it('POST /auth/logout succeeds even without a cookie (no-op)', async () => {
    const res = await doLogout();
    expect(res.status).toBe(200);
  });
});

// --- Backward Compatibility ---
describe('Backward Compatibility', () => {
  it('existing JWT (without refresh token) still works for authenticated endpoints', async () => {
    const loginRes = await doLogin();
    const { token } = (await loginRes.json()).data;

    const meRes = await app.request('/api/admin/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(meRes.status).toBe(200);

    const pagesRes = await app.request('/api/admin/pages', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(pagesRes.status).toBe(200);
  });
});

// --- Session Duration Config ---
describe('Session Duration Config', () => {
  let authToken: string;

  beforeAll(async () => {
    const loginRes = await doLogin();
    authToken = (await loginRes.json()).data.token;
  });

  it('config includes session.duration with default value', async () => {
    const res = await app.request('/api/admin/config', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.session).toBeDefined();
    expect(body.data.session.duration).toBe('24h');
  });

  it('session.duration can be updated to 7d', async () => {
    const res = await app.request('/api/admin/config', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ session: { duration: '7d' } }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.session.duration).toBe('7d');
  });

  it('session.duration rejects invalid values', async () => {
    const res = await app.request('/api/admin/config', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ session: { duration: '365d' } }),
    });
    expect(res.status).toBe(400);
  });

  it('changing duration affects new login refresh cookie max-age', async () => {
    // Set to 30d
    await app.request('/api/admin/config', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ session: { duration: '30d' } }),
    });

    const loginRes = await doLogin();
    const maxAge = extractMaxAge(loginRes, 'wolly_refresh');
    expect(maxAge).toBe(2592000); // 30 days

    // Reset back to 24h
    await app.request('/api/admin/config', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ session: { duration: '24h' } }),
    });
  });
});

// --- Cleanup ---
describe('Expired Token Cleanup', () => {
  it('cleanupExpiredTokens removes expired tokens', async () => {
    const db = getDb();

    await db.insert(refreshTokens).values({
      userId: 1,
      tokenHash: 'expired_test_hash_' + Date.now(),
      familyId: 'expired_family_' + Date.now(),
      expiresAt: new Date(Date.now() - 86400_000).toISOString(),
      createdAt: new Date().toISOString(),
    });

    const { cleanupExpiredTokens } = await import('../src/auth/session.js');
    await cleanupExpiredTokens();

    const allTokens = await db.select().from(refreshTokens);
    for (const t of allTokens) {
      if (!t.rotatedAt) {
        expect(new Date(t.expiresAt).getTime()).toBeGreaterThan(Date.now() - 1000);
      }
    }
  });

  it('cleanupExpiredTokens removes stale rotated tokens', async () => {
    const db = getDb();
    const uniqueHash = 'rotated_test_hash_' + Date.now();

    await db.insert(refreshTokens).values({
      userId: 1,
      tokenHash: uniqueHash,
      familyId: 'rotated_family_' + Date.now(),
      expiresAt: new Date(Date.now() + 86400_000).toISOString(),
      rotatedAt: new Date(Date.now() - 60_000).toISOString(),
      createdAt: new Date().toISOString(),
    });

    const { cleanupExpiredTokens } = await import('../src/auth/session.js');
    await cleanupExpiredTokens();

    const [stale] = await db.select().from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, uniqueHash));
    expect(stale).toBeUndefined();
  });
});
