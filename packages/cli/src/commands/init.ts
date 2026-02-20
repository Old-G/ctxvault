import { Command } from 'commander';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_CONFIG_YAML, createDatabase, ensureGitignore } from '@ctxvault/core';
import chalk from 'chalk';
import { detectAgents } from '../agents/detector.js';
import { setupClaudeCode } from '../agents/claude-code.js';
import { generateSkill } from '../skill/generator.js';
import { ARCHITECTURE_MD, CONVENTIONS_MD, renderTemplate } from '../templates/system.js';

const CTX_GITIGNORE = `vault.db
vault.db-wal
vault.db-shm
sessions/
`;

export const initCommand = new Command('init')
  .description('Initialize CtxVault in the current project')
  .option('-f, --force', 'Overwrite existing configuration')
  .option('--no-hooks', 'Skip hook setup')
  .option('--no-skill', 'Skip skill generation')
  .option('--agent <name>', 'Setup specific agent only')
  .action((options: { force?: boolean; hooks?: boolean; skill?: boolean; agent?: string }) => {
    const projectRoot = process.cwd();
    const ctxDir = join(projectRoot, '.ctx');
    const configPath = join(ctxDir, 'config.yaml');

    if (existsSync(configPath) && !options.force) {
      console.log(chalk.yellow('CtxVault is already initialized. Use --force to overwrite.'));
      return;
    }

    // 1. Create .ctx directory structure
    const dirs = ['gotchas', 'decisions', 'solutions', 'discoveries', 'system', 'sessions'];
    mkdirSync(ctxDir, { recursive: true });
    for (const dir of dirs) {
      mkdirSync(join(ctxDir, dir), { recursive: true });
    }

    // 2. Write default config
    writeFileSync(configPath, DEFAULT_CONFIG_YAML, 'utf-8');
    console.log(chalk.green('  ✓ Config created'));

    // 3. Write .ctx/.gitignore
    writeFileSync(join(ctxDir, '.gitignore'), CTX_GITIGNORE, 'utf-8');
    console.log(chalk.green('  ✓ .ctx/.gitignore created'));

    // 4. Write system templates (if not exists)
    const archPath = join(ctxDir, 'system', 'architecture.md');
    const convPath = join(ctxDir, 'system', 'conventions.md');
    if (!existsSync(archPath)) {
      writeFileSync(archPath, renderTemplate(ARCHITECTURE_MD), 'utf-8');
    }
    if (!existsSync(convPath)) {
      writeFileSync(convPath, renderTemplate(CONVENTIONS_MD), 'utf-8');
    }
    console.log(chalk.green('  ✓ System templates created'));

    // 5. Initialize SQLite index
    const dbPath = join(ctxDir, 'vault.db');
    const { sqlite } = createDatabase(dbPath);
    sqlite.close();
    console.log(chalk.green('  ✓ SQLite index initialized'));

    // 6. Ensure root .gitignore entries
    ensureGitignore(projectRoot);
    console.log(chalk.green('  ✓ .gitignore updated'));

    // 7. Agent detection & setup
    const agents = detectAgents(projectRoot);
    const detected = agents.filter((a) => a.detected);

    if (detected.length > 0) {
      console.log(chalk.dim(`  Detected agents: ${detected.map((a) => a.name).join(', ')}`));
    }

    const claudeAgent = agents.find((a) => a.name === 'claude-code');
    const shouldSetupClaude =
      claudeAgent?.detected && (!options.agent || options.agent === 'claude-code');

    if (shouldSetupClaude && options.hooks !== false) {
      const hookActions = setupClaudeCode(projectRoot);
      for (const action of hookActions) {
        console.log(chalk.green(`  ✓ ${action}`));
      }
    }

    // 8. Generate Agent Skill
    if (options.skill !== false) {
      const skillFiles = generateSkill(projectRoot);
      console.log(chalk.green(`  ✓ Agent Skill generated (${String(skillFiles.length)} files)`));
    }

    console.log('');
    console.log(chalk.green.bold('CtxVault initialized successfully!'));
    console.log(`  Memory dir: ${chalk.dim(ctxDir)}`);
    console.log(`  Config:     ${chalk.dim(configPath)}`);
    console.log(`  Skill:      ${chalk.dim('.agents/skills/ctxvault/')}`);
    console.log('');
    console.log(chalk.dim('Next steps:'));
    console.log(chalk.dim('  1. Edit .ctx/system/architecture.md with your project info'));
    console.log(chalk.dim('  2. Edit .ctx/system/conventions.md with your conventions'));
    console.log(chalk.dim('  3. Start coding — memories will accumulate automatically'));
  });
