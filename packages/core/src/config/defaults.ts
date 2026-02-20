import type { Config } from './schema.js';

export const DEFAULT_CONFIG: Config = {
  version: 1,
  language: 'auto',
  injection: {
    enabled: true,
    max_tokens: 500,
    include_types: ['gotcha', 'decision', 'solution', 'discovery', 'convention'],
    exclude_tags: [],
    always_include_system: true,
  },
  contextual: {
    enabled: true,
    max_tokens: 200,
    types: ['gotcha', 'solution'],
  },
  extract: {
    enabled: true,
    mode: 'lightweight',
    min_session_messages: 5,
    provider: 'anthropic',
    model: 'claude-haiku-4-5-20251001',
    base_url: undefined,
    api_key_env: 'ANTHROPIC_API_KEY',
  },
  decay: {
    enabled: true,
    lambda: 0.01,
    archive_threshold: 0.2,
    delete_threshold: 0.05,
    delete_min_age_days: 90,
    pinned_types: ['system'],
  },
  agents: {},
  git: {
    auto_commit: true,
    commit_prefix: 'ctx:',
    sign_commits: false,
  },
};

export const DEFAULT_CONFIG_YAML = `# CtxVault Configuration v1
version: 1

injection:
  enabled: true
  max_tokens: 500
  always_include_system: true

contextual:
  enabled: true
  max_tokens: 200

extract:
  enabled: true
  mode: lightweight    # lightweight (regex) or deep (LLM)
  # provider: anthropic    # anthropic | openai-compatible
  # model: claude-haiku-4-5-20251001
  # base_url: https://api.anthropic.com  # custom endpoint (Claude Max, proxy, etc.)
  # api_key_env: ANTHROPIC_API_KEY       # env var name for API key

decay:
  enabled: true
  lambda: 0.01

git:
  auto_commit: true
  commit_prefix: "ctx:"
`;
