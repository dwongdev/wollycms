import type { Context } from 'hono';
import { sign } from 'hono/jwt';
import { setCookie, getCookie } from 'hono/cookie';
import { eq, and, lt, isNull, or } from 'drizzle-orm';
import { getDb } from '../db/index.js';
import { refreshTokens, users } from '../db/schema/index.js';
import { hashApiKey } from './api-key.js';
import { env } from '../env.js';
import { loadConfig } from '../api/admin/config.js';

const ACCESS_TOKEN_SECONDS = 900; // 15 minutes
const REFRESH_COOKIE_NAME = 'wolly_refresh';
const ROTATION_GRACE_SECONDS = 30;

export type SessionDuration = '24h' | '7d' | '14d' | '30d';

const DURATION_MAP: Record<SessionDuration, number> = {
  '24h': 86400,
  '7d': 604800,
  '14d': 1209600,
  '30d': 2592000,
};

/** Read session.duration from site config and return seconds. */
export async function getSessionDurationSeconds(): Promise<number> {
  const config = await loadConfig();
  const duration = (config as Record<string, unknown>).session as
    | { duration?: string }
    | undefined;
  const key = (duration?.duration || '24h') as SessionDuration;
  return DURATION_MAP[key] || DURATION_MAP['24h'];
}

/** Issue a short-lived access JWT. */
async function issueAccessToken(user: { id: number; email: string; role: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign(
    { sub: user.id, email: user.email, role: user.role, exp: now + ACCESS_TOKEN_SECONDS },
    env.JWT_SECRET,
    'HS256',
  );
}

/** Generate a random 32-byte hex token. */
function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Issue a full session: short-lived access JWT + refresh token cookie.
 * Returns the access token string (for use in JSON response or redirect fragment).
 */
export async function issueSession(
  c: Context,
  user: { id: number; email: string; role: string },
): Promise<string> {
  const accessToken = await issueAccessToken(user);
  const refreshToken = generateToken();
  const tokenHash = await hashApiKey(refreshToken);
  const familyId = crypto.randomUUID();
  const durationSeconds = await getSessionDurationSeconds();
  const expiresAt = new Date(Date.now() + durationSeconds * 1000).toISOString();

  const db = getDb();
  await db.insert(refreshTokens).values({
    userId: user.id,
    tokenHash,
    familyId,
    expiresAt,
    createdAt: new Date().toISOString(),
  });

  setCookie(c, REFRESH_COOKIE_NAME, refreshToken, {
    path: '/',
    maxAge: durationSeconds,
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'Lax',
  });

  return accessToken;
}

/**
 * Refresh a session: validate the refresh cookie, rotate the token, issue a new access JWT.
 * Returns { accessToken, user } or null if the refresh token is invalid/expired.
 */
export async function refreshSession(
  c: Context,
): Promise<{ accessToken: string; user: { id: number; email: string; name: string; role: string } } | null> {
  const token = getCookie(c, REFRESH_COOKIE_NAME);
  if (!token) return null;

  const db = getDb();
  const tokenHash = await hashApiKey(token);

  const [row] = await db.select().from(refreshTokens)
    .where(eq(refreshTokens.tokenHash, tokenHash))
    .limit(1);

  if (!row) return null;

  // Check if token was already rotated
  if (row.rotatedAt) {
    const rotatedTime = new Date(row.rotatedAt).getTime();
    const graceExpires = rotatedTime + ROTATION_GRACE_SECONDS * 1000;

    if (Date.now() <= graceExpires) {
      // Within grace window — allow it but don't rotate again.
      // Look up the user and issue a new access token.
      const [user] = await db.select().from(users)
        .where(eq(users.id, row.userId)).limit(1);
      if (!user) return null;
      return {
        accessToken: await issueAccessToken(user),
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      };
    }

    // Past grace window — possible replay attack. Revoke entire family.
    await db.delete(refreshTokens).where(eq(refreshTokens.familyId, row.familyId));
    clearRefreshCookie(c);
    return null;
  }

  // Check expiry
  if (new Date(row.expiresAt) < new Date()) {
    await db.delete(refreshTokens).where(eq(refreshTokens.id, row.id));
    clearRefreshCookie(c);
    return null;
  }

  // Rotate: mark old token as rotated, create new one
  const now = new Date().toISOString();
  await db.update(refreshTokens)
    .set({ rotatedAt: now })
    .where(eq(refreshTokens.id, row.id));

  const newToken = generateToken();
  const newHash = await hashApiKey(newToken);
  const durationSeconds = await getSessionDurationSeconds();
  const newExpiresAt = new Date(Date.now() + durationSeconds * 1000).toISOString();

  await db.insert(refreshTokens).values({
    userId: row.userId,
    tokenHash: newHash,
    familyId: row.familyId,
    expiresAt: newExpiresAt,
    createdAt: now,
  });

  setCookie(c, REFRESH_COOKIE_NAME, newToken, {
    path: '/',
    maxAge: durationSeconds,
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'Lax',
  });

  const [user] = await db.select().from(users)
    .where(eq(users.id, row.userId)).limit(1);
  if (!user) return null;

  return {
    accessToken: await issueAccessToken(user),
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  };
}

/** Revoke the current session (logout). */
export async function revokeSession(c: Context): Promise<void> {
  const token = getCookie(c, REFRESH_COOKIE_NAME);
  if (token) {
    const db = getDb();
    const tokenHash = await hashApiKey(token);
    await db.delete(refreshTokens).where(eq(refreshTokens.tokenHash, tokenHash));
  }
  clearRefreshCookie(c);
}

/** Revoke all sessions for a user (password change, admin action). */
export async function revokeAllUserSessions(userId: number): Promise<void> {
  const db = getDb();
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, userId));
}

/** Delete expired and stale rotated tokens. */
export async function cleanupExpiredTokens(): Promise<void> {
  const db = getDb();
  const now = new Date().toISOString();
  const graceThreshold = new Date(Date.now() - ROTATION_GRACE_SECONDS * 1000).toISOString();

  await db.delete(refreshTokens).where(
    or(
      // Expired tokens that were never rotated
      and(lt(refreshTokens.expiresAt, now), isNull(refreshTokens.rotatedAt)),
      // Rotated tokens past the grace window
      lt(refreshTokens.rotatedAt, graceThreshold),
    ),
  );
}

function clearRefreshCookie(c: Context): void {
  setCookie(c, REFRESH_COOKIE_NAME, '', {
    path: '/',
    maxAge: 0,
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'Lax',
  });
}
