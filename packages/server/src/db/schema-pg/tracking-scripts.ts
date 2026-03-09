import { pgTable, text, serial, integer, boolean } from 'drizzle-orm/pg-core';

export const trackingScripts = pgTable('tracking_scripts', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  position: text('position').notNull().default('head'), // 'head' or 'body'
  priority: integer('priority').notNull().default(0),
  isActive: boolean('is_active').notNull().default(true),
  scope: text('scope').notNull().default('global'), // 'global' or 'targeted'
  targetPages: text('target_pages'), // JSON array of slugs when scope='targeted'
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});
