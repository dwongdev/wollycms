/** SHA-256 hash a string. Uses Node crypto when available, Web Crypto otherwise. */
async function sha256Hex(input: string): Promise<string> {
  try {
    const { createHash } = await import('node:crypto');
    return createHash('sha256').update(input).digest('hex');
  } catch {
    const enc = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', enc.encode(input));
    return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
}

/** Generate a random API key. Uses Node crypto when available, Web Crypto otherwise. */
function generateRandomBytes(size: number): Uint8Array {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { randomBytes } = require('node:crypto');
    return randomBytes(size);
  } catch {
    const bytes = new Uint8Array(size);
    crypto.getRandomValues(bytes);
    return bytes;
  }
}

export function hashApiKey(key: string): Promise<string> {
  return sha256Hex(key);
}

export function generateApiKey(): { key: string; prefix: string } {
  const bytes = generateRandomBytes(32);
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  const key = `sk_${hex}`;
  const prefix = key.slice(0, 11); // "sk_" + first 8 hex chars
  return { key, prefix };
}

