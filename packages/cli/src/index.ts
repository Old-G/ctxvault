import { Command } from 'commander';
import { VERSION } from '@ctxvault/core';
import { initCommand } from './commands/init.js';
import { addCommand } from './commands/add.js';
import { saveCommand } from './commands/save.js';
import { listCommand } from './commands/list.js';
import { searchCommand } from './commands/search.js';
import { removeCommand } from './commands/remove.js';
import { showCommand } from './commands/show.js';
import { statusCommand } from './commands/status.js';
import { syncCommand } from './commands/sync.js';
import { injectCommand } from './commands/inject.js';
import { connectCommand } from './commands/connect.js';
import { doctorCommand } from './commands/doctor.js';
import { hookCommand } from './commands/hook.js';

const program = new Command();

program
  .name('ctx')
  .description('CtxVault — Persistent memory for AI coding agents')
  .version(VERSION);

// Setup
program.addCommand(initCommand);
program.addCommand(connectCommand);
program.addCommand(doctorCommand);

// View
program.addCommand(statusCommand);
program.addCommand(searchCommand);
program.addCommand(listCommand);
program.addCommand(showCommand);
program.addCommand(injectCommand);

// Manage
program.addCommand(addCommand);
program.addCommand(saveCommand);
program.addCommand(removeCommand);

// Maintenance
program.addCommand(syncCommand);

// Hooks
program.addCommand(hookCommand);

// Version subcommand
program
  .command('version')
  .description('Show version')
  .action(() => {
    console.log(VERSION);
  });

program.parse();
