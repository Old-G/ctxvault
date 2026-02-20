import { Command } from 'commander';
import { join } from 'node:path';
import { loadConfig, buildSessionPayload, MemoryStore } from '@ctxvault/core';
import chalk from 'chalk';

export const injectCommand = new Command('inject')
  .description('Preview what would be injected into an agent session')
  .action(() => {
    const projectRoot = process.cwd();
    const ctxDir = join(projectRoot, '.ctx');
    const config = loadConfig(projectRoot);
    const store = new MemoryStore(ctxDir);

    const payload = buildSessionPayload(store, config);

    if (!payload.markdown) {
      console.log(chalk.dim('Nothing to inject (no memories or injection disabled).'));
      return;
    }

    console.log(chalk.bold('Injection Preview'));
    console.log(chalk.dim('─'.repeat(60)));
    console.log('');
    console.log(payload.markdown);
    console.log('');
    console.log(chalk.dim('─'.repeat(60)));
    console.log(
      `  Memories: ${chalk.bold(String(payload.memories.length))}  |  Tokens: ${chalk.bold(String(payload.tokenCount))}/${String(config.injection.max_tokens)}`,
    );
  });
