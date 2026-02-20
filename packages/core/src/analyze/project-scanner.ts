import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

interface ProjectInfo {
  name: string;
  description: string;
  language: string;
  framework: string;
  database: string;
  packageManager: string;
  testRunner: string;
  directories: { name: string; description: string }[];
  scripts: Record<string, string>;
  conventions: string[];
}

/**
 * Scans the project root and extracts architecture/conventions info automatically.
 */
export function scanProject(projectRoot: string): ProjectInfo {
  const info: ProjectInfo = {
    name: basename(projectRoot),
    description: '',
    language: '',
    framework: '',
    database: '',
    packageManager: '',
    testRunner: '',
    directories: [],
    scripts: {},
    conventions: [],
  };

  // Read package.json
  const pkgPath = join(projectRoot, 'package.json');
  let pkg: Record<string, unknown> | null = null;
  if (existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as Record<string, unknown>;
      info.name = (pkg.name as string) || info.name;
      info.description = (pkg.description as string) || '';
    } catch {
      // skip
    }
  }

  // Detect language
  info.language = detectLanguage(projectRoot);

  // Detect framework
  info.framework = detectFramework(projectRoot, pkg);

  // Detect database
  info.database = detectDatabase(pkg);

  // Detect package manager
  info.packageManager = detectPackageManager(projectRoot);

  // Detect test runner
  info.testRunner = detectTestRunner(projectRoot, pkg);

  // Scan directories
  info.directories = scanDirectories(projectRoot);

  // Extract scripts
  if (pkg?.scripts && typeof pkg.scripts === 'object') {
    const scripts = pkg.scripts as Record<string, string>;
    for (const key of ['dev', 'build', 'test', 'lint', 'start', 'typecheck', 'format']) {
      if (scripts[key]) {
        info.scripts[key] = scripts[key];
      }
    }
  }

  // Detect conventions from config files
  info.conventions = detectConventions(projectRoot);

  return info;
}

function detectLanguage(root: string): string {
  if (existsSync(join(root, 'tsconfig.json'))) return 'TypeScript';
  if (existsSync(join(root, 'jsconfig.json'))) return 'JavaScript';
  if (existsSync(join(root, 'pyproject.toml')) || existsSync(join(root, 'setup.py')))
    return 'Python';
  if (existsSync(join(root, 'go.mod'))) return 'Go';
  if (existsSync(join(root, 'Cargo.toml'))) return 'Rust';
  if (existsSync(join(root, 'Gemfile'))) return 'Ruby';
  if (existsSync(join(root, 'pom.xml')) || existsSync(join(root, 'build.gradle'))) return 'Java';
  if (existsSync(join(root, 'Package.swift'))) return 'Swift';
  return 'Unknown';
}

function detectFramework(root: string, pkg: Record<string, unknown> | null): string {
  const deps = getDeps(pkg);

  // JS/TS frameworks
  if (deps.includes('next')) return 'Next.js';
  if (deps.includes('nuxt')) return 'Nuxt';
  if (deps.includes('@remix-run/node') || deps.includes('remix')) return 'Remix';
  if (deps.includes('svelte') || deps.includes('@sveltejs/kit')) return 'SvelteKit';
  if (deps.includes('react')) return 'React';
  if (deps.includes('vue')) return 'Vue';
  if (deps.includes('angular') || deps.includes('@angular/core')) return 'Angular';
  if (deps.includes('express')) return 'Express';
  if (deps.includes('fastify')) return 'Fastify';
  if (deps.includes('hono')) return 'Hono';
  if (deps.includes('nestjs') || deps.includes('@nestjs/core')) return 'NestJS';

  // Python
  if (existsSync(join(root, 'manage.py'))) return 'Django';
  if (deps.includes('flask') || deps.includes('Flask')) return 'Flask';
  if (deps.includes('fastapi') || deps.includes('FastAPI')) return 'FastAPI';

  // Go
  if (existsSync(join(root, 'go.mod'))) {
    try {
      const goMod = readFileSync(join(root, 'go.mod'), 'utf-8');
      if (goMod.includes('gin-gonic')) return 'Gin';
      if (goMod.includes('echo')) return 'Echo';
      if (goMod.includes('fiber')) return 'Fiber';
    } catch {
      // skip
    }
  }

  return '';
}

function detectDatabase(pkg: Record<string, unknown> | null): string {
  const deps = getDeps(pkg);
  const dbs: string[] = [];

  if (deps.includes('prisma') || deps.includes('@prisma/client')) dbs.push('Prisma');
  if (deps.includes('drizzle-orm')) dbs.push('Drizzle ORM');
  if (deps.includes('typeorm')) dbs.push('TypeORM');
  if (deps.includes('sequelize')) dbs.push('Sequelize');
  if (deps.includes('mongoose') || deps.includes('mongodb')) dbs.push('MongoDB');
  if (deps.includes('pg') || deps.includes('postgres')) dbs.push('PostgreSQL');
  if (deps.includes('mysql2') || deps.includes('mysql')) dbs.push('MySQL');
  if (deps.includes('better-sqlite3') || deps.includes('sqlite3')) dbs.push('SQLite');
  if (deps.includes('redis') || deps.includes('ioredis')) dbs.push('Redis');
  if (deps.includes('supabase') || deps.includes('@supabase/supabase-js')) dbs.push('Supabase');

  return dbs.join(', ');
}

function detectPackageManager(root: string): string {
  if (existsSync(join(root, 'pnpm-lock.yaml')) || existsSync(join(root, 'pnpm-workspace.yaml')))
    return 'pnpm';
  if (existsSync(join(root, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(root, 'bun.lockb')) || existsSync(join(root, 'bun.lock'))) return 'bun';
  if (existsSync(join(root, 'package-lock.json'))) return 'npm';
  if (existsSync(join(root, 'Pipfile.lock'))) return 'pipenv';
  if (existsSync(join(root, 'poetry.lock'))) return 'poetry';
  if (existsSync(join(root, 'uv.lock'))) return 'uv';
  return '';
}

function detectTestRunner(root: string, pkg: Record<string, unknown> | null): string {
  const deps = getDeps(pkg);
  if (deps.includes('vitest')) return 'Vitest';
  if (deps.includes('jest')) return 'Jest';
  if (deps.includes('mocha')) return 'Mocha';
  if (deps.includes('@playwright/test')) return 'Playwright';
  if (deps.includes('cypress')) return 'Cypress';
  if (existsSync(join(root, 'pytest.ini')) || existsSync(join(root, 'conftest.py')))
    return 'pytest';
  return '';
}

function scanDirectories(root: string): { name: string; description: string }[] {
  const dirs: { name: string; description: string }[] = [];

  const knownDirs: Record<string, string> = {
    src: 'Source code',
    app: 'Application code (Next.js/Remix routes)',
    pages: 'Page components / routes',
    components: 'UI components',
    lib: 'Shared library code',
    utils: 'Utility functions',
    hooks: 'Custom React hooks',
    api: 'API routes / handlers',
    server: 'Server-side code',
    services: 'Service layer / business logic',
    models: 'Data models',
    types: 'TypeScript type definitions',
    tests: 'Test files',
    test: 'Test files',
    __tests__: 'Test files',
    e2e: 'End-to-end tests',
    config: 'Configuration files',
    scripts: 'Build/deploy scripts',
    public: 'Static assets',
    assets: 'Static assets',
    styles: 'Stylesheets',
    docs: 'Documentation',
    packages: 'Monorepo packages',
    prisma: 'Prisma schema and migrations',
    migrations: 'Database migrations',
    middleware: 'Middleware functions',
    store: 'State management',
    features: 'Feature modules',
    modules: 'Application modules',
    controllers: 'Route controllers',
    routes: 'Route definitions',
    views: 'View templates',
  };

  try {
    const entries = readdirSync(root, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      if (
        entry.name.startsWith('.') ||
        entry.name === 'node_modules' ||
        entry.name === 'dist' ||
        entry.name === 'build' ||
        entry.name === '.next' ||
        entry.name === '__pycache__'
      )
        continue;

      const desc = knownDirs[entry.name];
      if (desc) {
        // Check if directory has subdirs for more detail
        const subPath = join(root, entry.name);
        const subCount = countFiles(subPath);
        dirs.push({ name: `${entry.name}/`, description: `${desc} (${String(subCount)} files)` });
      }
    }
  } catch {
    // skip
  }

  return dirs;
}

function countFiles(dir: string): number {
  let count = 0;
  try {
    const entries = readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const fullPath = join(dir, entry.name);
      if (entry.isFile()) {
        count++;
      } else if (entry.isDirectory()) {
        count += countFiles(fullPath);
      }
    }
  } catch {
    // skip
  }
  return count;
}

function detectConventions(root: string): string[] {
  const conventions: string[] = [];

  if (
    existsSync(join(root, '.eslintrc.js')) ||
    existsSync(join(root, '.eslintrc.json')) ||
    existsSync(join(root, 'eslint.config.js')) ||
    existsSync(join(root, 'eslint.config.mjs'))
  )
    conventions.push('ESLint for code linting');
  if (
    existsSync(join(root, '.prettierrc')) ||
    existsSync(join(root, 'prettier.config.js')) ||
    existsSync(join(root, 'prettier.config.mjs')) ||
    existsSync(join(root, '.prettierrc.json'))
  )
    conventions.push('Prettier for code formatting');
  if (existsSync(join(root, '.editorconfig')))
    conventions.push('EditorConfig for consistent coding styles');

  // Check tsconfig for strict mode
  const tsconfig = join(root, 'tsconfig.json');
  if (existsSync(tsconfig)) {
    try {
      const content = readFileSync(tsconfig, 'utf-8');
      if (content.includes('"strict": true') || content.includes('"strict":true'))
        conventions.push('TypeScript strict mode enabled');
    } catch {
      // skip
    }
  }

  // Check for monorepo
  if (
    existsSync(join(root, 'pnpm-workspace.yaml')) ||
    existsSync(join(root, 'lerna.json')) ||
    existsSync(join(root, 'nx.json'))
  )
    conventions.push('Monorepo architecture');

  // Check package.json type
  const pkgPath = join(root, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as Record<string, unknown>;
      if (pkg.type === 'module') conventions.push('ESM modules (type: module)');
    } catch {
      // skip
    }
  }

  // Tailwind
  if (existsSync(join(root, 'tailwind.config.js')) || existsSync(join(root, 'tailwind.config.ts')))
    conventions.push('Tailwind CSS for styling');

  // Docker
  if (
    existsSync(join(root, 'Dockerfile')) ||
    existsSync(join(root, 'docker-compose.yml')) ||
    existsSync(join(root, 'docker-compose.yaml'))
  )
    conventions.push('Docker containerization');

  return conventions;
}

function getDeps(pkg: Record<string, unknown> | null): string[] {
  if (!pkg) return [];
  const d = (pkg.dependencies ?? {}) as Record<string, string>;
  const dd = (pkg.devDependencies ?? {}) as Record<string, string>;
  const deps = { ...d, ...dd };
  return Object.keys(deps);
}

/**
 * Generates architecture.md content from scanned project info.
 */
export function generateArchitectureMd(info: ProjectInfo): string {
  const now = new Date().toISOString();
  let md = `---
type: convention
tags: [architecture]
relevance: 1.0
created: ${now}
updated: ${now}
summary: "Project architecture — ${info.name}"
---

# Architecture: ${info.name}
`;

  if (info.description) {
    md += `\n${info.description}\n`;
  }

  md += `\n## Stack\n`;
  md += `- **Language:** ${info.language || 'Unknown'}\n`;
  if (info.framework) md += `- **Framework:** ${info.framework}\n`;
  if (info.database) md += `- **Database:** ${info.database}\n`;
  if (info.packageManager) md += `- **Package Manager:** ${info.packageManager}\n`;
  if (info.testRunner) md += `- **Test Runner:** ${info.testRunner}\n`;

  if (info.directories.length > 0) {
    md += `\n## Directory Structure\n`;
    for (const dir of info.directories) {
      md += `- \`${dir.name}\` — ${dir.description}\n`;
    }
  }

  if (Object.keys(info.scripts).length > 0) {
    md += `\n## Common Commands\n`;
    const pm = info.packageManager || 'npm';
    const run = pm === 'npm' ? 'npm run' : pm;
    for (const [name, script] of Object.entries(info.scripts)) {
      md += `- \`${run} ${name}\` — \`${script}\`\n`;
    }
  }

  return md;
}

/**
 * Generates conventions.md content from scanned project info.
 */
export function generateConventionsMd(info: ProjectInfo): string {
  const now = new Date().toISOString();
  let md = `---
type: convention
tags: [conventions, style]
relevance: 1.0
created: ${now}
updated: ${now}
summary: "Coding conventions — ${info.name}"
---

# Coding Conventions: ${info.name}
`;

  if (info.conventions.length > 0) {
    md += `\n## Tooling\n`;
    for (const conv of info.conventions) {
      md += `- ${conv}\n`;
    }
  }

  if (info.language === 'TypeScript') {
    md += `\n## TypeScript\n`;
    md += `- Strict mode enabled\n`;
    md += `- Prefer explicit types for function parameters and return values\n`;
  }

  if (info.testRunner) {
    md += `\n## Testing\n`;
    md += `- Test runner: ${info.testRunner}\n`;
    const pm = info.packageManager || 'npm';
    const run = pm === 'npm' ? 'npm run' : pm;
    if (info.scripts.test) {
      md += `- Run tests: \`${run} test\`\n`;
    }
  }

  return md;
}
