import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const trackingScripts = sqliteTable('tracking_scripts', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  code: text('code').notNull(),
  position: text('position').notNull().default('head'), // 'head' or 'body'
  priority: integer('priority').notNull().default(0),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  scope: text('scope').notNull().default('global'), // 'global' or 'targeted'
  targetPages: text('target_pages'), // JSON array of slugs when scope='targeted'
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
