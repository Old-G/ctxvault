import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { ConfigSchema, type Config } from './schema.js';

export function loadConfig(projectRoot: string): Config {
  const configPath = join(projectRoot, '.ctx', 'config.yaml');

  if (!existsSync(configPath)) {
    return ConfigSchema.parse({ version: 1 });
  }

  const raw = readFileSync(configPath, 'utf-8');
  const parsed: unknown = parseYaml(raw);

  return ConfigSchema.parse(parsed);
}

export function resolveCtxDir(projectRoot: string): string {
  return join(projectRoot, '.ctx');
}
