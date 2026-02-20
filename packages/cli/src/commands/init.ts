import { Command } from 'commander';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DEFAULT_CONFIG_YAML, ensureGitignore } from '@ctxvault/core';
import chalk from 'chalk';

export const initCommand = new Command('init')
  .description('Initialize CtxVault in the current project')
  .option('-f, --force', 'Overwrite existing configuration')
  .action((options: { force?: boolean }) => {
    const projectRoot = process.cwd();
    const ctxDir = join(projectRoot, '.ctx');
    const configPath = join(ctxDir, 'config.yaml');

    if (existsSync(configPath) && !options.force) {
      console.log(chalk.yellow('CtxVault is already initialized. Use --force to overwrite.'));
      return;
    }

    // Create .ctx directory structure
    const dirs = ['gotchas', 'decisions', 'solutions', 'discoveries', 'system'];
    mkdirSync(ctxDir, { recursive: true });
    for (const dir of dirs) {
      mkdirSync(join(ctxDir, dir), { recursive: true });
    }

    // Write default config
    writeFileSync(configPath, DEFAULT_CONFIG_YAML, 'utf-8');

    // Ensure .gitignore entries
    ensureGitignore(projectRoot);

    console.log(chalk.green('CtxVault initialized successfully!'));
    console.log(`  Config: ${chalk.dim(configPath)}`);
    console.log(`  Memory: ${chalk.dim(ctxDir)}`);
  });
