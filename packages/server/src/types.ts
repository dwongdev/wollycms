import type { JwtPayload } from './auth/middleware.js';

declare module 'hono' {
  interface ContextVariableMap {
    jwtPayload: JwtPayload;
  }
}
