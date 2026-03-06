#!/usr/bin/env node

import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';
import { randomBytes } from 'crypto';
import { createInterface } from 'readline';

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

async function main() {
  console.log('\n  🚀 Create SpacelyCMS Project\n');

  const projectName = process.argv[2] || await ask('  Project name: ');
  if (!projectName) {
    console.error('  Project name is required.');
    process.exit(1);
  }

  const projectDir = resolve(projectName);
  if (existsSync(projectDir)) {
    console.error(`  Directory "${projectName}" already exists.`);
    process.exit(1);
  }

  const siteName = await ask(`  Site name [${projectName}]: `) || projectName;
  const port = await ask('  API port [4321]: ') || '4321';

  rl.close();

  console.log(`\n  Creating project in ${projectDir}...\n`);

  // Create project structure
  mkdirSync(join(projectDir, 'data'), { recursive: true });
  mkdirSync(join(projectDir, 'uploads'), { recursive: true });

  const jwtSecret = randomBytes(32).toString('hex');

  // package.json
  writeFileSync(join(projectDir, 'package.json'), JSON.stringify({
    name: projectName,
    version: '0.1.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'spacely start',
      migrate: 'spacely migrate',
      seed: 'spacely seed',
      export: 'spacely export',
      'types:generate': 'spacely types generate',
    },
    dependencies: {
      '@spacelycms/server': '^0.1.0',
    },
  }, null, 2) + '\n');

  // .env
  writeFileSync(join(projectDir, '.env'), `# SpacelyCMS Configuration
DATABASE_URL=sqlite:./data/spacely.db
PORT=${port}
HOST=localhost
JWT_SECRET=${jwtSecret}
MEDIA_DIR=./uploads
SITE_URL=http://localhost:4322
CORS_ORIGINS=*
NODE_ENV=development
`);

  // .env.example
  writeFileSync(join(projectDir, '.env.example'), `# SpacelyCMS Configuration
DATABASE_URL=sqlite:./data/spacely.db
PORT=4321
HOST=localhost
JWT_SECRET=change-me-to-a-random-secret
MEDIA_DIR=./uploads
SITE_URL=http://localhost:4322
CORS_ORIGINS=*
NODE_ENV=development
`);

  // .gitignore
  writeFileSync(join(projectDir, '.gitignore'), `.env
.env.*
!.env.example
node_modules/
data/
uploads/
*.log
.DS_Store
spacely-types.d.ts
`);

  // docker-compose.yml
  writeFileSync(join(projectDir, 'docker-compose.yml'), `services:
  spacelycms:
    image: spacelycms/server:latest
    ports:
      - "\${PORT:-4321}:4321"
    environment:
      - NODE_ENV=production
      - PORT=4321
      - HOST=0.0.0.0
      - DATABASE_URL=sqlite:./data/spacely.db
      - MEDIA_DIR=./uploads
      - JWT_SECRET=\${JWT_SECRET:?Set JWT_SECRET in .env}
      - CORS_ORIGINS=\${CORS_ORIGINS:-*}
      - SITE_URL=\${SITE_URL:-http://localhost:4322}
    volumes:
      - ./data:/app/data
      - ./uploads:/app/uploads
    restart: unless-stopped
`);

  // README.md
  writeFileSync(join(projectDir, 'README.md'), `# ${siteName}

Powered by [SpacelyCMS](https://github.com/spacelycms).

## Quick Start

\`\`\`bash
npm install
npm run migrate
npm run seed
npm run dev
\`\`\`

Open \`http://localhost:${port}\` for the API.
Default login: \`admin@spacelycms.local\` / \`admin123\`

## Commands

| Command | Description |
|---|---|
| \`npm run dev\` | Start development server |
| \`npm run migrate\` | Run database migrations |
| \`npm run seed\` | Seed sample data |
| \`npm run export\` | Export all data as JSON |
| \`npm run types:generate\` | Generate TypeScript types from schemas |

## Docker

\`\`\`bash
docker compose up -d
\`\`\`

## Configuration

Edit \`.env\` to configure. See \`.env.example\` for all options.
`);

  console.log('  Created project files:');
  console.log('    package.json');
  console.log('    .env');
  console.log('    .env.example');
  console.log('    .gitignore');
  console.log('    docker-compose.yml');
  console.log('    README.md');
  console.log('');

  // Install dependencies
  console.log('  Installing dependencies...\n');
  try {
    execSync('npm install', { cwd: projectDir, stdio: 'inherit' });
  } catch {
    console.log('\n  npm install failed — run it manually after setup.');
  }

  console.log(`
  ✅ Project created!

  Next steps:
    cd ${projectName}
    npm run migrate
    npm run seed
    npm run dev

  Then open http://localhost:${port}
  Login: admin@spacelycms.local / admin123
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
