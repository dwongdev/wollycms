#!/usr/bin/env node
/**
 * SpacelyCMS CLI — Run common operations from the command line.
 *
 * Usage:
 *   npx spacely migrate     Run pending database migrations
 *   npx spacely seed        Populate database with sample data
 *   npx spacely start       Start the production server
 *   npx spacely dev         Start development server with hot reload
 *   npx spacely export      Export all data as JSON to stdout
 *   npx spacely import <f>  Import data from a JSON file
 *   npx spacely health      Check server health
 */

const command = process.argv[2];

async function main() {
  switch (command) {
    case 'migrate': {
      const { migrate } = await import('drizzle-orm/better-sqlite3/migrator');
      const { getDb } = await import('./db/index.js');
      const { env } = await import('./env.js');
      const { mkdirSync } = await import('fs');
      const { dirname } = await import('path');

      const dbPath = env.DATABASE_URL.replace('sqlite:', '');
      mkdirSync(dirname(dbPath), { recursive: true });
      const db = getDb();
      console.log('Running migrations...');
      migrate(db, { migrationsFolder: './drizzle' });
      console.log('Migrations complete.');
      break;
    }

    case 'seed': {
      // Dynamically import the seed script
      await import('./db/seed.js');
      break;
    }

    case 'start': {
      await import('./index.js');
      break;
    }

    case 'export': {
      const { getDb } = await import('./db/index.js');
      const { sql } = await import('drizzle-orm');
      const db = getDb();

      const tables = [
        'content_types', 'block_types', 'pages', 'blocks', 'page_blocks',
        'menus', 'menu_items', 'taxonomies', 'terms', 'content_terms',
        'redirects', 'users', 'media', 'webhooks', 'api_keys',
      ];
      const data: Record<string, unknown[]> = {};
      for (const table of tables) {
        try {
          data[table] = db.all(sql.raw(`SELECT * FROM ${table}`));
        } catch {
          data[table] = [];
        }
      }
      console.log(JSON.stringify(data, null, 2));
      break;
    }

    case 'health': {
      const { env } = await import('./env.js');
      const url = `http://${env.HOST === '0.0.0.0' ? 'localhost' : env.HOST}:${env.PORT}/api/health`;
      try {
        const res = await fetch(url);
        const json = await res.json();
        console.log(JSON.stringify(json, null, 2));
      } catch {
        console.error(`Could not reach server at ${url}`);
        process.exit(1);
      }
      break;
    }

    default:
      console.log(`SpacelyCMS CLI v0.1.0

Usage: spacely <command>

Commands:
  migrate    Run pending database migrations
  seed       Populate database with sample data
  start      Start the production server
  export     Export all data as JSON to stdout
  health     Check server health status

Examples:
  spacely migrate
  spacely seed
  spacely export > backup.json`);
      if (command) {
        console.error(`\nUnknown command: ${command}`);
        process.exit(1);
      }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
