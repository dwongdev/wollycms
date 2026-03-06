import type { Context, Next } from 'hono';

type Role = 'admin' | 'editor' | 'viewer';

const ROLE_HIERARCHY: Record<Role, number> = {
  viewer: 0,
  editor: 1,
  admin: 2,
};

/**
 * Middleware that requires the authenticated user to have at least the given role.
 * Role hierarchy: viewer < editor < admin
 */
export function requireRole(minRole: Role) {
  return async (c: Context, next: Next) => {
    const payload = c.get('jwtPayload');
    const userRole = (payload?.role || 'viewer') as Role;
    if ((ROLE_HIERARCHY[userRole] ?? 0) < ROLE_HIERARCHY[minRole]) {
      return c.json(
        { errors: [{ code: 'FORBIDDEN', message: `Requires ${minRole} role` }] },
        403,
      );
    }
    await next();
  };
}
