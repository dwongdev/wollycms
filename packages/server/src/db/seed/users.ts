import { count } from 'drizzle-orm';
import type { AppDatabase } from '../index.js';
import { users } from '../schema/index.js';
import { hashPassword } from '../../auth/password.js';

export async function seedUsers(db: AppDatabase) {
  // Check if users already exist — never overwrite real accounts
  const existing = db.select({ n: count() }).from(users).get();
  if (existing && existing.n > 0) {
    console.log(`  Keeping ${existing.n} existing user(s) (not overwriting)`);
    const allUsers = db.select().from(users).all();
    return allUsers;
  }

  const now = new Date().toISOString();

  const inserted = await db.insert(users).values({
    email: 'admin@wollycms.local',
    name: 'Admin',
    passwordHash: hashPassword('admin123'),
    role: 'admin',
    createdAt: now,
  }).returning();

  console.log(`  Seeded ${inserted.length} user(s)`);
  return inserted;
}
