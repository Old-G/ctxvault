import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig } from './loader.js';
import { DEFAULT_CONFIG_YAML } from './defaults.js';

describe('loadConfig', () => {
  let projectRoot: string;

  beforeEach(() => {
    projectRoot = mkdtempSync(join(tmpdir(), 'ctxvault-config-test-'));
  });

  afterEach(() => {
    rmSync(projectRoot, { recursive: true, force: true });
  });

  it('loads default config when no config file exists', () => {
    const config = loadConfig(projectRoot);
    expect(config.version).toBe(1);
    expect(config.injection.enabled).toBe(true);
    expect(config.injection.max_tokens).toBe(500);
  });

  it('loads config from config.yaml', () => {
    const ctxDir = join(projectRoot, '.ctx');
    mkdirSync(ctxDir, { recursive: true });
    writeFileSync(join(ctxDir, 'config.yaml'), DEFAULT_CONFIG_YAML, 'utf-8');

    const config = loadConfig(projectRoot);
    expect(config.version).toBe(1);
    expect(config.injection.enabled).toBe(true);
  });

  it('merges partial config with defaults', () => {
    const ctxDir = join(projectRoot, '.ctx');
    mkdirSync(ctxDir, { recursive: true });
    writeFileSync(
      join(ctxDir, 'config.yaml'),
      'version: 1\ninjection:\n  max_tokens: 300\n',
      'utf-8',
    );

    const config = loadConfig(projectRoot);
    expect(config.injection.max_tokens).toBe(300);
    expect(config.injection.enabled).toBe(true); // default
  });
});
