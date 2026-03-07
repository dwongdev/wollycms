import { isIP } from 'node:net';

function isPrivateIp(host: string): boolean {
  if (host === '::1') return true;
  if (!isIP(host)) return false;

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
  }

  // Unique local IPv6 addresses (fc00::/7)
  const lowered = host.toLowerCase();
  if (lowered.startsWith('fc') || lowered.startsWith('fd') || lowered.startsWith('fe80:')) return true;

  return false;
}

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
