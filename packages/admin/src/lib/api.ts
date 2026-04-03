const API_BASE = '/api/admin';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('wolly_token');
}

export function setToken(token: string) {
  localStorage.setItem('wolly_token', token);
}

export function clearToken() {
  localStorage.removeItem('wolly_token');
}

export function isAuthenticated(): boolean {
  return !!getToken();
}

// Coalesced refresh: only one refresh request at a time
let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        credentials: 'same-origin',
      });
      if (!res.ok) return false;
      const json = await res.json();
      if (json.data?.token) {
        setToken(json.data.token);
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts: RequestInit = { method, headers };

  if (body instanceof FormData) {
    opts.body = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  const res = await fetch(`${API_BASE}${path}`, opts);

  if (res.status === 401) {
    // Don't try to refresh if this IS the refresh request
    if (path === '/auth/refresh') {
      clearToken();
      window.location.href = '/admin/login';
      throw new Error('Unauthorized');
    }

    // Try silent refresh
    const refreshed = await tryRefresh();
    if (refreshed) {
      // Retry the original request with the new token
      const retryHeaders: Record<string, string> = {};
      const newToken = getToken();
      if (newToken) retryHeaders['Authorization'] = `Bearer ${newToken}`;

      const retryOpts: RequestInit = { method, headers: retryHeaders };
      if (body instanceof FormData) {
        retryOpts.body = body;
      } else if (body !== undefined) {
        retryHeaders['Content-Type'] = 'application/json';
        retryOpts.body = JSON.stringify(body);
      }

      const retryRes = await fetch(`${API_BASE}${path}`, retryOpts);
      if (retryRes.status === 401) {
        clearToken();
        window.location.href = '/admin/login';
        throw new Error('Unauthorized');
      }
      const retryJson = await retryRes.json();
      if (!retryRes.ok) {
        const msg = retryJson.errors?.[0]?.message || `API error ${retryRes.status}`;
        throw new Error(msg);
      }
      return retryJson;
    }

    clearToken();
    window.location.href = '/admin/login';
    throw new Error('Unauthorized');
  }

  const json = await res.json();
  if (!res.ok) {
    const msg = json.errors?.[0]?.message || `API error ${res.status}`;
    throw new Error(msg);
  }

  return json;
}

interface LoginResult {
  token?: string;
  user?: { id: number; email: string; name: string; role: string };
  requiresTwoFactor?: boolean;
  challengeToken?: string;
}

/**
 * Generate resized image variants in the browser using Canvas.
 * Produces WebP blobs for thumbnail (150x150 cover), medium (600x600),
 * and large (1200x1200). Skips variants larger than the original.
 */
async function generateClientVariants(
  file: File,
): Promise<Record<string, Blob>> {
  if (!file.type.startsWith('image/') || file.type.includes('svg')) return {};

  const img = await createImageBitmap(file);
  const { width: origW, height: origH } = img;
  const variants: Record<string, Blob> = {};

  const configs = [
    { name: 'thumbnail', w: 150, h: 150, fit: 'cover' as const },
    { name: 'medium', w: 600, h: 600, fit: 'inside' as const },
    { name: 'large', w: 1200, h: 1200, fit: 'inside' as const },
  ];

  for (const cfg of configs) {
    // Skip if original is smaller than target (no enlargement)
    if (origW <= cfg.w && origH <= cfg.h && cfg.fit === 'inside') continue;

    let drawW: number, drawH: number, sx: number, sy: number, sw: number, sh: number;

    if (cfg.fit === 'cover') {
      // Crop to fill the target dimensions
      const scale = Math.max(cfg.w / origW, cfg.h / origH);
      sw = cfg.w / scale;
      sh = cfg.h / scale;
      sx = (origW - sw) / 2;
      sy = (origH - sh) / 2;
      drawW = cfg.w;
      drawH = cfg.h;
    } else {
      // Fit inside: scale down preserving aspect ratio
      const scale = Math.min(cfg.w / origW, cfg.h / origH, 1);
      drawW = Math.round(origW * scale);
      drawH = Math.round(origH * scale);
      sx = 0;
      sy = 0;
      sw = origW;
      sh = origH;
    }

    const canvas = new OffscreenCanvas(drawW, drawH);
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, drawW, drawH);

    try {
      const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.8 });
      variants[cfg.name] = blob;
    } catch {
      // Browser may not support WebP encoding — try PNG fallback
      try {
        const blob = await canvas.convertToBlob({ type: 'image/png' });
        variants[cfg.name] = blob;
      } catch {
        // Skip this variant
      }
    }
  }

  img.close();
  return variants;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  del: <T>(path: string, body?: unknown) => request<T>('DELETE', path, body),

  login: async (email: string, password: string): Promise<LoginResult> => {
    const res = await request<{ data: LoginResult }>('POST', '/auth/login', { email, password });
    if (res.data.token) {
      setToken(res.data.token);
    }
    return res.data;
  },

  verify2fa: async (challengeToken: string, code: string, rememberDevice = false) => {
    const res = await request<{ data: { token: string; user: any } }>('POST', '/auth/verify-2fa', {
      challengeToken,
      code,
      rememberDevice,
    });
    setToken(res.data.token);
    return res.data;
  },

  logout: async () => {
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'same-origin' });
    } catch {
      // Best-effort — clear local state regardless
    }
    clearToken();
  },

  upload: async (file: File, title?: string, altText?: string, folder?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (title) form.append('title', title);
    if (altText) form.append('altText', altText);
    if (folder) form.append('folder', folder);

    // Generate resized variants client-side (browser Canvas)
    const variants = await generateClientVariants(file);
    for (const [name, blob] of Object.entries(variants)) {
      form.append(`variant_${name}`, blob, `${name}.webp`);
    }

    return request<{ data: any }>('POST', '/media', form);
  },
};
