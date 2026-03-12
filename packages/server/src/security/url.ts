/**
 * Webhook URL validation and SSRF protection.
 *
 * Checks hostname, protocol, credentials, and (on Node.js) resolves DNS
 * to catch private-IP rebinding. On Workers, runtime-level protections
 * already prevent fetching private addresses.
 */

function isPrivateIp(rawHost: string): boolean {
  // Strip IPv6 brackets (URL.hostname keeps them for IPv6 literals)
  const host = rawHost.startsWith('[') && rawHost.endsWith(']')
    ? rawHost.slice(1, -1)
    : rawHost;

  if (host === '::1') return true;

  // IPv4 checks
  if (host.startsWith('10.')) return true;
  if (host.startsWith('127.')) return true;
  if (host.startsWith('169.254.')) return true;
  if (host.startsWith('192.168.')) return true;
  if (host.startsWith('0.')) return true;

  const octets = host.split('.');
  if (octets.length === 4) {
    const first = Number(octets[0]);
    const second = Number(octets[1]);
    if (first === 172 && second >= 16 && second <= 31) return true;
    // CGNAT range (100.64.0.0/10) — also used by Tailscale
    if (first === 100 && second >= 64 && second <= 127) return true;
  }

  // Unique local IPv6 addresses (fc00::/7) and link-local (fe80::/10)
  const lowered = host.toLowerCase();
  if (lowered.startsWith('fc') || lowered.startsWith('fd') || lowered.startsWith('fe80:')) return true;

  return false;
}

/** Quick check: does this string look like an IP literal? */
function looksLikeIp(host: string): boolean {
  return /^[\d.]+$/.test(host) || host.includes(':');
}

/**
 * Synchronous URL safety check (protocol, credentials, hostname patterns).
 * Use this for fast validation at save time.
 */
export function isSafeWebhookUrl(input: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return false;
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) return false;
  if (parsed.username || parsed.password) return false;

  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return false;
  if (isPrivateIp(host)) return false;

  return true;
}

/**
 * Async URL safety check with DNS resolution (Node.js only).
 * Resolves the hostname and verifies none of the resolved addresses are private.
 * On Workers (where dns.resolve is unavailable), falls back to the sync check only.
 * Call this before actually fetching the webhook URL.
 */
export async function isSafeWebhookUrlResolved(input: string): Promise<boolean> {
  if (!isSafeWebhookUrl(input)) return false;

  const parsed = new URL(input);
  const host = parsed.hostname.toLowerCase();

  // If it's already an IP literal, the sync check covered it
  if (looksLikeIp(host)) return true;

  // Try DNS resolution (Node.js only — Workers will fall through to the catch)
  try {
    const dns = await import('node:dns');
    const { resolve4 } = dns.promises;
    const addresses = await resolve4(host);
    for (const addr of addresses) {
      if (isPrivateIp(addr)) return false;
    }
  } catch {
    // dns.resolve unavailable (Workers) or resolution failed — allow the sync result to stand
  }

  return true;
}
