import { Command } from 'commander';
import chalk from 'chalk';
import { detectAgents } from '../agents/detector.js';
import { setupClaudeCode } from '../agents/claude-code.js';
import { generateSkill } from '../skill/generator.js';

export const connectCommand = new Command('connect')
  .description('Auto-discover agents and set up integrations')
  .action(() => {
    const projectRoot = process.cwd();
    const agents = detectAgents(projectRoot);
    const detected = agents.filter((a) => a.detected);

    if (detected.length === 0) {
      console.log(chalk.yellow('No AI agents detected.'));
      console.log(chalk.dim('Supported: claude-code, cursor, windsurf, codex'));
      return;
    }

    console.log(chalk.bold('Detected agents:'));

    for (const agent of detected) {
      console.log(`  ${chalk.cyan(agent.name)}`);

      if (agent.name === 'claude-code') {
        const actions = setupClaudeCode(projectRoot);
        for (const action of actions) {
          console.log(chalk.green(`    ✓ ${action}`));
        }
      }
    }

    // Generate skill for all agents
    const skillFiles = generateSkill(projectRoot);
    console.log(chalk.green(`  ✓ Skill generated (${String(skillFiles.length)} files)`));
    console.log('');
    console.log(chalk.green.bold('All agents connected!'));
  });
