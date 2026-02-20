import { Command } from 'commander';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import {
  DEFAULT_CONFIG_YAML,
  createDatabase,
  ensureGitignore,
  scanProject,
  generateArchitectureMd,
  generateConventionsMd,
} from '@ctxvault/core';
import chalk from 'chalk';
import { detectAgents } from '../agents/detector.js';
import { setupClaudeCode } from '../agents/claude-code.js';
import { setupCursor } from '../agents/cursor.js';
import { generateSkill } from '../skill/generator.js';

const CTX_GITIGNORE = `vault.db
vault.db-wal
vault.db-shm
sessions/
.env
`;

function ask(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer: string) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function writeEnvFile(ctxDir: string, apiKey: string, envVar: string): void {
  const envPath = join(ctxDir, '.env');
  let content = '';

  if (existsSync(envPath)) {
    content = readFileSync(envPath, 'utf-8');
    // Replace existing key if present
    const regex = new RegExp(`^${envVar}=.*$`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${envVar}=${apiKey}`);
      writeFileSync(envPath, content, 'utf-8');
      return;
    }
  }

  content += `${content && !content.endsWith('\n') ? '\n' : ''}${envVar}=${apiKey}\n`;
  writeFileSync(envPath, content, 'utf-8');
}

function patchConfigYaml(
  configPath: string,
  mode: string,
  provider?: string,
  model?: string,
): void {
  let content = readFileSync(configPath, 'utf-8');

  // Replace mode line
  content = content.replace(/mode:\s*lightweight/, `mode: ${mode}`);

  // Uncomment and set provider if needed
  if (provider) {
    content = content.replace(/# provider:.*/, `provider: ${provider}`);
  }
  if (model) {
    content = content.replace(/# model:.*/, `model: ${model}`);
  }

  writeFileSync(configPath, content, 'utf-8');
}

export const initCommand = new Command('init')
  .description('Initialize CtxVault in the current project')
  .option('-f, --force', 'Overwrite existing configuration')
  .option('--no-hooks', 'Skip hook setup')
  .option('--no-skill', 'Skip skill generation')
  .option('--no-llm', 'Skip LLM setup (no API key prompt)')
  .option('--agent <name>', 'Setup specific agent only')
  .action(
    async (options: {
      force?: boolean;
      hooks?: boolean;
      skill?: boolean;
      llm?: boolean;
      agent?: string;
    }) => {
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

      // 4. Auto-analyze project and generate system templates
      const archPath = join(ctxDir, 'system', 'architecture.md');
      const convPath = join(ctxDir, 'system', 'conventions.md');

      if (!existsSync(archPath) || !existsSync(convPath)) {
        const projectInfo = scanProject(projectRoot);

        if (!existsSync(archPath)) {
          writeFileSync(archPath, generateArchitectureMd(projectInfo), 'utf-8');
        }
        if (!existsSync(convPath)) {
          writeFileSync(convPath, generateConventionsMd(projectInfo), 'utf-8');
        }
        console.log(
          chalk.green('  ✓ Project analyzed — architecture.md & conventions.md auto-generated'),
        );
      } else {
        console.log(chalk.green('  ✓ System templates preserved'));
      }

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

      // Cursor rules
      const cursorAgent = agents.find((a) => a.name === 'cursor');
      const shouldSetupCursor =
        cursorAgent?.detected && (!options.agent || options.agent === 'cursor');

      if (shouldSetupCursor) {
        const cursorActions = setupCursor(projectRoot);
        for (const action of cursorActions) {
          console.log(chalk.green(`  ✓ ${action}`));
        }
      }

      // 8. Generate Agent Skill
      if (options.skill !== false) {
        const skillFiles = generateSkill(projectRoot);
        console.log(chalk.green(`  ✓ Agent Skill generated (${String(skillFiles.length)} files)`));
      }

      // 9. LLM Setup — interactive API key prompt
      if (options.llm !== false && process.stdin.isTTY) {
        console.log('');
        console.log(chalk.cyan.bold('  🧠 Deep Extract — auto-extract memories using LLM'));
        console.log(
          chalk.dim('  Works with Anthropic API, Claude Max/Pro, or OpenAI-compatible APIs'),
        );
        console.log('');

        const setupChoice = await ask(
          `  ${chalk.white('Enable deep extract?')} ${chalk.dim('[Y/n]')}: `,
        );

        if (setupChoice.toLowerCase() !== 'n') {
          console.log('');
          console.log(chalk.dim('  Provider options:'));
          console.log(
            chalk.dim('    1) Anthropic API (default) — console.anthropic.com/settings/keys'),
          );
          console.log(chalk.dim('    2) OpenAI-compatible (OpenRouter, Together, etc.)'));
          console.log('');

          const providerChoice = await ask(
            `  ${chalk.white('Provider')} ${chalk.dim('[1/2, default: 1]')}: `,
          );
          const isOpenAI = providerChoice === '2';

          let envVar = 'ANTHROPIC_API_KEY';
          let provider = 'anthropic';
          let model: string | undefined;
          let baseUrl: string | undefined;

          if (isOpenAI) {
            provider = 'openai-compatible';
            const baseUrlInput = await ask(
              `  ${chalk.white('Base URL')} ${chalk.dim('(e.g. https://openrouter.ai/api/v1)')}: `,
            );
            if (baseUrlInput) baseUrl = baseUrlInput;

            const modelInput = await ask(
              `  ${chalk.white('Model')} ${chalk.dim('[default: claude-haiku-4-5-20251001]')}: `,
            );
            if (modelInput) model = modelInput;

            const envVarInput = await ask(
              `  ${chalk.white('API key env var')} ${chalk.dim('[default: OPENROUTER_API_KEY]')}: `,
            );
            envVar = envVarInput || 'OPENROUTER_API_KEY';
          }

          // Check if key already in environment
          const existingKey = process.env[envVar];
          let apiKey = existingKey;

          if (existingKey) {
            const masked = existingKey.slice(0, 10) + '...' + existingKey.slice(-4);
            console.log(chalk.green(`  ✓ Found ${envVar} in environment: ${masked}`));
          } else {
            console.log('');
            const keyInput = await ask(
              `  ${chalk.white(envVar)} ${chalk.dim('(paste your API key, Enter to skip)')}: `,
            );
            apiKey = keyInput || undefined;
          }

          if (apiKey) {
            writeEnvFile(ctxDir, apiKey, envVar);
            console.log(chalk.green(`  ✓ API key saved to .ctx/.env (gitignored)`));
          }

          // Update config.yaml to deep mode
          patchConfigYaml(configPath, 'deep', provider, model);

          if (isOpenAI) {
            // Also update base_url and api_key_env in config
            let content = readFileSync(configPath, 'utf-8');
            if (baseUrl) {
              content = content.replace(/# base_url:.*/, `base_url: ${baseUrl}`);
            }
            content = content.replace(/# api_key_env:.*/, `api_key_env: ${envVar}`);
            writeFileSync(configPath, content, 'utf-8');
          }

          console.log(chalk.green('  ✓ Deep extract enabled'));
        }
      }

      console.log('');
      console.log(chalk.green.bold('CtxVault initialized successfully!'));
      console.log(`  Memory dir: ${chalk.dim(ctxDir)}`);
      console.log(`  Config:     ${chalk.dim(configPath)}`);
      console.log(`  Skill:      ${chalk.dim('.agents/skills/ctxvault/')}`);
      console.log('');
      console.log(chalk.dim('Start coding — your AI agent now has persistent memory.'));
    },
  );
