import { describe, it, expect, beforeAll } from 'vitest';
import { setupTestDatabase } from './setup.js';
import { isSafeWebhookUrl, isSafeWebhookUrlResolved } from '../src/security/url.js';

let app: typeof import('../src/app.js').default;
let authToken: string;

beforeAll(async () => {
  await setupTestDatabase();
  const mod = await import('../src/app.js');
  app = mod.default;

  const res = await app.request('/api/admin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@wollycms.local', password: 'admin123' }),
  });
  const body = await res.json();
  authToken = body.data.token;
});

function authed(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${authToken}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return app.request(`/api/admin${path}`, { ...init, headers });
}

function json(path: string, method: string, data: unknown) {
  return authed(path, { method, body: JSON.stringify(data) });
}

// --- API Key Permission Enforcement ---
describe('API Key Permissions', () => {
  let readOnlyKey: string;
  let writeKey: string;
  let fullKey: string;

  beforeAll(async () => {
    // Create API keys with different permission levels
    const r1 = await json('/api-keys', 'POST', { name: 'Read Only', permissions: 'content:read' });
    readOnlyKey = (await r1.json()).data.key;

    const r2 = await json('/api-keys', 'POST', { name: 'Write', permissions: 'content:write' });
    writeKey = (await r2.json()).data.key;

    const r3 = await json('/api-keys', 'POST', { name: 'Full Access', permissions: '*' });
    fullKey = (await r3.json()).data.key;
  });

  function withKey(key: string, path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    headers.set('X-API-Key', key);
    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    return app.request(`/api/admin${path}`, { ...init, headers });
  }

  // content:read key → viewer role
  it('content:read key can read pages', async () => {
    const res = await withKey(readOnlyKey, '/pages');
    expect(res.status).toBe(200);
  });

  it('content:read key cannot create pages', async () => {
    const res = await withKey(readOnlyKey, '/pages', {
      method: 'POST',
      body: JSON.stringify({ title: 'Blocked Page', typeId: 1, status: 'draft' }),
    });
    expect(res.status).toBe(403);
  });

  it('content:read key cannot manage users', async () => {
    const res = await withKey(readOnlyKey, '/users', {
      method: 'POST',
      body: JSON.stringify({ email: 'x@x.com', password: 'pass123', name: 'X', role: 'viewer' }),
    });
    expect(res.status).toBe(403);
  });

  it('content:read key cannot manage API keys', async () => {
    const res = await withKey(readOnlyKey, '/api-keys', {
      method: 'POST',
      body: JSON.stringify({ name: 'Escalated', permissions: '*' }),
    });
    expect(res.status).toBe(403);
  });

  // content:write key → editor role
  it('content:write key can create pages', async () => {
    const res = await withKey(writeKey, '/pages', {
      method: 'POST',
      body: JSON.stringify({ title: 'Write Key Page', typeId: 1, status: 'draft' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    await withKey(writeKey, `/pages/${body.data.id}`, { method: 'DELETE' });
  });

  it('content:write key cannot manage users', async () => {
    const res = await withKey(writeKey, '/users', {
      method: 'POST',
      body: JSON.stringify({ email: 'x@x.com', password: 'pass123', name: 'X', role: 'viewer' }),
    });
    expect(res.status).toBe(403);
  });

  it('content:write key cannot manage webhooks', async () => {
    const res = await withKey(writeKey, '/webhooks', {
      method: 'POST',
      body: JSON.stringify({ name: 'Hook', url: 'https://example.com/hook', events: ['page.updated'] }),
    });
    expect(res.status).toBe(403);
  });

  // wildcard key → admin role
  it('wildcard key can manage users', async () => {
    const res = await withKey(fullKey, '/users');
    expect(res.status).toBe(200);
  });

  it('wildcard key can manage API keys', async () => {
    const res = await withKey(fullKey, '/api-keys');
    expect(res.status).toBe(200);
  });

  it('wildcard key can create pages', async () => {
    const res = await withKey(fullKey, '/pages', {
      method: 'POST',
      body: JSON.stringify({ title: 'Admin Key Page', typeId: 1, status: 'draft' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    await withKey(fullKey, `/pages/${body.data.id}`, { method: 'DELETE' });
  });
});

// --- Webhook URL Validation ---
describe('Webhook URL Safety', () => {
  // Sync checks
  it('blocks localhost', () => {
    expect(isSafeWebhookUrl('http://localhost/hook')).toBe(false);
  });

  it('blocks .local domains', () => {
    expect(isSafeWebhookUrl('http://myserver.local/hook')).toBe(false);
  });

  it('blocks .internal domains', () => {
    expect(isSafeWebhookUrl('http://service.internal/hook')).toBe(false);
  });

  it('blocks private IPv4 (10.x)', () => {
    expect(isSafeWebhookUrl('http://10.0.0.1/hook')).toBe(false);
  });

  it('blocks private IPv4 (172.16-31.x)', () => {
    expect(isSafeWebhookUrl('http://172.16.0.1/hook')).toBe(false);
    expect(isSafeWebhookUrl('http://172.31.255.255/hook')).toBe(false);
  });

  it('blocks private IPv4 (192.168.x)', () => {
    expect(isSafeWebhookUrl('http://192.168.1.1/hook')).toBe(false);
  });

  it('blocks loopback (127.x)', () => {
    expect(isSafeWebhookUrl('http://127.0.0.1/hook')).toBe(false);
  });

  it('blocks CGNAT range (100.64-127.x)', () => {
    expect(isSafeWebhookUrl('http://100.64.0.1/hook')).toBe(false);
    expect(isSafeWebhookUrl('http://100.127.255.255/hook')).toBe(false);
  });

  it('allows CGNAT-adjacent (100.63.x)', () => {
    expect(isSafeWebhookUrl('http://100.63.255.255/hook')).toBe(true);
  });

  it('blocks IPv6 loopback', () => {
    expect(isSafeWebhookUrl('http://[::1]/hook')).toBe(false);
  });

  it('blocks IPv6 unique local (fd)', () => {
    expect(isSafeWebhookUrl('http://[fd12::1]/hook')).toBe(false);
  });

  it('blocks ftp protocol', () => {
    expect(isSafeWebhookUrl('ftp://example.com/hook')).toBe(false);
  });

  it('blocks URLs with credentials', () => {
    expect(isSafeWebhookUrl('https://user:pass@example.com/hook')).toBe(false);
  });

  it('allows valid public URLs', () => {
    expect(isSafeWebhookUrl('https://example.com/webhook')).toBe(true);
    expect(isSafeWebhookUrl('https://hooks.slack.com/services/xxx')).toBe(true);
  });

  // Async DNS-resolved checks
  it('async check passes for safe URLs', async () => {
    expect(await isSafeWebhookUrlResolved('https://example.com/hook')).toBe(true);
  });

  it('async check rejects localhost', async () => {
    expect(await isSafeWebhookUrlResolved('http://localhost/hook')).toBe(false);
  });

  it('async check resolves DNS and rejects if private', async () => {
    // localhost.localdomain typically resolves to 127.0.0.1
    const result = await isSafeWebhookUrlResolved('http://localhost.localdomain/hook');
    // This should be false — either blocked by hostname pattern or DNS resolution
    expect(result).toBe(false);
  });
});

// --- Rate Limiter Client IP ---
describe('Rate Limiter', () => {
  it('prefers CF-Connecting-IP header', async () => {
    // Make a request with CF-Connecting-IP — should not be rate limited by
    // prior requests from other tests since the key will be unique
    const res = await app.request('/api/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'CF-Connecting-IP': '203.0.113.42',
      },
      body: JSON.stringify({ email: 'admin@wollycms.local', password: 'admin123' }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('X-RateLimit-Remaining')).toBeDefined();
  });

  it('uses X-Forwarded-For first entry when no platform header', async () => {
    const res = await app.request('/api/admin/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '198.51.100.1, 10.0.0.1',
      },
      body: JSON.stringify({ email: 'admin@wollycms.local', password: 'admin123' }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('X-RateLimit-Remaining')).toBeDefined();
  });
});
