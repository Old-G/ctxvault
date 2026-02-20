import { Command } from 'commander';
import { VERSION } from '@ctxvault/core';
import { initCommand } from './commands/init.js';
import { addCommand } from './commands/add.js';
import { listCommand } from './commands/list.js';
import { searchCommand } from './commands/search.js';
import { removeCommand } from './commands/remove.js';
import { hookCommand } from './commands/hook.js';

const program = new Command();

program
  .name('ctx')
  .description('CtxVault — Persistent memory for AI coding agents')
  .version(VERSION);

program.addCommand(initCommand);
program.addCommand(addCommand);
program.addCommand(listCommand);
program.addCommand(searchCommand);
program.addCommand(removeCommand);
program.addCommand(hookCommand);

program.parse();
