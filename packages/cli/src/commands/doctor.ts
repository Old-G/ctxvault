import { Command } from 'commander';
import { existsSync, lstatSync } from 'node:fs';
import { join } from 'node:path';
import chalk from 'chalk';

function check(label: string, condition: boolean): boolean {
  const icon = condition ? chalk.green('✓') : chalk.red('✗');
  console.log(`  ${icon} ${label}`);
  return condition;
}

export const doctorCommand = new Command('doctor')
  .description('Diagnose CtxVault installation')
  .action(() => {
    const projectRoot = process.cwd();
    const ctxDir = join(projectRoot, '.ctx');
    let allOk = true;

    console.log(chalk.bold('CtxVault Doctor'));
    console.log(chalk.dim('─'.repeat(40)));
    console.log('');

    // Core structure
    console.log(chalk.bold('Core:'));
    allOk = check('.ctx/ directory exists', existsSync(ctxDir)) && allOk;
    allOk = check('config.yaml exists', existsSync(join(ctxDir, 'config.yaml'))) && allOk;
    allOk = check('vault.db exists', existsSync(join(ctxDir, 'vault.db'))) && allOk;

    const dirs = ['gotchas', 'decisions', 'solutions', 'discoveries', 'system', 'sessions'];
    for (const dir of dirs) {
      allOk = check(`${dir}/ directory`, existsSync(join(ctxDir, dir))) && allOk;
    }

    allOk = check('.ctx/.gitignore exists', existsSync(join(ctxDir, '.gitignore'))) && allOk;
    console.log('');

    // System templates
    console.log(chalk.bold('Templates:'));
    allOk =
      check('system/architecture.md', existsSync(join(ctxDir, 'system', 'architecture.md'))) &&
      allOk;
    allOk =
      check('system/conventions.md', existsSync(join(ctxDir, 'system', 'conventions.md'))) && allOk;
    console.log('');

    // Skill
    console.log(chalk.bold('Agent Skill:'));
    const skillDir = join(projectRoot, '.agents', 'skills', 'ctxvault');
    allOk = check('SKILL.md exists', existsSync(join(skillDir, 'SKILL.md'))) && allOk;
    allOk = check('scripts/ directory', existsSync(join(skillDir, 'scripts'))) && allOk;

    const scripts = ['inject.sh', 'search.sh', 'save.sh', 'read.sh', 'list.sh'];
    for (const script of scripts) {
      allOk = check(`scripts/${script}`, existsSync(join(skillDir, 'scripts', script))) && allOk;
    }

    allOk =
      check(
        'references/memory-types.md',
        existsSync(join(skillDir, 'references', 'memory-types.md')),
      ) && allOk;

    // Symlink
    const symlinkPath = join(projectRoot, '.claude', 'skills', 'ctxvault');
    let symlinkOk = false;
    try {
      const stat = lstatSync(symlinkPath);
      symlinkOk = stat.isSymbolicLink();
    } catch {
      // doesn't exist
    }
    allOk = check('.claude/skills/ctxvault symlink', symlinkOk) && allOk;
    console.log('');

    // Hooks
    console.log(chalk.bold('Claude Code Hooks:'));
    const settingsPath = join(projectRoot, '.claude', 'settings.json');
    allOk = check('.claude/settings.json exists', existsSync(settingsPath)) && allOk;
    console.log('');

    // Summary
    if (allOk) {
      console.log(chalk.green.bold('All checks passed!'));
    } else {
      console.log(chalk.yellow('Some checks failed. Run `ctx init --force` to fix.'));
      process.exitCode = 1;
    }
  });
